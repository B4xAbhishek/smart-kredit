/** Dev-only: accept any OTP and use a cookie session (no real SMS). Never enable in production. */

export const DEV_OTP_SESSION_COOKIE = "sk-dev-otp-session";

export function isDevOtpBypassEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEV_OTP_BYPASS === "true";
}

export function serializeDevSession(phoneE164: string): string {
  return encodeURIComponent(JSON.stringify({ phone: phoneE164 }));
}

export function parseDevSession(
  raw: string | undefined,
): { phone: string } | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(decodeURIComponent(raw)) as { phone?: unknown };
    if (typeof o.phone === "string" && o.phone.startsWith("+")) {
      return { phone: o.phone };
    }
  } catch {
    /* ignore */
  }
  return null;
}
