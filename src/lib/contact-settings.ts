import { DEFAULT_CONTACT_EMAIL } from "@/lib/contact";
import { getMongoDb } from "@/lib/mongodb/client";
import type { AppSettingContactDoc } from "@/lib/mongodb/types";

const CONTACT_SETTING_ID = "contact_us";

export type ContactSettings = {
  contactEmail: string;
  contactPhone: string | null;
};

function normalizeEmail(email: string | null | undefined): string {
  const trimmed = email?.trim().toLowerCase() ?? "";
  return trimmed || DEFAULT_CONTACT_EMAIL;
}

function normalizePhone(phone: string | null | undefined): string | null {
  const trimmed = phone?.trim() ?? "";
  return trimmed || null;
}

export async function getContactSettings(): Promise<ContactSettings> {
  try {
    const db = await getMongoDb();
    const doc = await db
      .collection<AppSettingContactDoc>("app_settings")
      .findOne({ _id: CONTACT_SETTING_ID });
    return {
      contactEmail: normalizeEmail(doc?.email),
      contactPhone: normalizePhone(doc?.phone),
    };
  } catch {
    return {
      contactEmail: DEFAULT_CONTACT_EMAIL,
      contactPhone: null,
    };
  }
}

export async function createContactSettings(input: {
  contactEmail: string;
  contactPhone?: string | null;
}) {
  const db = await getMongoDb();
  const existing = await db
    .collection<AppSettingContactDoc>("app_settings")
    .findOne({ _id: CONTACT_SETTING_ID });
  if (existing) {
    return { error: "Contact settings already exist. Use update instead." };
  }
  await db.collection<AppSettingContactDoc>("app_settings").insertOne({
    _id: CONTACT_SETTING_ID,
    email: normalizeEmail(input.contactEmail),
    phone: normalizePhone(input.contactPhone),
    updated_at: new Date(),
  });
  return { ok: true as const };
}

export async function updateContactSettings(input: {
  contactEmail: string;
  contactPhone?: string | null;
}) {
  const db = await getMongoDb();
  await db.collection<AppSettingContactDoc>("app_settings").updateOne(
    { _id: CONTACT_SETTING_ID },
    {
      $set: {
        email: normalizeEmail(input.contactEmail),
        phone: normalizePhone(input.contactPhone),
        updated_at: new Date(),
      },
    },
    { upsert: true },
  );
  return { ok: true as const };
}

export async function deleteContactSettings() {
  const db = await getMongoDb();
  await db
    .collection<AppSettingContactDoc>("app_settings")
    .deleteOne({ _id: CONTACT_SETTING_ID });
  return { ok: true as const };
}
