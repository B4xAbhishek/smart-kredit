import type { HomeProductId } from "@/lib/home-products";
import { getMongoDb } from "@/lib/mongodb/client";
import { findProfileUidByPhone } from "@/lib/mongodb/profile-phone-lookup";
import type {
  AppSettingHomeProductsDoc,
  AppSettingPaymentUpiDoc,
  HomeProductEnabledMap,
  ProfileDoc,
} from "@/lib/mongodb/types";
import type { SessionPayload } from "@/lib/session-types";

/**
 * Resolves Mongo profile `_id` for DB queries from the cookie session.
 *
 * When `session.phone` is present, we resolve via {@link findProfileUidByPhone}
 * first so the app always uses the **canonical profile row** for that number
 * (same id admin uses for `loans.userId`). Previously we returned
 * `session.userId` first; if that ever diverged from the phone’s profile id,
 * loans (including settled rows on Orders → Completed) would not load.
 */
export async function resolveProfileUserId(
  session: SessionPayload | null,
): Promise<string | null> {
  if (!session) return null;

  const phone = session.phone?.trim();
  if (phone) {
    try {
      const uid = await findProfileUidByPhone(phone);
      if (uid) return uid;
    } catch {
      // fall through to userId / email
    }
  }

  if (session.userId) return session.userId;

  if (phone) {
    try {
      const db = await getMongoDb();
      const doc = await db.collection<ProfileDoc>("profiles").findOne({
        phone_e164: phone,
      });
      if (doc && doc._id != null) return String(doc._id);
    } catch {
      return null;
    }
  }

  if (session.email) {
    try {
      const db = await getMongoDb();
      const doc = await db.collection<ProfileDoc>("profiles").findOne({
        email: session.email.toLowerCase().trim(),
      });
      if (doc && doc._id != null) return String(doc._id);
    } catch {
      return null;
    }
  }

  return null;
}

/** Admin-controlled visibility for Home “More recommendations” (omit/`true` = shown). */
export async function getHomeProductEnabledMapForSession(
  session: SessionPayload | null,
): Promise<Partial<Record<HomeProductId, boolean>> | null> {
  const uid = await resolveProfileUserId(session);
  if (!uid) return null;
  try {
    const db = await getMongoDb();
    const doc = await db.collection<ProfileDoc>("profiles").findOne({ _id: uid });
    return doc?.home_product_enabled ?? null;
  } catch {
    return null;
  }
}

/**
 * Interprets `app_settings.home_products`: legacy `globally_enabled === false`
 * forces both products off; otherwise uses `global_product_enabled` (omit/`true` = shown).
 */
export function resolveGlobalHomeProductEnabledMapFromDoc(
  doc: Pick<
    AppSettingHomeProductsDoc,
    "globally_enabled" | "global_product_enabled"
  > | null,
): HomeProductEnabledMap | null {
  if (doc?.globally_enabled === false) {
    return { "KS-7500": false, "SL-6500": false };
  }
  return doc?.global_product_enabled ?? null;
}

/** Per-product global visibility for Home “More recommendations” (default: all shown). */
export async function getGlobalHomeProductEnabledMap(): Promise<HomeProductEnabledMap | null> {
  try {
    const db = await getMongoDb();
    const doc = await db
      .collection<AppSettingHomeProductsDoc>("app_settings")
      .findOne({ _id: "home_products" });
    return resolveGlobalHomeProductEnabledMapFromDoc(doc);
  } catch {
    return null;
  }
}

/** Global merchant UPI from `app_settings.payment_upi` (admin). */
export async function getPaymentReceiveUpi(): Promise<string | null> {
  try {
    const db = await getMongoDb();
    const doc = await db
      .collection<AppSettingPaymentUpiDoc>("app_settings")
      .findOne({ _id: "payment_upi" });
    const legacyV = (doc as { upiId?: string | null } | null)?.upiId;
    const v = (doc?.upi_id ?? legacyV)?.trim();
    return v || null;
  } catch (error) {
    // Keep UI resilient but surface operational issues in server logs.
    console.error("[payment-upi] failed to load repayment UPI", error);
    return null;
  }
}

async function fetchProfileUpiById(uid: string): Promise<string | null> {
  try {
    const db = await getMongoDb();
    const doc = await db.collection<ProfileDoc>("profiles").findOne(
      { _id: uid },
      { projection: { upi_id: 1 } },
    );
    return doc?.upi_id?.trim() || null;
  } catch (error) {
    console.error("[payment-upi] failed to load profile UPI", error);
    return null;
  }
}

/**
 * UPI for manual repayment: per-user `profiles.upi_id`, then global
 * {@link getPaymentReceiveUpi}. Resolves by **phone first** (same row the admin
 * table shows), then session UID, then email — so the value is not missed when
 * the cookie UID and canonical phone profile differ.
 */
export async function getRepaymentUpiForSession(
  session: SessionPayload | null,
): Promise<string | null> {
  if (!session) return getPaymentReceiveUpi();

  if (session.phone) {
    const phoneUid = await findProfileUidByPhone(session.phone);
    if (phoneUid) {
      const v = await fetchProfileUpiById(phoneUid);
      if (v) return v;
    }
  }

  const uid = await resolveProfileUserId(session);
  if (uid) {
    const v = await fetchProfileUpiById(uid);
    if (v) return v;
  }

  if (session.email) {
    try {
      const db = await getMongoDb();
      const doc = await db.collection<ProfileDoc>("profiles").findOne(
        { email: session.email.toLowerCase().trim() },
        { projection: { upi_id: 1 } },
      );
      const v = doc?.upi_id?.trim();
      if (v) return v;
    } catch (error) {
      console.error("[payment-upi] failed to load profile UPI by email", error);
    }
  }

  return getPaymentReceiveUpi();
}
