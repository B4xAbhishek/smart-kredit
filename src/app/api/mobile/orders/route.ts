import { NextResponse, type NextRequest } from "next/server";

import {
  normalizeLoanStatus,
  resolveHomeProductKeyForLoan,
  shouldIncludeLoanOnOrdersList,
} from "@/lib/home-product-loan";
import { isHomeProductVisibleForUser } from "@/lib/home-products";
import { requireMobileSession } from "@/lib/mobile-api";
import type { MobileOrdersLoan } from "@/lib/mobile-types";
import { ensureDefaultLoansForUser } from "@/lib/mongodb/default-loans";
import { getMongoDb } from "@/lib/mongodb/client";
import {
  getGlobalHomeProductEnabledMap,
  getHomeProductEnabledMapForSession,
  resolveProfileUserId,
} from "@/lib/session-profile";

const ORDER_INTEREST_FEE_RUPEES = 45;

function tsToMillis(v: unknown): number {
  if (v instanceof Date) return v.getTime();
  if (
    v &&
    typeof v === "object" &&
    "toMillis" in v &&
    typeof (v as { toMillis: () => number }).toMillis === "function"
  ) {
    return (v as { toMillis: () => number }).toMillis();
  }
  return 0;
}

export async function GET(request: NextRequest) {
  const session = requireMobileSession(request);
  if (session instanceof NextResponse) {
    return session;
  }

  let loans: MobileOrdersLoan[] = [];
  const profileId = await resolveProfileUserId(session);
  const homeProductEnabled = await getHomeProductEnabledMapForSession(session);
  const globalHomeProductEnabled = await getGlobalHomeProductEnabledMap();

  if (profileId) {
    try {
      await ensureDefaultLoansForUser(profileId);
      const db = await getMongoDb();
      const docs = await db
        .collection("loans")
        .find({ userId: profileId })
        .sort({ created_at: -1 })
        .toArray();

      loans = docs
        .filter((doc) =>
          shouldIncludeLoanOnOrdersList(
            doc as {
              product_name?: string;
              amount_rupees?: unknown;
              default_product_key?: string | null;
              status?: unknown;
            },
            globalHomeProductEnabled,
            homeProductEnabled,
          ),
        )
        .map((doc) => {
          const row = doc as {
            product_name?: string;
            amount_rupees?: number;
            status?: string;
            created_at?: unknown;
            default_product_key?: string;
          };

          const statusVariant = normalizeLoanStatus(row.status);
          const amountRupees = Math.round(Number(row.amount_rupees ?? 0));
          const productKey = resolveHomeProductKeyForLoan(row);
          const paymentAmountRupees = amountRupees + ORDER_INTEREST_FEE_RUPEES;
          const canOpenCatalogDetail =
            statusVariant !== "settled" &&
            productKey &&
            isHomeProductVisibleForUser(
              globalHomeProductEnabled,
              homeProductEnabled,
              productKey,
            );
          const detailTargetId =
            statusVariant === "settled"
              ? null
              : canOpenCatalogDetail
                ? productKey
                : String(doc._id);

          return {
            id: String(doc._id),
            productName: String(row.product_name ?? ""),
            amountRupees,
            status:
              statusVariant === "settled"
                ? "Settled"
                : "Waiting for repayment",
            statusVariant,
            ...(detailTargetId ? { detailProductId: detailTargetId } : {}),
            ...(statusVariant !== "settled" ? { paymentAmountRupees } : {}),
            createdMs: tsToMillis(row.created_at),
          };
        })
        .sort((a, b) => b.createdMs - a.createdMs)
        .map(item => {
          return {
            id: item.id,
            productName: item.productName,
            amountRupees: item.amountRupees,
            status: item.status,
            statusVariant: item.statusVariant,
            ...(item.detailProductId
              ? { detailProductId: item.detailProductId }
              : {}),
            ...(item.paymentAmountRupees
              ? { paymentAmountRupees: item.paymentAmountRupees }
              : {}),
          };
        });
    } catch {
      loans = [];
    }
  }

  return NextResponse.json({ loans });
}
