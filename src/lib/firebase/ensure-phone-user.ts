import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { upsertPhoneProfile } from "@/lib/mongodb/profile";

/**
 * Ensures a Firebase Auth user exists for this phone and returns their UID.
 * Mirrors previous Supabase `ensureAuthUserForPhone` behavior using Firebase only.
 */
export async function ensureFirebaseUserForPhone(
  phoneE164: string,
): Promise<string> {
  const auth = getFirebaseAdminAuth();

  try {
    const existing = await auth.getUserByPhoneNumber(phoneE164);
    await upsertPhoneProfile(existing.uid, phoneE164);
    return existing.uid;
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code !== "auth/user-not-found") {
      console.error("[ensureFirebaseUserForPhone]", e);
      throw e;
    }
  }

  const created = await auth.createUser({
    phoneNumber: phoneE164,
  });
  await upsertPhoneProfile(created.uid, phoneE164);
  return created.uid;
}
