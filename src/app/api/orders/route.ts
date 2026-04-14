import { NextResponse } from "next/server";
import { isHomeProductVisibleForUser } from "@/lib/home-products";
import {
  normalizeLoanStatus,
  resolveHomeProductKeyForLoan,
  shouldIncludeLoanOnOrdersList,
} from "@/lib/home-product-loan";
import { ensureDefaultLoansForUser } from "@/lib/mongodb/default-loans";
import { getMongoDb } from "@/lib/mongodb/client";
import { getSession } from "@/lib/session";
import {
  getGlobalHomeProductEnabledMap,
  getHomeProductEnabledMapForSession,
  resolveProfileUserId,
} from "@/lib/session-profile";

export const dynamic = "force-dynamic";

const ORDER_INTEREST_FEE_RUPEES = 45;

function formatAmount(n: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(n);
}

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

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let loans: Array<{
      id: string;
      productName: string;
      amount: string;
      status: string;
      statusVariant: "settled" | "active" | "pending";
      detailHref?: string;
    }> = [];

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

        type Row = (typeof loans)[number] & { createdMs: number };
        const mapped: Row[] = docs
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
            const status = normalizeLoanStatus(row.status);
            const statusVariant = status;
            const label =
              status === "settled" ? "Settled" : "Waiting for repayment";
            const amountRupees = Number(row.amount_rupees ?? 0);
            const productKey = resolveHomeProductKeyForLoan(row);
            const payableTotal = amountRupees + ORDER_INTEREST_FEE_RUPEES;

            let detailHref: string | undefined;
            if (status === "settled") {
              detailHref = undefined;
            } else if (
              productKey &&
              isHomeProductVisibleForUser(
                globalHomeProductEnabled,
                homeProductEnabled,
                productKey,
              )
            ) {
              detailHref = `/order/${productKey}`;
            } else if (amountRupees > 0) {
              detailHref = `/payment?payableAmountRupees=${payableTotal}`;
            } else {
              detailHref = undefined;
            }

            return {
              id: String(doc._id),
              productName: String(row.product_name ?? ""),
              amount: formatAmount(Number(row.amount_rupees)),
              status: label,
              statusVariant,
              detailHref,
              createdMs: tsToMillis(row.created_at),
            };
          });
        mapped.sort((a, b) => b.createdMs - a.createdMs);
        loans = mapped.map(({ createdMs: _c, ...rest }) => rest);
      } catch {
        loans = [];
      }
    }

    return NextResponse.json({ loans });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
