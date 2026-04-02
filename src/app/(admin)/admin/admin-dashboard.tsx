"use client";

import {
  createLoan,
  createUser,
  deleteLoan,
  type LoanStatus,
  updateLoan,
  updateProfile,
} from "./actions";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  Mail,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Search,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

export type AdminLoanRow = {
  id: string;
  product_name: string;
  amount_rupees: number;
  status: LoanStatus;
  external_ref: string | null;
  created_at: string;
};

export type AdminUserRow = {
  id: string;
  phone: string | null;
  phone_e164: string | null;
  email: string | null;
  display_name: string | null;
  created_at: string;
  loans: AdminLoanRow[] | null;
};

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(n);
}

function formatUserIdentifier(p: AdminUserRow) {
  return p.phone_e164 ?? p.phone ?? p.email ?? "—";
}

/** true if this is a Google / email-only user */
function isEmailUser(p: AdminUserRow) {
  return !p.phone && !p.phone_e164 && Boolean(p.email);
}

function loanStats(loans: AdminLoanRow[] | null) {
  const list = loans ?? [];
  let active = 0;
  let settled = 0;
  let activeSum = 0;
  let settledSum = 0;
  for (const l of list) {
    if (l.status === "settled") {
      settled += 1;
      settledSum += Number(l.amount_rupees);
    } else if (l.status === "active" || l.status === "pending") {
      active += 1;
      activeSum += Number(l.amount_rupees);
    }
  }
  return { active, settled, activeSum, settledSum };
}

const STATUS_OPTIONS: LoanStatus[] = ["pending", "active", "settled"];

