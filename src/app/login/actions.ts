"use server";

import { sendOtpSms } from "@/lib/authkey";
import { ensureFirebaseUserForPhone } from "@/lib/firebase/ensure-phone-user";
import { isDevOtpBypassEnabled } from "@/lib/dev-otp-bypass";
import { generateOtp, storeOtp, verifyStoredOtp } from "@/lib/otp-store";
import { clearSession, createSession } from "@/lib/session";

export async function sendOtpAction(phoneE164: string) {
  if (phoneE164.length < 13) {
    return { ok: false as const, error: "Invalid phone number." };
  }

  const otp = generateOtp();
  storeOtp(phoneE164, otp);

  if (isDevOtpBypassEnabled()) {
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
    const uid = await ensureFirebaseUserForPhone(phoneE164);
    await createSession(phoneE164, uid);
    return { ok: true as const };
  }

  if (!verifyStoredOtp(phoneE164, otp)) {
    return { ok: false as const, error: "Invalid or expired OTP." };
  }

  const uid = await ensureFirebaseUserForPhone(phoneE164);
  await createSession(phoneE164, uid);
  return { ok: true as const };
}

export async function logoutAction() {
  await clearSession();
}
