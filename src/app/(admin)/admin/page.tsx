import { isAdminForSession } from "@/lib/admin-auth";
import { getMongoDb } from "@/lib/mongodb/client";
import type { ProfileDoc } from "@/lib/mongodb/types";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import {
  AdminDashboard,
  type AdminLoanRow,
  type AdminUserRow,
} from "./admin-dashboard";

export const metadata = {
  title: "Admin · Smart Kredit",
};

const ADMIN_PAGE_SIZE = 20;

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function profileFilterFromQuery(q: string): Record<string, unknown> {
  const term = q.trim();
  if (!term) return {};
  return { _id: { $regex: escapeRegex(term), $options: "i" } };
}

function tsToIso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (
    v &&
    typeof v === "object" &&
    "toDate" in v &&
    typeof (v as { toDate: () => Date }).toDate === "function"
  ) {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function aggregateLoanTotals(
  loans: { status?: string; amount_rupees?: number }[],
) {
  let avail = 0;
  let settled = 0;
  for (const l of loans) {
    const amt = Number(l.amount_rupees ?? 0);
    const st = String(l.status ?? "");
    if (st === "settled") settled += amt;
    else if (st === "active" || st === "pending") avail += amt;
  }
  return { avail, settled };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/admin");
  }

  if (!(await isAdminForSession(session))) {
    redirect("/home");
  }

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  let page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  let users: AdminUserRow[] = [];
  let totalCount = 0;
  let stats = { usersCount: 0, avail: 0, settled: 0 };

  try {
    const db = await getMongoDb();
    const profileFilter = profileFilterFromQuery(q);

    totalCount = await db.collection("profiles").countDocuments(profileFilter);

    const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_PAGE_SIZE) || 1);
    if (page > totalPages) page = totalPages;

    const matchingIds = await db
      .collection<ProfileDoc>("profiles")
      .distinct("_id", profileFilter);

    const allLoansForFilter = await db
      .collection("loans")
      .find({ userId: { $in: matchingIds } })
      .toArray();
    const { avail, settled } = aggregateLoanTotals(
      allLoansForFilter.map((d) => ({
        status: d.status as string | undefined,
        amount_rupees: Number((d as { amount_rupees?: number }).amount_rupees),
      })),
    );
    stats = {
      usersCount: totalCount,
      avail,
      settled,
    };

    const profileDocs = await db
      .collection<ProfileDoc>("profiles")
      .find(profileFilter)
      .sort({ created_at: -1 })
      .skip((page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE)
      .toArray();

    for (const row of profileDocs) {
      const uid = String(row._id);
      const loansDocs = await db
        .collection("loans")
        .find({ userId: uid })
        .sort({ created_at: -1 })
        .toArray();

      const loans: AdminLoanRow[] = loansDocs.map((ld) => {
        const l = ld as {
          product_name?: string;
          amount_rupees?: number;
          status?: string;
          external_ref?: string | null;
          created_at?: unknown;
        };
        return {
          id: String(ld._id),
          product_name: String(l.product_name ?? ""),
          amount_rupees: Number(l.amount_rupees),
          status: l.status as AdminLoanRow["status"],
          external_ref: (l.external_ref as string | null) ?? null,
          created_at: tsToIso(l.created_at),
        };
      });

      users.push({
        id: uid,
        phone: (row.phone as string | null) ?? null,
        phone_e164: (row.phone_e164 as string | null) ?? null,
        email: (row.email as string | null) ?? null,
        display_name: (row.display_name as string | null) ?? null,
        created_at: tsToIso(row.created_at),
        loans,
      });
    }
  } catch {
    return (
      <div className="rounded-2xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-zinc-100">
        <p className="text-sm text-zinc-600">
          Could not load admin data. Set{" "}
          <strong className="font-medium">MONGODB_URI</strong> in your
          environment and ensure the cluster is reachable.
        </p>
      </div>
    );
  }

  return (
    <AdminDashboard
      key={`${page}-${q}`}
      users={users}
      searchQ={q}
      page={page}
      pageSize={ADMIN_PAGE_SIZE}
      totalCount={totalCount}
      stats={stats}
    />
  );
}
