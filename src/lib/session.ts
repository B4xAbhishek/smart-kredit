/** Cookie-based session management using HMAC-signed tokens. */

import crypto from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "sk-session";
const SECRET = process.env.SESSION_SECRET || "dev-secret-change-in-production";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  /** E.164 phone for OTP users */
  phone?: string;
  /** Email for Google OAuth users */
  email?: string;
  /** Supabase auth user ID (set for OAuth users) */
  userId?: string;
  iat: number;
  exp: number;
}

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

/** Create a session cookie after successful OTP verification. */
export async function createSession(phone: string) {
  const now = Math.floor(Date.now() / 1000);
  const token = sign({ phone, iat: now, exp: now + MAX_AGE });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/** Create a session cookie for Google OAuth users. */
export async function createEmailSession(email: string, userId: string) {
  const now = Math.floor(Date.now() / 1000);
  const token = sign({ email, userId, iat: now, exp: now + MAX_AGE });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
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

/** Verify session from a raw cookie value (for middleware). */
export function verifySessionToken(
  token: string | undefined,
): SessionPayload | null {
  if (!token) return null;
  return verify(token);
}
