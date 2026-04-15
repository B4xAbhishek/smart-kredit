/** Cookie-based session management using HMAC-signed tokens. */

import crypto from "crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session-constants";
import type { SessionPayload } from "@/lib/session-types";

export type { SessionPayload } from "@/lib/session-types";
export { SESSION_COOKIE } from "@/lib/session-constants";

const SECRET = process.env.SESSION_SECRET || "dev-secret-change-in-production";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const IS_PROD = process.env.NODE_ENV === "production";
// SameSite=None;Secure is required for cookies to be sent inside React Native
// WebViews (which treat all navigation as cross-site). In dev we fall back to
// Lax so local HTTP testing still works.
const COOKIE_SAME_SITE = IS_PROD ? "none" : "lax";

function sign(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

function verify(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString(),
    ) as SessionPayload;
    if (Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/** OTP login: stores phone + Firebase Auth UID. */
export async function createSession(
  phone: string,
  firebaseUid: string,
  opts?: { repeatCustomer?: boolean },
) {
  const now = Math.floor(Date.now() / 1000);
  const token = sign({
    phone,
    userId: firebaseUid,
    ...(opts?.repeatCustomer ? { repeat_customer: true } : {}),
    iat: now,
    exp: now + MAX_AGE,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: COOKIE_SAME_SITE,
    path: "/",
    maxAge: MAX_AGE,
  });
}

/** Google sign-in: email + Firebase Auth UID. */
export async function createEmailSession(
  email: string,
  firebaseUid: string,
  opts?: { repeatCustomer?: boolean },
) {
  const now = Math.floor(Date.now() / 1000);
  const token = sign({
    email,
    userId: firebaseUid,
    ...(opts?.repeatCustomer ? { repeat_customer: true } : {}),
    iat: now,
    exp: now + MAX_AGE,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: COOKIE_SAME_SITE,
    path: "/",
    maxAge: MAX_AGE,
  });
}

/** Get current session from cookies (for server components / actions). */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verify(token);
}

/** Clear the session cookie. */
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Updates `repeat_customer` in the session cookie (e.g. after first `/home` visit). */
export async function refreshSessionRepeatCustomer(repeat: boolean) {
  const current = await getSession();
  if (!current?.userId) return;
  const now = Math.floor(Date.now() / 1000);
  const token = sign({
    phone: current.phone,
    email: current.email,
    userId: current.userId,
    ...(repeat ? { repeat_customer: true } : {}),
    iat: current.iat,
    exp: current.exp,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: COOKIE_SAME_SITE,
    path: "/",
    maxAge: MAX_AGE,
  });
}
