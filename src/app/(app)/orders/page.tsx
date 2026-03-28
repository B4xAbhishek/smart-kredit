import { createClient } from "@/lib/supabase/server";
import { OrdersList, type OrdersLoanRow } from "./orders-list";

export const metadata = {
  title: "Loan list · Smart Kredit",
};

function formatAmount(n: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function OrdersPage() {
  let loans: OrdersLoanRow[] = [];

  const supabase = await createClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("loans")
        .select("id, product_name, amount_rupees, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        loans = data.map((row) => {
          const status = row.status as string;
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
            id: row.id,
            productName: row.product_name,
            amount: formatAmount(Number(row.amount_rupees)),
            status: label,
            statusVariant,
          };
        });
      }
    }
  }

  return <OrdersList loans={loans} />;
}
