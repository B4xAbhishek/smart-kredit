import { getMongoDb } from "@/lib/mongodb/client";
import type { ProfileDoc } from "@/lib/mongodb/types";

/** Phone, email, and display name from `profiles` for account UI / session repair. */
export async function getProfileIdentifiersForUid(uid: string): Promise<{
  phone: string | null;
  email: string | null;
  displayName: string | null;
}> {
  try {
    const db = await getMongoDb();
    const doc = await db.collection<ProfileDoc>("profiles").findOne(
      { _id: uid },
      { projection: { phone_e164: 1, phone: 1, email: 1, display_name: 1 } },
    );
    if (!doc) {
      return { phone: null, email: null, displayName: null };
    }
    const phone = (doc.phone_e164 ?? doc.phone)?.trim() || null;
    const email = doc.email?.toLowerCase().trim() || null;
    const displayName = doc.display_name?.trim() || null;
    return { phone, email, displayName };
  } catch {
    return { phone: null, email: null, displayName: null };
  }
}
