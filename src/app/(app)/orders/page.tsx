import { isHomeProductEnabledForUser, isHomeProductId } from "@/lib/home-products";
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
        const key = row.default_product_key;
        const detailHref =
          status !== "settled" &&
          key &&
          isHomeProductId(key) &&
          isHomeProductEnabledForUser(homeProductEnabled, key)
            ? `/order/${key}`
            : undefined;

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
