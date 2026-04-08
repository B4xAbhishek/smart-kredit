import { getMongoDb } from "@/lib/mongodb/client";
import type { ProfileDoc } from "@/lib/mongodb/types";
import type { SessionPayload } from "@/lib/session-types";

const FIXED_ADMIN_EMAILS = new Set([
  "b4xabhishek@gmail.com",
  "smartkreditheadoffice@gmail.com",
]);

/**
 * Admin access: optional env phone/email/uid allowlist, or profiles.is_admin in MongoDB.
 */
export async function isAdminForPhone(phone: string): Promise<boolean> {
  const envAdmin = process.env.ADMIN_PHONE_E164?.trim();
  if (envAdmin && envAdmin === phone) {
    return true;
  }
  try {
    const db = await getMongoDb();
    const doc = await db.collection<ProfileDoc>("profiles").findOne({
      $or: [{ phone_e164: phone }, { phone }],
      is_admin: true,
    });
    return Boolean(doc);
  } catch {
    return false;
  }
}

export async function isAdminForEmail(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase();
  if (FIXED_ADMIN_EMAILS.has(normalizedEmail)) {
    return true;
  }
  const envAdmin = process.env.ADMIN_EMAIL?.trim();
  if (envAdmin && envAdmin.toLowerCase() === normalizedEmail) {
    return true;
  }
  try {
    const db = await getMongoDb();
    const doc = await db.collection<ProfileDoc>("profiles").findOne({
      email: normalizedEmail,
      is_admin: true,
    });
    return Boolean(doc);
  } catch {
    return false;
  }
}

export async function isAdminForUserId(userId: string): Promise<boolean> {
  const envUid = process.env.ADMIN_FIREBASE_UID?.trim();
  if (envUid && envUid === userId) {
    return true;
  }
  try {
    const db = await getMongoDb();
    const doc = await db.collection<ProfileDoc>("profiles").findOne({
      _id: userId,
      is_admin: true,
    });
    return Boolean(doc);
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
