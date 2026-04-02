/**
 * Edge-compatible session verification (Middleware runs on Edge — no Node `crypto`).
 * Must match Node HMAC in `session.ts` (same secret, UTF-8 key + message, base64url digest).
 */

import type { SessionPayload } from "@/lib/session-types";

const SECRET = process.env.SESSION_SECRET || "dev-secret-change-in-production";

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSha256Base64Url(
  secret: string,
  message: string,
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return bytesToBase64Url(new Uint8Array(sig));
}

function base64UrlToUtf8(b64url: string): string {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const mod = b64.length % 4;
  if (mod === 2) b64 += "==";
  else if (mod === 3) b64 += "=";
  else if (mod === 1) throw new Error("invalid");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export async function verifySessionTokenEdge(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = await hmacSha256Base64Url(SECRET, data);
  if (sig !== expected) return null;
  try {
    const json = base64UrlToUtf8(data);
    const payload = JSON.parse(json) as SessionPayload;
    if (Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
