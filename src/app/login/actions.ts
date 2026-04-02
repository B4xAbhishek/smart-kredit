"use server";

import { sendOtpSms } from "@/lib/authkey";
import { ensureFirebaseUserForPhone } from "@/lib/firebase/ensure-phone-user";
import { isDevOtpBypassEnabled } from "@/lib/dev-otp-bypass";
import { generateOtp, storeOtp, verifyStoredOtp } from "@/lib/otp-store";
import { clearSession, createSession } from "@/lib/session";

const FIREBASE_ADMIN_CONFIG_ERROR =
  "Sign-in is not configured on the server. Add Firebase Admin env vars in your host (e.g. Vercel: FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY) and redeploy.";

function isFirebaseAdminConfigError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("Firebase Admin is not configured") ||
    msg.includes("Could not load the default credentials")
  );
}

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
    try {
      const uid = await ensureFirebaseUserForPhone(phoneE164);
      await createSession(phoneE164, uid);
      return { ok: true as const };
    } catch (e) {
      if (isFirebaseAdminConfigError(e)) {
        return { ok: false as const, error: FIREBASE_ADMIN_CONFIG_ERROR };
      }
      throw e;
    }
  }

  if (!verifyStoredOtp(phoneE164, otp)) {
    return { ok: false as const, error: "Invalid or expired OTP." };
  }

  try {
    const uid = await ensureFirebaseUserForPhone(phoneE164);
    await createSession(phoneE164, uid);
    return { ok: true as const };
  } catch (e) {
    if (isFirebaseAdminConfigError(e)) {
      return { ok: false as const, error: FIREBASE_ADMIN_CONFIG_ERROR };
    }
    throw e;
  }
}

export async function logoutAction() {
  await clearSession();
}
