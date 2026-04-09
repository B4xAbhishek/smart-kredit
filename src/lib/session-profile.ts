import type { HomeProductId } from "@/lib/home-products";
import { getMongoDb } from "@/lib/mongodb/client";
import { findProfileUidByPhone } from "@/lib/mongodb/profile-phone-lookup";
import type {
  AppSettingHomeProductsDoc,
  AppSettingPaymentUpiDoc,
  ProfileDoc,
} from "@/lib/mongodb/types";
import type { SessionPayload } from "@/lib/session-types";

/** Resolves Firebase UID for DB queries from cookie session. */
export async function resolveProfileUserId(
  session: SessionPayload | null,
): Promise<string | null> {
  if (!session) return null;
  if (session.userId) return session.userId;
  if (session.phone) {
    try {
      const db = await getMongoDb();
      const doc = await db.collection<ProfileDoc>("profiles").findOne({
        phone_e164: session.phone,
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

/** Global master switch for home products (default: true). */
export async function areHomeProductsGloballyEnabled(): Promise<boolean> {
  try {
    const db = await getMongoDb();
    const doc = await db
      .collection<AppSettingHomeProductsDoc>("app_settings")
      .findOne({ _id: "home_products" });
    return doc?.globally_enabled !== false;
  } catch {
    return true;
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
