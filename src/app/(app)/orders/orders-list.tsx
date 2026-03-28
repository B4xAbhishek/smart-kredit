"use client";

import { Zap } from "lucide-react";
import { useMemo, useState } from "react";

type LoanTab = "ongoing" | "completed";

type LoanRow = {
  id: string;
  productName: string;
  amount: string;
  status: string;
  statusVariant: "settled" | "active" | "pending";
};

const COMPLETED: LoanRow[] = [
  {
    id: "280310020003525992",
    productName: "Daily Cash",
    amount: "3,500",
    status: "Settled",
    statusVariant: "settled",
  },
  {
    id: "280310020003525991",
    productName: "Daily Cash",
    amount: "2,100",
    status: "Settled",
    statusVariant: "settled",
  },
];

const ONGOING: LoanRow[] = [
  {
    id: "280310020003526001",
    productName: "Flex Loan",
    amount: "5,000",
    status: "Active",
    statusVariant: "active",
  },
];

function statusClass(v: LoanRow["statusVariant"]) {
  if (v === "settled") return "text-emerald-600";
  if (v === "active") return "text-amber-600";
  return "text-zinc-500";
}

export function OrdersList() {
  const [tab, setTab] = useState<LoanTab>("completed");

  const rows = useMemo(
    () => (tab === "completed" ? COMPLETED : ONGOING),
    [tab],
  );

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col bg-zinc-100/90">
      <section className="relative overflow-hidden rounded-b-[1.75rem] bg-gradient-to-br from-[#4a7bff] via-[#5b6ef5] to-brand-indigo px-4 pb-16 pt-7 shadow-md">
        <div
          className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-white/12"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-6 -left-10 size-36 rounded-full bg-white/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-8 top-1/2 size-24 rounded-full bg-white/8"
          aria-hidden
        />

        <h1 className="relative text-center font-[family-name:var(--font-montserrat)] text-[1.65rem] font-bold tracking-tight text-white drop-shadow-sm">
          Loan List
        </h1>

        <div
          className="relative mx-auto mt-7 flex max-w-sm rounded-full border border-white/50 bg-white p-1 shadow-inner"
          role="tablist"
          aria-label="Loan status"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "ongoing"}
            onClick={() => setTab("ongoing")}
            className={`relative z-[1] flex-1 cursor-pointer rounded-full py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              tab === "ongoing"
                ? "bg-brand-indigo text-white shadow-md"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Ongoing
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "completed"}
            onClick={() => setTab("completed")}
            className={`relative z-[1] flex-1 cursor-pointer rounded-full py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              tab === "completed"
                ? "bg-brand-indigo text-white shadow-md"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Completed
          </button>
        </div>
      </section>

      <div className="relative z-[2] -mt-8 flex-1 px-4 pb-6">
        <ul className="mx-auto flex max-w-md flex-col gap-4">
          {rows.map((row) => (
            <li key={row.id}>
              <article className="rounded-2xl bg-white p-4 shadow-[0_8px_30px_rgba(60,21,91,0.08)] ring-1 ring-zinc-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-400 via-purple-500 to-indigo-600 shadow-inner"
                      aria-hidden
                    >
                      <Zap className="size-5 text-white" fill="currentColor" />
                    </span>
                    <span className="truncate font-[family-name:var(--font-montserrat)] text-base font-bold text-zinc-900">
                      {row.productName}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 font-[family-name:var(--font-montserrat)] text-sm font-semibold italic ${statusClass(row.statusVariant)}`}
                  >
                    {row.status}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-zinc-500">
                  <span>ID:</span>
                  <span className="truncate font-mono tabular-nums">{row.id}</span>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs text-zinc-500">Amount of money</p>
                    <p className="font-[family-name:var(--font-montserrat)] text-xl font-bold tabular-nums text-zinc-900">
                      ₹ {row.amount}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 cursor-pointer rounded-lg bg-brand-indigo px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-indigo/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo"
                  >
                    Detail
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>

        {rows.length === 0 ? (
          <p className="mx-auto mt-8 max-w-md text-center text-sm text-zinc-500">
            No loans in this tab yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
