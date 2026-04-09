import { getMongoDb } from "@/lib/mongodb/client";
import type { ProfileDoc } from "@/lib/mongodb/types";

/** Returns existing profile `_id` by phone when present (loose Indian formats). */
export async function findProfileUidByPhone(
  phoneE164: string,
): Promise<string | null> {
  const phoneDigits = phoneE164.replace(/\D/g, "");
  const national10 = phoneDigits.slice(-10);
  const looseIndianPattern =
    national10.length === 10
      ? new RegExp(`^(?:\\+?91)?\\D*${national10.split("").join("\\D*")}\\D*$`)
      : null;
  const db = await getMongoDb();
  const doc = await db.collection<ProfileDoc>("profiles").findOne(
    {
      $or: [
        { phone_e164: phoneE164 },
        { phone: phoneE164 },
        ...(looseIndianPattern
          ? [
              { phone_e164: { $regex: looseIndianPattern } },
              { phone: { $regex: looseIndianPattern } },
            ]
          : []),
      ],
    },
    { projection: { _id: 1 } },
  );
  return doc?._id != null ? String(doc._id) : null;
}
