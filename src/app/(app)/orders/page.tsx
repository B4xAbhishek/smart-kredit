import {
  HOME_PRODUCTS,
  isHomeProductEnabledForUser,
  isHomeProductId,
  type HomeProductId,
} from "@/lib/home-products";
import { ensureDefaultLoansForUser } from "@/lib/mongodb/default-loans";
import { getMongoDb } from "@/lib/mongodb/client";
import { getSession } from "@/lib/session";
import {
  getHomeProductEnabledMapForSession,
  resolveProfileUserId,
} from "@/lib/session-profile";
import { OrdersList, type OrdersLoanRow } from "./orders-list";

export const metadata = {
  title: "Loan list · Smart Kredit",
};

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

function normalizeLoanStatus(status: unknown): "settled" | "active" | "pending" {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (normalized === "settled") return "settled";
  if (normalized === "active") return "active";
  return "pending";
}

/** Same as order detail page — unpaid total shown on Repayment / payment links. */
const ORDER_INTEREST_FEE_RUPEES = 45;

/**
 * Resolves KS-7500 / SL-6500 when `default_product_key` is missing on older loan docs.
 */
function resolveHomeProductKeyForLoan(row: {
  product_name?: string;
  amount_rupees?: unknown;
  default_product_key?: string;
}): HomeProductId | null {
  const k = String(row.default_product_key ?? "");
  if (k && isHomeProductId(k)) {
    return k;
  }

  const amount = Math.round(Number(row.amount_rupees ?? 0));
  const name = String(row.product_name ?? "").trim();

  for (const p of Object.values(HOME_PRODUCTS)) {
    if (p.productName === name && p.loanAmountRupees === amount) {
      return p.id;
    }
  }
  for (const p of Object.values(HOME_PRODUCTS)) {
    if (p.loanAmountRupees === amount) {
      return p.id;
    }
  }
  return null;
}

export default async function OrdersPage() {
  let loans: OrdersLoanRow[] = [];

  const session = await getSession();
  const profileId = await resolveProfileUserId(session);
  const homeProductEnabled = await getHomeProductEnabledMapForSession(session);

  if (profileId) {
    try {
      await ensureDefaultLoansForUser(profileId);
      const db = await getMongoDb();
      const docs = await db
        .collection("loans")
        .find({ userId: profileId })
        .sort({ created_at: -1 })
        .toArray();

      type Row = OrdersLoanRow & { createdMs: number };
      const mapped: Row[] = docs.map((doc) => {
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
          status === "settled"
            ? "Settled"
            : status === "active"
              ? "Waiting for repayment"
              : "Pending";
        const amountRupees = Number(row.amount_rupees ?? 0);
        const productKey = resolveHomeProductKeyForLoan(row);
        const payableTotal = amountRupees + ORDER_INTEREST_FEE_RUPEES;

        let detailHref: string | undefined;
        if (status === "settled") {
          detailHref = undefined;
        } else if (
          productKey &&
          isHomeProductEnabledForUser(homeProductEnabled, productKey)
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

  return <OrdersList loans={loans} />;
}
