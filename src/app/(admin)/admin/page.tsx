import { isAdminForSession } from "@/lib/admin-auth";
import { getSession } from "@/lib/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { redirect } from "next/navigation";
import {
  AdminDashboard,
  type AdminLoanRow,
  type AdminUserRow,
} from "./admin-dashboard";

export const metadata = {
  title: "Admin · Smart Kredit",
};

export default async function AdminPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/admin");
  }

  if (!(await isAdminForSession(session))) {
    redirect("/home");
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-zinc-100">
        <p className="text-sm text-zinc-600">
          Add{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">
            SUPABASE_SERVICE_ROLE_KEY
          </code>{" "}
          to your server env so the admin console can read profiles (RLS blocks the
          public key).
        </p>
      </div>
    );
  }

  let users: AdminUserRow[] = [];

  const { data } = await supabase
    .from("profiles")
    .select(
      `
      id,
      phone,
      phone_e164,
      email,
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
      email: (row as { email?: string | null }).email ?? null,
      display_name: row.display_name,
      created_at: row.created_at,
      loans: (row.loans ?? []) as AdminLoanRow[],
    }));
  }

  return <AdminDashboard users={users} />;
}
