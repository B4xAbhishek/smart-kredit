"use server";

import { sendOtpSms } from "@/lib/authkey";
import { isDevOtpBypassEnabled } from "@/lib/dev-otp-bypass";
import { generateOtp, storeOtp, verifyStoredOtp } from "@/lib/otp-store";
import { createSession, clearSession } from "@/lib/session";
import { ensureAuthUserForPhone } from "@/lib/supabase/ensure-auth-user";

export async function sendOtpAction(phoneE164: string) {
  if (phoneE164.length < 13) {
    return { ok: false as const, error: "Invalid phone number." };
  }

  const otp = generateOtp();
  storeOtp(phoneE164, otp);

  if (isDevOtpBypassEnabled()) {
    // Local dev: no SMS; OTP is accepted in verify without matching the store.
    console.info(`[dev OTP bypass] ${phoneE164} — use any 6 digits to log in`);
    return { ok: true as const };
  }

  const sent = await sendOtpSms(phoneE164, otp);
  if (!sent) {
    return { ok: false as const, error: "Failed to send OTP. Please try again." };
  }

  return { ok: true as const };
}

export async function verifyOtpAction(phoneE164: string, otp: string) {
  if (isDevOtpBypassEnabled()) {
    const digits = otp.replace(/\D/g, "");
    if (digits.length !== 6) {
      return { ok: false as const, error: "Enter any 6-digit code (dev bypass)." };
    }
    await createSession(phoneE164);
    await ensureAuthUserForPhone(phoneE164);
    return { ok: true as const };
  }

  if (!verifyStoredOtp(phoneE164, otp)) {
    return { ok: false as const, error: "Invalid or expired OTP." };
  }

  await createSession(phoneE164);
  await ensureAuthUserForPhone(phoneE164);
  return { ok: true as const };
}

export async function logoutAction() {
  await clearSession();
}
