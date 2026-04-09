import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  HOME_PRODUCTS,
  isHomeProductEnabledForUser,
  isHomeProductId,
} from "@/lib/home-products";
import { getMongoDb } from "@/lib/mongodb/client";
import { markHomeVisitedForSession } from "@/lib/mongodb/profile";
import { getSession } from "@/lib/session";
import {
  areHomeProductsGloballyEnabled,
  getHomeProductEnabledMapForSession,
  resolveProfileUserId,
} from "@/lib/session-profile";
import { DEFAULT_CONTACT_TEL } from "@/lib/contact";
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
  const profileId = await resolveProfileUserId(session);
  const settledDefaultProducts = new Set<string>();

  if (profileId) {
    try {
      const db = await getMongoDb();
      const settledDefaultLoans = await db
        .collection("loans")
        .find(
          {
            userId: profileId,
            status: { $regex: /^settled$/i },
          },
          { projection: { default_product_key: 1 } },
        )
        .toArray();
      for (const loan of settledDefaultLoans) {
        const key = (loan as { default_product_key?: unknown }).default_product_key;
        if (isHomeProductId(String(key ?? ""))) {
          settledDefaultProducts.add(String(key));
        }
      }
    } catch {
      // Keep home usable even if loan lookup fails.
    }
  }

  const recommendationRows = Object.values(HOME_PRODUCTS).filter((row) =>
    globallyEnabled &&
    isHomeProductEnabledForUser(enabledMap, row.id) &&
    !settledDefaultProducts.has(row.id),
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
          <Link
            href={`tel:${DEFAULT_CONTACT_TEL}`}
            className="shrink-0 self-center cursor-pointer rounded-full p-2.5 text-brand-plum ring-1 ring-brand-plum/10 transition hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo"
            aria-label="Contact us"
          >
            <Bell className="size-5" strokeWidth={1.75} />
          </Link>
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
            href="/orders"
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
              <div className="flex items-start gap-2.5 sm:gap-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-400 via-purple-500 to-indigo-600 shadow-inner sm:size-11"
                  aria-hidden
                >
                  <Zap
                    className="size-[1.125rem] text-white sm:size-5"
                    fill="currentColor"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <p className="font-[family-name:var(--font-montserrat)] text-sm font-bold leading-snug text-zinc-900 sm:text-base">
                      {row.productName}
                    </p>
                    <p className="shrink-0 font-[family-name:var(--font-montserrat)] text-[11px] font-semibold italic leading-tight text-amber-600 sm:text-right sm:text-sm">
                      Waiting Repayment
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-zinc-500">
                <span>ID:</span>
                <span className="truncate font-mono tabular-nums">{row.id}</span>
              </div>

              <div className="mt-4 flex items-end justify-between gap-2 sm:gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] text-zinc-500 sm:text-xs">Amount of money</p>
                  <p className="font-[family-name:var(--font-montserrat)] text-lg font-bold tabular-nums text-zinc-900 sm:text-xl">
                    ₹ {formatInr(row.loanAmountRupees)}
                  </p>
                </div>
                <Link
                  href={`/order/${row.id}`}
                  className="shrink-0 cursor-pointer rounded-lg bg-brand-indigo px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-indigo/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo sm:px-5 sm:text-sm"
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
