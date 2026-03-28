"use server";

import {
  DEV_OTP_SESSION_COOKIE,
  isDevOtpBypassEnabled,
  serializeDevSession,
} from "@/lib/dev-otp-bypass";
import { cookies } from "next/headers";

export async function devOtpBypassSignIn(phoneE164: string) {
  if (!isDevOtpBypassEnabled()) {
    return { ok: false as const, error: "Dev bypass disabled" };
  }
  const cookieStore = await cookies();
  cookieStore.set(DEV_OTP_SESSION_COOKIE, serializeDevSession(phoneE164), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
  return { ok: true as const };
}

export async function clearDevOtpSession() {
  const cookieStore = await cookies();
  cookieStore.delete(DEV_OTP_SESSION_COOKIE);
}
