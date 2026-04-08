import type { HomeProductId } from "@/lib/home-products";
import { getMongoDb } from "@/lib/mongodb/client";
import type { AppSettingHomeProductsDoc, ProfileDoc } from "@/lib/mongodb/types";
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