export function AdminDashboard({
  users,
  searchQ,
  page,
  pageSize,
  totalCount,
  stats,
}: {
  users: AdminUserRow[];
  searchQ: string;
  page: number;
  pageSize: number;
  totalCount: number;
  stats: { usersCount: number; avail: number; settled: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(users[0]?.id ?? null);
  const [msg, setMsg] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);

  const totals = useMemo(() => stats, [stats]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1);

  function adminHref(nextPage: number, q: string) {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (nextPage > 1) params.set("page", String(nextPage));
    const s = params.toString();
    return s ? `/admin?${s}` : "/admin";
  }

  function runAction(fn: () => Promise<{ error?: string; ok?: boolean }>) {
    setMsg(null);
    startTransition(async () => {
      const r = await fn();
      if (r.error) setMsg(r.error);
      else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-brand-plum/10 lg:rounded-lg lg:border lg:border-zinc-200 lg:shadow-[0_1px_3px_0_rgb(0_0_0_/_0.06)] lg:ring-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-100 px-4 py-4 lg:items-center lg:border-zinc-200 lg:bg-zinc-50/80 lg:px-8 lg:py-5">
          <div className="flex min-w-0 items-center gap-3 lg:gap-4">
            <Link
              href="/home"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-plum shadow-sm ring-1 ring-brand-plum/10 transition hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo lg:rounded-lg lg:ring-zinc-200"
              aria-label="Back to app"
            >
              <ArrowLeft className="size-5" strokeWidth={2} />
            </Link>
            <div className="min-w-0">
              <p className="hidden text-xs font-medium uppercase tracking-wider text-zinc-500 lg:block">
                Smart Kredit
              </p>
              <h1 className="font-[family-name:var(--font-montserrat)] text-xl font-bold tracking-tight text-brand-plum sm:text-2xl lg:text-xl lg:font-semibold lg:text-zinc-900">
                Admin console
              </h1>
              <p className="mt-0.5 text-sm text-brand-plum/60 lg:text-sm lg:text-zinc-500">
                <span className="lg:hidden">
                  Available = active + pending. Settled = closed loans.
                </span>
                <span className="hidden lg:inline">
                  Overview and user directory — available = active + pending
                  loans.
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateUser((v) => !v)}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-brand-indigo px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-indigo/90 disabled:opacity-50"
          >
            <UserPlus className="size-4" />
            Create User
          </button>
        </header>

        <section className="grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-zinc-200 lg:border-b lg:border-zinc-200 lg:p-0">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-plum/10 lg:flex lg:items-center lg:gap-5 lg:rounded-none lg:p-8 lg:shadow-none lg:ring-0">
            <div className="hidden size-12 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 lg:flex">
              <Users className="size-6" strokeWidth={2} aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-plum/50 lg:text-[11px] lg:font-semibold lg:text-zinc-500">
                Total users
              </p>
              <p className="mt-1 font-[family-name:var(--font-montserrat)] text-2xl font-bold tabular-nums text-brand-plum lg:text-3xl lg:font-semibold lg:text-zinc-900">
                {totals.usersCount}
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-plum/10 lg:flex lg:items-center lg:gap-5 lg:rounded-none lg:p-8 lg:shadow-none lg:ring-0">
            <div className="hidden size-12 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 lg:flex">
              <Wallet className="size-6" strokeWidth={2} aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-plum/50 lg:text-[11px] lg:font-semibold lg:text-zinc-500">
                Available outstanding (₹)
              </p>
              <p className="mt-1 font-[family-name:var(--font-montserrat)] text-2xl font-bold tabular-nums text-amber-600 lg:text-3xl lg:font-semibold">
                {formatInr(totals.avail)}
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-plum/10 lg:flex lg:items-center lg:gap-5 lg:rounded-none lg:p-8 lg:shadow-none lg:ring-0">
            <div className="hidden size-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 lg:flex">
              <BadgeCheck className="size-6" strokeWidth={2} aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-plum/50 lg:text-[11px] lg:font-semibold lg:text-zinc-500">
                Settled total (₹)
              </p>
              <p className="mt-1 font-[family-name:var(--font-montserrat)] text-2xl font-bold tabular-nums text-emerald-600 lg:text-3xl lg:font-semibold">
                {formatInr(totals.settled)}
              </p>
            </div>
          </div>
        </section>

        {msg ? (
          <p
            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200 lg:mx-8 lg:mt-4 lg:rounded-md"
            role="alert"
          >
            {msg}
          </p>
        ) : null}

        {showCreateUser ? (
          <CreateUserPanel
            disabled={pending}
            onClose={() => setShowCreateUser(false)}
            onCreate={(input) =>
              runAction(async () => {
                const r = await createUser(input);
                if (r.ok) setShowCreateUser(false);
                return r;
              })
            }
          />
        ) : null}

        <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-4 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-800">Users</h2>
            <p className="text-xs text-zinc-500">
              Search by Firebase user ID. Expand a row to manage loans.
            </p>
          </div>
          <form
            action="/admin"
            method="get"
            className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:max-w-xl"
          >
            <label className="sr-only" htmlFor="admin-user-search">
              User ID
            </label>
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
                aria-hidden
              />
              <input
                id="admin-user-search"
                name="q"
                type="search"
                placeholder="Search by user ID…"
                defaultValue={searchQ}
                autoComplete="off"
                className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-indigo focus:outline-none focus:ring-1 focus:ring-brand-indigo"
              />
            </div>
            <input type="hidden" name="page" value="1" />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Search
            </button>
            {searchQ ? (
              <Link
                href="/admin"
                className="shrink-0 text-sm font-medium text-brand-indigo hover:underline"
              >
                Clear
              </Link>
            ) : null}
          </form>
        </div>

        <div className="overflow-x-auto lg:rounded-b-lg">
          <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm lg:min-w-0 lg:text-sm">
            <thead className="bg-zinc-100 max-lg:bg-brand-lavender/80">
              <tr className="border-b border-zinc-200 max-lg:border-brand-plum/10">
                <th className="w-[22%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600 max-lg:normal-case max-lg:text-brand-plum sm:px-4 lg:px-6 lg:py-3.5">
                  User
                </th>
                <th className="w-[18%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600 max-lg:normal-case max-lg:text-brand-plum sm:px-4 lg:px-6 lg:py-3.5">
                  Display name
                </th>
                <th className="w-[16%] px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600 max-lg:text-left max-lg:normal-case max-lg:text-amber-700 sm:px-4 lg:px-6 lg:py-3.5">
                  Available (₹)
                </th>
                <th className="w-[16%] px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600 max-lg:text-left max-lg:normal-case max-lg:text-emerald-700 sm:px-4 lg:px-6 lg:py-3.5">
                  Settled (₹)
                </th>
                <th className="w-[10%] px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600 max-lg:text-left max-lg:normal-case max-lg:text-brand-plum sm:px-4 lg:px-6 lg:py-3.5">
                  Loans
                </th>
                <th className="w-14 px-2 py-3 text-right lg:w-16" />
              </tr>
            </thead>
            <tbody className="bg-white">
              {users.map((u) => {
                const s = loanStats(u.loans);
                const open = openId === u.id;
                return (
                  <tr
                    key={u.id}
                    className="border-b border-zinc-100 align-top odd:bg-white even:bg-zinc-50/60 hover:bg-zinc-100/80 max-lg:border-brand-plum/8 max-lg:even:bg-transparent max-lg:hover:bg-transparent"
                  >
                    <td className="px-3 py-3 font-mono text-xs text-brand-plum/90 sm:px-4 lg:px-6 lg:py-3.5 lg:text-sm">
                      <div className="flex items-center gap-1.5">
                        {isEmailUser(u) ? (
                          <Mail className="size-3 shrink-0 text-brand-indigo/60" />
                        ) : null}
                        <span className="block break-all text-zinc-900 lg:max-w-none">
                          {formatUserIdentifier(u)}
                        </span>
                      </div>
                      <span className="mt-1 block break-all text-[10px] text-zinc-400 max-lg:text-brand-plum/40 lg:text-xs">
                        <span className="lg:hidden">{u.id.slice(0, 8)}…</span>
                        <span className="hidden lg:inline">{u.id}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 sm:px-4 lg:px-6 lg:py-3.5">
                      <ProfileNameCell
                        user={u}
                        disabled={pending}
                        onSave={(displayName) =>
                          runAction(() =>
                            updateProfile({ userId: u.id, displayName }),
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-sm font-medium text-amber-700 max-lg:text-left sm:px-4 lg:px-6 lg:py-3.5">
                      {formatInr(s.activeSum)}
                      <span className="ml-1 text-xs font-normal text-zinc-500 max-lg:text-brand-plum/50">
                        ({s.active})
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-sm font-medium text-emerald-700 max-lg:text-left sm:px-4 lg:px-6 lg:py-3.5">
                      {formatInr(s.settledSum)}
                      <span className="ml-1 text-xs font-normal text-zinc-500 max-lg:text-brand-plum/50">
                        ({s.settled})
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-zinc-800 max-lg:text-left sm:px-4 lg:px-6 lg:py-3.5">
                      {(u.loans ?? []).length}
                    </td>
                    <td className="px-2 py-3 text-right lg:px-3 lg:py-3.5">
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : u.id)}
                        className="inline-flex size-9 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-800 max-lg:text-brand-indigo max-lg:hover:bg-brand-lavender"
                        aria-expanded={open}
                        aria-label={open ? "Collapse loans" : "Expand loans"}
                      >
                        {open ? (
                          <ChevronDown className="size-5" />
                        ) : (
                          <ChevronRight className="size-5" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {users.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-zinc-500 max-lg:text-brand-plum/55 lg:border-t lg:border-zinc-100 lg:px-6 lg:text-sm">
              {searchQ
                ? "No users match this user ID search."
                : "No profiles yet. Users appear after they sign up."}
            </p>
          ) : null}
        </div>

        {totalCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600 lg:px-8">
            <p className="tabular-nums">
              Showing{" "}
              <span className="font-medium text-zinc-900">
                {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, totalCount)}
              </span>{" "}
              of <span className="font-medium text-zinc-900">{totalCount}</span>
            </p>
            <nav
              className="flex flex-wrap items-center gap-2"
              aria-label="Pagination"
            >
              <Link
                href={adminHref(Math.max(1, page - 1), searchQ)}
                className={`inline-flex items-center rounded-lg border border-zinc-200 px-3 py-1.5 font-medium transition hover:bg-zinc-50 ${
                  page <= 1 ? "pointer-events-none opacity-40" : ""
                }`}
                aria-disabled={page <= 1}
              >
                Previous
              </Link>
              <span className="tabular-nums text-zinc-500">
                Page {page} / {totalPages}
              </span>
              <Link
                href={adminHref(Math.min(totalPages, page + 1), searchQ)}
                className={`inline-flex items-center rounded-lg border border-zinc-200 px-3 py-1.5 font-medium transition hover:bg-zinc-50 ${
                  page >= totalPages ? "pointer-events-none opacity-40" : ""
                }`}
                aria-disabled={page >= totalPages}
              >
                Next
              </Link>
            </nav>
          </div>
        ) : null}
      </div>

      <div className="space-y-6 lg:space-y-8">
        {users.map((u) =>
        openId === u.id ? (
          <LoanPanel
            key={`panel-${u.id}`}
            user={u}
            disabled={pending}
            onCreate={(fields) =>
              runAction(() =>
                createLoan({
                  userId: u.id,
                  productName: fields.productName,
                  amountRupees: fields.amountRupees,
                  status: fields.status,
                  externalRef: fields.externalRef,
                }),
              )
            }
            onUpdate={(loan, fields) =>
              runAction(() =>
                updateLoan({
                  id: loan.id,
                  productName: fields.productName,
                  amountRupees: fields.amountRupees,
                  status: fields.status,
                  externalRef: fields.externalRef,
                }),
              )
            }
            onDelete={(id) => {
              if (typeof window !== "undefined" && !window.confirm("Delete this loan?")) {
                return;
              }
              runAction(() => deleteLoan(id));
            }}
          />
        ) : null,
      )}
      </div>
    </div>
  );
}

function ProfileNameCell({
  user,
  disabled,
  onSave,
}: {
  user: AdminUserRow;
  disabled: boolean;
  onSave: (v: string | null) => void;
}) {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(user.display_name ?? "");

  if (edit) {
    return (
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(val || null);
          setEdit(false);
        }}
      >
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-brand-plum/20 px-2 py-1.5 text-sm"
          placeholder="Name"
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled}
          className="rounded-lg bg-brand-indigo px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            setVal(user.display_name ?? "");
            setEdit(false);
          }}
          className="text-xs text-brand-plum/55"
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-brand-plum">
        {user.display_name?.trim() || "—"}
      </span>
      <button
        type="button"
        onClick={() => setEdit(true)}
        className="inline-flex size-8 items-center justify-center rounded-lg text-brand-indigo hover:bg-brand-lavender"
        aria-label="Edit display name"
      >
        <Pencil className="size-3.5" />
      </button>
    </div>
  );
}

function LoanPanel({
  user,
  disabled,
  onCreate,
  onUpdate,
  onDelete,
}: {
  user: AdminUserRow;
  disabled: boolean;
  onCreate: (fields: {
    productName: string;
    amountRupees: number;
    status: LoanStatus;
    externalRef: string | null;
  }) => void;
  onUpdate: (
    loan: AdminLoanRow,
    fields: {
      productName: string;
      amountRupees: number;
      status: LoanStatus;
      externalRef: string | null;
    },
  ) => void;
  onDelete: (id: string) => void;
}) {
  const loans = user.loans ?? [];
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    productName: "",
    amountRupees: "",
    status: "pending" as LoanStatus,
    externalRef: "",
  });

  return (
    <section
      className="rounded-2xl border border-brand-plum/12 bg-white/80 p-4 shadow-sm lg:border-zinc-200 lg:bg-white lg:p-6 lg:shadow-[0_1px_3px_0_rgb(0_0_0_/_0.06)]"
      aria-label={`Loans for ${formatUserIdentifier(user)}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 lg:gap-4">
        <h2 className="font-[family-name:var(--font-montserrat)] text-base font-bold text-brand-plum lg:text-lg">
          Loans · {formatUserIdentifier(user)}
        </h2>
        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-indigo px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-indigo/90 disabled:opacity-50"
          >
            <Plus className="size-4" />
            Add loan
          </button>
        ) : null}
      </div>

      {adding ? (
        <form
          className="mt-4 grid gap-3 rounded-xl bg-brand-lavender/40 p-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4 lg:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            const amt = Number(draft.amountRupees);
            if (!draft.productName.trim() || !Number.isFinite(amt) || amt <= 0)
              return;
            onCreate({
              productName: draft.productName,
              amountRupees: amt,
              status: draft.status,
              externalRef: draft.externalRef || null,
            });
            setDraft({
              productName: "",
              amountRupees: "",
              status: "pending",
              externalRef: "",
            });
            setAdding(false);
          }}
        >
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-plum/70">
            Product
            <input
              required
              value={draft.productName}
              onChange={(e) =>
                setDraft((d) => ({ ...d, productName: e.target.value }))
              }
              className="rounded-lg border border-brand-plum/20 px-2 py-2 text-sm text-brand-plum"
              disabled={disabled}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-plum/70">
            Amount (₹)
            <input
              required
              type="number"
              min={1}
              step={1}
              value={draft.amountRupees}
              onChange={(e) =>
                setDraft((d) => ({ ...d, amountRupees: e.target.value }))
              }
              className="rounded-lg border border-brand-plum/20 px-2 py-2 text-sm text-brand-plum"
              disabled={disabled}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-plum/70">
            Status
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  status: e.target.value as LoanStatus,
                }))
              }
              className="rounded-lg border border-brand-plum/20 px-2 py-2 text-sm text-brand-plum"
              disabled={disabled}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-plum/70">
            Reference (optional)
            <input
              value={draft.externalRef}
              onChange={(e) =>
                setDraft((d) => ({ ...d, externalRef: e.target.value }))
              }
              className="rounded-lg border border-brand-plum/20 px-2 py-2 text-sm text-brand-plum"
              disabled={disabled}
            />
          </label>
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={disabled}
              className="rounded-lg bg-brand-indigo px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-sm text-brand-plum/55"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <ul className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3 lg:gap-4">
        {loans.map((loan) => (
          <LoanRow
            key={loan.id}
            loan={loan}
            disabled={disabled}
            onSave={(fields) => onUpdate(loan, fields)}
            onDelete={() => onDelete(loan.id)}
          />
        ))}
        {loans.length === 0 && !adding ? (
          <li className="col-span-full text-sm text-brand-plum/55 lg:text-base">
            No loans for this user.
          </li>
        ) : null}
      </ul>
    </section>
  );
}

function CreateUserPanel({
  disabled,
  onClose,
  onCreate,
}: {
  disabled: boolean;
  onClose: () => void;
  onCreate: (input: {
    phone?: string;
    email?: string;
    displayName?: string;
  }) => void;
}) {
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  return (
    <div className="border-b border-zinc-200 bg-brand-lavender/30 px-4 py-4 lg:px-8 lg:py-5">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-semibold text-brand-plum">Create New User</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-brand-plum/50 hover:text-brand-plum"
        >
          Cancel
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("phone")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            mode === "phone"
              ? "bg-brand-indigo text-white"
              : "bg-white text-brand-plum ring-1 ring-brand-plum/20"
          }`}
        >
          Phone (OTP)
        </button>
        <button
          type="button"
          onClick={() => setMode("email")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            mode === "email"
              ? "bg-brand-indigo text-white"
              : "bg-white text-brand-plum ring-1 ring-brand-plum/20"
          }`}
        >
          Gmail / Email
        </button>
      </div>

      <form
        className="mt-3 grid gap-3 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (mode === "phone") {
            onCreate({ phone: phone.trim(), displayName: displayName || undefined });
          } else {
            onCreate({ email: email.trim(), displayName: displayName || undefined });
          }
        }}
      >
        {mode === "phone" ? (
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-plum/70">
            Phone number (+91…)
            <input
              required
              type="tel"
              placeholder="+919876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-lg border border-brand-plum/20 px-2 py-2 text-sm text-brand-plum"
              disabled={disabled}
            />
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-plum/70">
            Email address
            <input
              required
              type="email"
              placeholder="user@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-brand-plum/20 px-2 py-2 text-sm text-brand-plum"
              disabled={disabled}
            />
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs font-medium text-brand-plum/70">
          Display name (optional)
          <input
            type="text"
            placeholder="Full name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-lg border border-brand-plum/20 px-2 py-2 text-sm text-brand-plum"
            disabled={disabled}
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={disabled}
            className="w-full rounded-lg bg-brand-indigo px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}

function LoanRow({
  loan,
  disabled,
  onSave,
  onDelete,
}: {
  loan: AdminLoanRow;
  disabled: boolean;
  onSave: (fields: {
    productName: string;
    amountRupees: number;
    status: LoanStatus;
    externalRef: string | null;
  }) => void;
  onDelete: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const [productName, setProductName] = useState(loan.product_name);
  const [amountRupees, setAmountRupees] = useState(String(loan.amount_rupees));
  const [status, setStatus] = useState<LoanStatus>(loan.status);
  const [externalRef, setExternalRef] = useState(loan.external_ref ?? "");

  if (edit) {
    return (
      <li className="col-span-full rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200 lg:p-4">
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const amt = Number(amountRupees);
            if (!productName.trim() || !Number.isFinite(amt) || amt <= 0)
              return;
            onSave({
              productName,
              amountRupees: amt,
              status,
              externalRef: externalRef || null,
            });
            setEdit(false);
          }}
        >
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-plum/70">
            Product
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="rounded-lg border border-brand-plum/20 px-2 py-1.5 text-sm"
              disabled={disabled}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-plum/70">
            Amount (₹)
            <input
              type="number"
              min={1}
              step={1}
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              className="rounded-lg border border-brand-plum/20 px-2 py-1.5 text-sm"
              disabled={disabled}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-plum/70">
            Status
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as LoanStatus)
              }
              className="rounded-lg border border-brand-plum/20 px-2 py-1.5 text-sm"
              disabled={disabled}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-plum/70">
            Reference
            <input
              value={externalRef}
              onChange={(e) => setExternalRef(e.target.value)}
              className="rounded-lg border border-brand-plum/20 px-2 py-1.5 text-sm"
              disabled={disabled}
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={disabled}
              className="rounded-lg bg-brand-indigo px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setProductName(loan.product_name);
                setAmountRupees(String(loan.amount_rupees));
                setStatus(loan.status);
                setExternalRef(loan.external_ref ?? "");
                setEdit(false);
              }}
              className="text-sm text-brand-plum/55"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  const statusClass =
    loan.status === "settled"
      ? "text-emerald-600"
      : loan.status === "active"
        ? "text-amber-600"
        : "text-zinc-500";

  return (
    <li className="flex h-full min-h-[8rem] flex-col justify-between gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-brand-plum/10 lg:min-h-0 lg:flex-row lg:items-stretch lg:p-4">
      <div className="min-w-0 flex-1 lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="font-semibold text-brand-plum lg:text-base">
            {loan.product_name}
          </p>
          <p className="mt-0.5 break-all font-mono text-[11px] text-brand-plum/45 lg:text-xs">
            {loan.id}
          </p>
        </div>
        <p className="mt-2 font-[family-name:var(--font-montserrat)] text-lg font-bold tabular-nums text-brand-plum lg:mt-3 lg:text-xl">
          ₹{formatInr(Number(loan.amount_rupees))}
        </p>
        <p className={`mt-1 text-sm font-semibold capitalize ${statusClass}`}>
          {loan.status}
        </p>
        {loan.external_ref ? (
          <p className="mt-1 text-xs text-brand-plum/50">
            Ref: {loan.external_ref}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-1 border-t border-brand-plum/8 pt-2 lg:flex-col lg:justify-center lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
        <button
          type="button"
          onClick={() => setEdit(true)}
          disabled={disabled}
          className="inline-flex size-9 items-center justify-center rounded-lg text-brand-indigo hover:bg-brand-lavender disabled:opacity-50"
          aria-label="Edit loan"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="inline-flex size-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
          aria-label="Delete loan"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </li>
  );
}
