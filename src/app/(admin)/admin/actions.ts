"use server";

import { ObjectId } from "mongodb";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { isAdminForSession } from "@/lib/admin-auth";
import { getMongoDb } from "@/lib/mongodb/client";
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
    const result = await db.collection("loans").deleteOne({ _id: oid });
    if (result.deletedCount === 0) {
      return { error: "Loan not found." };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete loan.";
    return { error: msg };
  }
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function createUser(input: {
  phone?: string;
  email?: string;
  displayName?: string;
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

  revalidatePath("/admin");
  return { ok: true as const, userId: uid };
}

export async function updateProfile(input: {
  userId: string;
  displayName: string | null;
}) {
  const { db, error: authError } = await requireAdminDb();
  if (!db) return { error: authError ?? "Database not available." };

  try {
    const result = await db.collection<ProfileDoc>("profiles").updateOne(
      { _id: input.userId },
      {
        $set: {
          display_name: input.displayName?.trim() || null,
          updated_at: new Date(),
        },
      },
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
