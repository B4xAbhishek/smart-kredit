import { getMongoDb } from "@/lib/mongodb/client";
import type { ProfileDoc } from "@/lib/mongodb/types";
import type { SessionPayload } from "@/lib/session-types";

const FIXED_ADMIN_PHONE_E164 = "+919876543210";
const FIXED_ADMIN_EMAILS = new Set([
  "kreditsmart604@gmail.com",
  "b4xabhishek@gmail.com",
]);

function normalizePhone(input: string): string {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }
  return digits.length === 10 ? `+91${digits}` : `+${digits}`;
}

/**
 * Admin access: optional env phone/email/uid allowlist, or profiles.is_admin in MongoDB.
 */
export async function isAdminForPhone(phone: string): Promise<boolean> {
  return normalizePhone(phone) === FIXED_ADMIN_PHONE_E164;
}

export async function isAdminForEmail(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  if (FIXED_ADMIN_EMAILS.has(normalizedEmail)) {
    return true;
  }
  try {
    const db = await getMongoDb();
    const doc = await db.collection<ProfileDoc>("profiles").findOne({
      email: normalizedEmail,
    });
    const phone = doc?.phone_e164 ?? doc?.phone;
    if (!phone) return false;
    return normalizePhone(phone) === FIXED_ADMIN_PHONE_E164;
  } catch {
    return false;
  }
}

export async function isAdminForUserId(userId: string): Promise<boolean> {
  try {
    const db = await getMongoDb();
    const doc = await db.collection<ProfileDoc>("profiles").findOne({
      _id: userId,
    });
    const phone = doc?.phone_e164 ?? doc?.phone;
    if (!phone) return false;
    return normalizePhone(phone) === FIXED_ADMIN_PHONE_E164;
  } catch {
    return false;
  }
}

/** Unified admin check for any session type. */
export async function isAdminForSession(
  session: SessionPayload,
): Promise<boolean> {
  if (session.userId && (await isAdminForUserId(session.userId))) {
    return true;
  }
  if (session.phone && (await isAdminForPhone(session.phone))) {
    return true;
  }
  if (session.email && (await isAdminForEmail(session.email))) {
    return true;
  }
  return false;
}
