import crypto from "crypto";
import type { NextRequest } from "next/server";

import type { SessionPayload } from "@/lib/session-types";

const SECRET = process.env.SESSION_SECRET || "dev-secret-change-in-production";
const MOBILE_SESSION_PREFIX = "skm";
const MAX_AGE = 60 * 60 * 24 * 30;

type MobileSessionPayload = SessionPayload & {
  kind: "mobile";
};

function signPayload(payload: MobileSessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");
  return `${MOBILE_SESSION_PREFIX}.${data}.${sig}`;
}

export function createMobileSessionToken(
  session: Omit<SessionPayload, "iat" | "exp">,
): { token: string; expiresAt: number } {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + MAX_AGE;
  const token = signPayload({
    ...session,
    kind: "mobile",
    iat: now,
    exp: expiresAt,
  });
  return { token, expiresAt };
}

export function verifyMobileSessionToken(
  token: string | null | undefined,
): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== MOBILE_SESSION_PREFIX) {
    return null;
  }

  const [, data, sig] = parts;
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");
  if (sig !== expected) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString(),
    ) as MobileSessionPayload;

    if (payload.kind !== "mobile") return null;
    if (Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization")?.trim();
  if (!header) return null;
  const [scheme, token] = header.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export function getMobileSessionFromRequest(
  request: NextRequest,
): SessionPayload | null {
  return verifyMobileSessionToken(getBearerToken(request));
}
