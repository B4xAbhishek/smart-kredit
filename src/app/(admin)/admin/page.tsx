import { createClient } from "@/lib/supabase/server";
import {
  AdminDashboard,
  type AdminLoanRow,
  type AdminUserRow,
} from "./admin-dashboard";

export const metadata = {
  title: "Admin · Smart Kredit",
};

export default async function AdminPage() {
  let users: AdminUserRow[] = [];

  const supabase = await createClient();
  if (supabase) {
    const { data } = await supabase
      .from("profiles")
      .select(
        `
      id,
      phone,
      phone_e164,
      display_name,
      created_at,
      loans (
        id,
        product_name,
        amount_rupees,
        status,
        external_ref,
        created_at
      )
    `,
      )
      .order("created_at", { ascending: false });

    if (data) {
      users = data.map((row) => ({
        id: row.id,
        phone: row.phone,
        phone_e164: row.phone_e164,
        display_name: row.display_name,
        created_at: row.created_at,
        loans: (row.loans ?? []) as AdminLoanRow[],
      }));
    }
  }

  return <AdminDashboard users={users} />;
}
