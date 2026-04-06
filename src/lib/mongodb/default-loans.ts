import { HOME_PRODUCTS } from "@/lib/home-products";
import { getMongoDb } from "@/lib/mongodb/client";

/**
 * Ensures each user has the two standard product loans (Kredit Smart, Smart Loan).
 * Idempotent: uses `default_product_key` so we never duplicate per user.
 */
export async function ensureDefaultLoansForUser(userId: string): Promise<void> {
  const db = await getMongoDb();
  const now = new Date();

  for (const p of Object.values(HOME_PRODUCTS)) {
    const exists = await db.collection("loans").findOne({
      userId,
      default_product_key: p.id,
    });
    if (exists) continue;

    await db.collection("loans").insertOne({
      userId,
      product_name: p.productName,
      amount_rupees: p.loanAmountRupees,
      status: "active",
      external_ref: null,
      default_product_key: p.id,
      created_at: now,
    });
  }
}
