import { getMongoDb } from "@/lib/mongodb/client";
import type { ProfileDoc } from "@/lib/mongodb/types";

export async function syncGoogleProfileToMongo(
  uid: string,
  email: string,
  displayName: string | null,
) {
  const db = await getMongoDb();
  const now = new Date();
  await db.collection<ProfileDoc>("profiles").updateOne(
    { _id: uid },
    {
      $set: {
        email: email.toLowerCase(),
        display_name: displayName ?? null,
        updated_at: now,
      },
      $setOnInsert: { created_at: now },
    },
    { upsert: true },
  );
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
}
