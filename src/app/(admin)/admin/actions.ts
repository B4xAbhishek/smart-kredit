"use server";

import { ObjectId } from "mongodb";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { isAdminForSession } from "@/lib/admin-auth";
import { ensureDefaultLoansForUser } from "@/lib/mongodb/default-loans";
import { getMongoDb } from "@/lib/mongodb/client";
import type { HomeProductId } from "@/lib/home-products";
import { HOME_PRODUCT_IDS } from "@/lib/home-products";
import type { ProfileDoc } from "@/lib/mongodb/types";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export type LoanStatus = "active" | "settled" | "pending";

async function requireAdminDb() {
  const session = await getSession();
  if (!session) {
    return { db: null as null, error: "Not signed in." as const };
  }
  if (!(await isAdminForSession(session))) {
    return { db: null as null, error: "Not allowed." as const };
  }
  try {
    const db = await getMongoDb();
    return { db, error: null as null };
  } catch {
    return {
      db: null as null,
      error: "MongoDB not configured." as const,
    };
  }
}

export async function createLoan(input: {
  userId: string;
  productName: string;
  amountRupees: number;
  status: LoanStatus;
  externalRef?: string | null;
}) {
  const { db, error: authError } = await requireAdminDb();
  if (!db) return { error: authError ?? "Database not available." };

  try {
    await db.collection("loans").insertOne({
      userId: input.userId,
      product_name: input.productName.trim(),
      amount_rupees: input.amountRupees,
      status: input.status,
      external_ref: input.externalRef?.trim() || null,
      created_at: new Date(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create loan.";
    return { error: msg };
  }
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function updateLoan(input: {
  id: string;
  productName: string;
  amountRupees: number;
  status: LoanStatus;
  externalRef?: string | null;
}) {
  const { db, error: authError } = await requireAdminDb();
  if (!db) return { error: authError ?? "Database not available." };

  let oid: ObjectId;
  try {
    oid = new ObjectId(input.id);
  } catch {
    return { error: "Invalid loan id." };
  }

  try {
    const result = await db.collection("loans").updateOne(
      { _id: oid },
      {
        $set: {
          product_name: input.productName.trim(),
          amount_rupees: input.amountRupees,
          status: input.status,
          external_ref: input.externalRef?.trim() || null,
        },
      },
    );
    if (result.matchedCount === 0) {
      return { error: "Loan not found." };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update loan.";
    return { error: msg };
  }
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function deleteLoan(id: string) {
  const { db, error: authError } = await requireAdminDb();
  if (!db) return { error: authError ?? "Database not available." };

  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return { error: "Invalid loan id." };
  }

  try {
    const existing = await db.collection("loans").findOne({ _id: oid });
    if (existing && (existing as { default_product_key?: string }).default_product_key) {
      return {
        error:
          "This is a standard product loan and cannot be deleted. Edit status or amount instead.",
      };
    }
    const result = await db.collection("loans").deleteOne({ _id: oid });
    if (result.deletedCount === 0) {
      return { error: "Loan not found." };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete loan.";
    return { error: msg };
  }
  revalidatePath("/admin");
  revalidatePath("/orders");
  return { ok: true as const };
}

export async function createUser(input: {
  phone?: string;
  email?: string;
  displayName?: string;
  upiId?: string;
}) {
  const { db, error: authError } = await requireAdminDb();
  if (!db) return { error: authError ?? "Database not available." };

  if (!input.phone && !input.email) {
    return { error: "Provide a phone number or email." };
  }

  const auth = getFirebaseAdminAuth();
  let uid: string;

  try {
    if (input.phone) {
      const phone = input.phone.trim().replace(/\s/g, "");
      const e164 = phone.startsWith("+")
        ? phone
        : `+91${phone.replace(/\D/g, "").slice(-10)}`;
      try {
        const u = await auth.getUserByPhoneNumber(e164);
        uid = u.uid;
      } catch (e: unknown) {
        const code =
          e && typeof e === "object" && "code" in e
            ? String((e as { code: string }).code)
            : "";
        if (code !== "auth/user-not-found") throw e;
        const created = await auth.createUser({
          phoneNumber: e164,
        });
        uid = created.uid;
      }
      const now = new Date();
      await db.collection<ProfileDoc>("profiles").updateOne(
        { _id: uid },
        {
          $set: {
            phone_e164: e164,
            phone: e164,
            display_name: input.displayName?.trim() || null,
            upi_id: input.upiId?.trim() || null,
            updated_at: now,
          },
          $setOnInsert: { created_at: now },
        },
        { upsert: true },
      );
    } else {
      const email = input.email!.trim().toLowerCase();
      try {
        const u = await auth.getUserByEmail(email);
        uid = u.uid;
      } catch (e: unknown) {
        const code =
          e && typeof e === "object" && "code" in e
            ? String((e as { code: string }).code)
            : "";
        if (code !== "auth/user-not-found") throw e;
        const created = await auth.createUser({
          email,
          emailVerified: true,
        });
        uid = created.uid;
      }
      const now = new Date();
      await db.collection<ProfileDoc>("profiles").updateOne(
        { _id: uid },
        {
          $set: {
            email,
            display_name: input.displayName?.trim() || null,
            upi_id: input.upiId?.trim() || null,
            updated_at: now,
          },
          $setOnInsert: { created_at: now },
        },
        { upsert: true },
      );
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("already")) {
      return { error: "A user with that phone/email already exists." };
    }
    return { error: msg };
  }

  try {
    await ensureDefaultLoansForUser(uid);
  } catch {
    // Profile exists even if default loans could not be written.
  }

  revalidatePath("/admin");
  return { ok: true as const, userId: uid };
}

/** Admin: ensure every profile has the two default product loans (idempotent). */
export async function syncDefaultLoansForAllUsers() {
  const { db, error: authError } = await requireAdminDb();
  if (!db) return { error: authError ?? "Database not available." };

  let userCount = 0;
  try {
    const ids = await db.collection("profiles").distinct("_id");
    for (const id of ids) {
      await ensureDefaultLoansForUser(String(id));
      userCount += 1;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed.";
    return { error: msg };
  }
  revalidatePath("/admin");
  revalidatePath("/orders");
  return { ok: true as const, userCount };
}

export async function updateProfile(input: {
  userId: string;
  displayName?: string | null;
  upiId?: string | null;
}) {
  const { db, error: authError } = await requireAdminDb();
  if (!db) return { error: authError ?? "Database not available." };

  const set: Record<string, unknown> = { updated_at: new Date() };
  if ("displayName" in input) {
    set.display_name = input.displayName?.trim() || null;
  }
  if ("upiId" in input) {
    set.upi_id = input.upiId?.trim() || null;
  }
  if (Object.keys(set).length <= 1) {
    return { error: "Nothing to update." };
  }

  try {
    const result = await db.collection<ProfileDoc>("profiles").updateOne(
      { _id: input.userId },
      { $set: set },
    );
    if (result.matchedCount === 0) {
      return { error: "Profile not found." };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update profile.";
    return { error: msg };
  }
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function updateHomeProductEnabled(input: {
  userId: string;
  productId: HomeProductId;
  enabled: boolean;
}) {
  const { db, error: authError } = await requireAdminDb();
  if (!db) return { error: authError ?? "Database not available." };

  if (!HOME_PRODUCT_IDS.includes(input.productId)) {
    return { error: "Invalid product." };
  }

  try {
    const result = await db.collection<ProfileDoc>("profiles").updateOne(
      { _id: input.userId },
      {
        $set: {
          updated_at: new Date(),
          [`home_product_enabled.${input.productId}`]: input.enabled,
        },
      },
    );
    if (result.matchedCount === 0) {
      return { error: "Profile not found." };
    }
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Failed to update product visibility.";
    return { error: msg };
  }
  revalidatePath("/admin");
  revalidatePath("/home");
  revalidatePath("/orders");
  return { ok: true as const };
}
