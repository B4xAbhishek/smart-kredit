import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  HOME_PRODUCTS,
  isHomeProductEnabledForUser,
} from "@/lib/home-products";
import { markHomeVisitedForSession } from "@/lib/mongodb/profile";
import { getSession } from "@/lib/session";
import {
  areHomeProductsGloballyEnabled,
  getHomeProductEnabledMapForSession,
} from "@/lib/session-profile";
import { Bell, CreditCard, Zap } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function HomePage() {
  const session = await getSession();
  await markHomeVisitedForSession(session);
  const enabledMap = await getHomeProductEnabledMapForSession(session);
  const globallyEnabled = await areHomeProductsGloballyEnabled();
  const recommendationRows = Object.values(HOME_PRODUCTS).filter((row) =>
    globallyEnabled && isHomeProductEnabledForUser(enabledMap, row.id),
  );

  return (
    <main className="px-4 pt-4">
      <header className="space-y-2 pb-8">
        <p className="text-sm font-medium leading-none text-brand-plum/55">
          Welcome
        </p>
        <div className="flex min-h-[4.5rem] items-center justify-between gap-3 sm:min-h-20">
          <BrandLogo
            compact
            className="min-w-0 flex-1"
            boxClassName="w-auto max-w-none"
          />
          <button
            type="button"
            className="shrink-0 self-center cursor-pointer rounded-full p-2.5 text-brand-plum ring-1 ring-brand-plum/10 transition hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo"
            aria-label="Notifications"
          >
            <Bell className="size-5" strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {/* Featured loan card */}
      <section
        className="relative overflow-hidden rounded-2xl bg-[#1e1b2e] p-5 text-white shadow-lg ring-1 ring-white/10"
        aria-labelledby="featured-loan"
      >
        <div
          className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-brand-indigo/25 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/4 size-32 rounded-full bg-brand-plum/40 blur-3xl"
          aria-hidden
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-md bg-amber-400/90 p-1.5 text-[#1e1b2e] shadow-inner">
              <CreditCard className="size-5" strokeWidth={2} aria-hidden />
            </span>
          </div>
          <div className="text-right text-xs text-white/70">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
              <span className="size-4 rounded-full bg-gradient-to-br from-brand-indigo to-brand-plum" />
              Smart Kredit
            </span>
          </div>
        </div>
        <div className="relative mt-8 flex flex-wrap items-end justify-between gap-4">
          <div id="featured-loan">
            <p className="text-xs font-medium text-white/60">Loan amount</p>
            <p className="font-[family-name:var(--font-montserrat)] text-2xl font-bold tracking-tight sm:text-[1.75rem]">
              ₹2,000 – 80,000
            </p>
          </div>
          <Link
            href="/payment"
            className="inline-flex cursor-pointer items-center justify-center rounded-full bg-brand-indigo px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-indigo/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Repay
          </Link>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-[family-name:var(--font-montserrat)] text-lg font-bold text-brand-plum">
          More recommendations
        </h2>

        <div className="mt-4 space-y-4">
          {recommendationRows.map((row) => (
            <article
              key={row.id}
              className="rounded-2xl bg-white p-4 shadow-[0_8px_30px_rgba(60,21,91,0.08)] ring-1 ring-zinc-100"
            >
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
                <span className="shrink-0 font-[family-name:var(--font-montserrat)] text-sm font-semibold italic text-emerald-600">
                  Available
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
                    ₹ {formatInr(row.loanAmountRupees)}
                  </p>
                </div>
                <Link
                  href={`/order/${row.id}`}
                  className="shrink-0 cursor-pointer rounded-lg bg-brand-indigo px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-indigo/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo"
                >
                  Detail
                </Link>
              </div>
            </article>
          ))}

          <div
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-indigo to-brand-plum p-5 text-white shadow-lg"
            role="region"
            aria-label="Promotional offer"
          >
            <div className="relative z-[1] max-w-[62%]">
              <p className="font-[family-name:var(--font-montserrat)] text-lg font-bold leading-snug">
                Lightning borrowing
              </p>
              <p className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                Competitive rates · Quick approval
              </p>
            </div>
            <div
              className="pointer-events-none absolute -bottom-2 -right-2 flex size-28 items-center justify-center rounded-full bg-white/10 text-4xl"
              aria-hidden
            >
              <span className="drop-shadow-md">₹</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
