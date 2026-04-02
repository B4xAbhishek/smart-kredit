import { getMongoDb } from "@/lib/mongodb/client";
import type { ProfileDoc } from "@/lib/mongodb/types";
import type { SessionPayload } from "@/lib/session-types";

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
  const envAdmin = process.env.ADMIN_EMAIL?.trim();
  if (envAdmin && envAdmin.toLowerCase() === email.toLowerCase()) {
    return true;
  }
  try {
    const db = await getMongoDb();
    const doc = await db.collection<ProfileDoc>("profiles").findOne({
      email: email.toLowerCase(),
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
  if (session.userId) {
    return isAdminForUserId(session.userId);
  }
  if (session.phone) {
    return isAdminForPhone(session.phone);
  }
  if (session.email) {
    return isAdminForEmail(session.email);
  }
  return false;
}
