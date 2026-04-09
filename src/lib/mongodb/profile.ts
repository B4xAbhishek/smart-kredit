import { ensureDefaultLoansForUser } from "@/lib/mongodb/default-loans";
import { getMongoDb } from "@/lib/mongodb/client";
import type { ProfileDoc } from "@/lib/mongodb/types";
import type { SessionPayload } from "@/lib/session-types";
import { refreshSessionRepeatCustomer } from "@/lib/session";
import { resolveProfileUserId } from "@/lib/session-profile";

export async function syncGoogleProfileToMongo(
  uid: string,
  email: string,
  displayName: string | null,
  phoneE164: string | null = null,
) {
  const db = await getMongoDb();
  const now = new Date();
  await db.collection<ProfileDoc>("profiles").updateOne(
    { _id: uid },
    {
      $set: {
        email: email.toLowerCase(),
        display_name: displayName ?? null,
        phone_e164: phoneE164,
        phone: phoneE164,
        updated_at: now,
      },
      $setOnInsert: { created_at: now },
    },
    { upsert: true },
  );
  await ensureDefaultLoansForUser(uid);
}

export async function upsertPhoneProfile(uid: string, phoneE164: string) {
  const db = await getMongoDb();
  const now = new Date();
  await db.collection<ProfileDoc>("profiles").updateOne(
    { _id: uid },
    {
      $set: {
        phone_e164: phoneE164,
        phone: phoneE164,
        updated_at: now,
      },
      $setOnInsert: { created_at: now },
    },
    { upsert: true },
  );
  await ensureDefaultLoansForUser(uid);
}

export { findProfileUidByPhone } from "@/lib/mongodb/profile-phone-lookup";

/**
 * True if another profile (different Firebase UID) already has this phone.
 * Used to block Google sign-in from claiming a number tied to another account.
 */
export async function findOtherProfileWithPhone(
  phoneE164: string,
  excludeUid: string,
): Promise<string | null> {
  const db = await getMongoDb();
  const doc = await db.collection<ProfileDoc>("profiles").findOne(
    {
      _id: { $ne: excludeUid },
      $or: [{ phone_e164: phoneE164 }, { phone: phoneE164 }],
    },
    { projection: { _id: 1 } },
  );
  return doc?._id ?? null;
}

/**
 * After phone OTP sign-in, clear this number from any other profile rows so
 * Mongo stays one-phone-one-user even if someone previously used Google + same digits.
 */
export async function releasePhoneFromOtherProfiles(
  phoneE164: string,
  canonicalUid: string,
): Promise<void> {
  const db = await getMongoDb();
  const now = new Date();
  await db.collection<ProfileDoc>("profiles").updateMany(
    {
      _id: { $ne: canonicalUid },
      $or: [{ phone_e164: phoneE164 }, { phone: phoneE164 }],
    },
    {
      $unset: { phone_e164: "", phone: "" },
      $set: { updated_at: now },
    },
  );
}

export async function getProfileSeenHome(uid: string): Promise<boolean> {
  const db = await getMongoDb();
  const doc = await db.collection<ProfileDoc>("profiles").findOne(
    { _id: uid },
    { projection: { seen_home: 1 } },
  );
  return doc?.seen_home === true;
}

/** Where to send the user after sign-in. */
export async function getPostLoginRedirectPath(
  uid: string,
): Promise<"/home" | "/orders"> {
  const seen = await getProfileSeenHome(uid);
  return seen ? "/orders" : "/home";
}

/**
 * First-time users land on Home; after they open Home once, later logins go to Orders.
 */
export async function markHomeVisitedForSession(
  session: SessionPayload | null,
): Promise<void> {
  const uid = await resolveProfileUserId(session);
  if (!uid) return;
  const db = await getMongoDb();
  const now = new Date();
  const result = await db.collection<ProfileDoc>("profiles").updateOne(
    { _id: uid, seen_home: { $ne: true } },
    { $set: { seen_home: true, updated_at: now } },
  );
  if (result.modifiedCount > 0) {
    await refreshSessionRepeatCustomer(true);
  }
}
