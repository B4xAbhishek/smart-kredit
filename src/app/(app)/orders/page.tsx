import { getMongoDb } from "@/lib/mongodb/client";
import { getSession } from "@/lib/session";
import { resolveProfileUserId } from "@/lib/session-profile";
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

export default async function OrdersPage() {
  let loans: OrdersLoanRow[] = [];

  const session = await getSession();
  const profileId = await resolveProfileUserId(session);

  if (profileId) {
    try {
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
        };
        const status = String(row.status ?? "");
        const statusVariant =
          status === "settled"
            ? ("settled" as const)
            : status === "active"
              ? ("active" as const)
              : ("pending" as const);
        const label =
          status === "settled"
            ? "Settled"
            : status === "active"
              ? "Active"
              : "Pending";
        return {
          id: String(doc._id),
          productName: String(row.product_name ?? ""),
          amount: formatAmount(Number(row.amount_rupees)),
          status: label,
          statusVariant,
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
