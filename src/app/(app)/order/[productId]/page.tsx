import {
  HOME_PRODUCTS,
  isHomeProductEnabledForUser,
  isHomeProductId,
  type HomeProductId,
} from "@/lib/home-products";
import { getMongoDb } from "@/lib/mongodb/client";
import { getSession } from "@/lib/session";
import {
  areHomeProductsGloballyEnabled,
  getHomeProductEnabledMapForSession,
  resolveProfileUserId,
} from "@/lib/session-profile";
import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Order details · Smart Kredit",
};

/** Ensures due date uses request time, not build time. */
export const dynamic = "force-dynamic";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(n);
}

const INTEREST_FEE_RUPEES = 45;

/** Formats a Date as dd-mm-yyyy. */
function formatDateDmy(d: Date) {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/** Returns the admin-set due date for this loan, or today’s date as fallback. */
async function getLoanDueDate(
  userId: string | null,
  defaultProductKey: string,
): Promise<string> {
  if (!userId) return formatDateDmy(new Date());
  try {
    const db = await getMongoDb();
    const loan = await db.collection("loans").findOne({
      userId,
      default_product_key: defaultProductKey,
    });
    if (loan && loan.due_date) {
      return formatDateDmy(new Date(loan.due_date as Date));
    }
  } catch {
    // fall through to default
  }
  return formatDateDmy(new Date());
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  if (!isHomeProductId(productId)) {
    notFound();
  }

  const session = await getSession();
  const globallyEnabled = await areHomeProductsGloballyEnabled();
  if (!globallyEnabled) {
    notFound();
  }
  const enabledMap = await getHomeProductEnabledMapForSession(session);
  if (!isHomeProductEnabledForUser(enabledMap, productId)) {
    notFound();
  }

  const userId = await resolveProfileUserId(session);
  const product = HOME_PRODUCTS[productId as HomeProductId];
  const loanAmount = product.loanAmountRupees;
  const interestFee = INTEREST_FEE_RUPEES;
  const unpaidAmount = loanAmount + interestFee;
  const dueDateDisplay = await getLoanDueDate(userId, productId);

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col bg-zinc-100/90 pb-6">
      <header className="relative overflow-hidden rounded-b-[1.75rem] bg-gradient-to-br from-[#ebe4fb] via-[#dfd4f5] to-[#d3c6ee] px-4 pb-28 pt-4 shadow-md">
        <div
          className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-brand-plum/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-6 -left-10 size-36 rounded-full bg-brand-plum/8"
          aria-hidden
        />

        <div className="relative flex items-center justify-center">
          <Link
            href="/home"
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full p-2 text-brand-plum ring-1 ring-brand-plum/20 transition hover:bg-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-plum"
            aria-label="Back"
          >
            <ArrowLeft className="size-6" strokeWidth={2} />
          </Link>
          <h1 className="font-[family-name:var(--font-montserrat)] text-lg font-semibold tracking-tight text-brand-plum">
            Order Details
          </h1>
        </div>

        <div className="relative mt-8 flex flex-col items-center text-center">
          <span
            className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-lg ring-2 ring-brand-plum/15"
            aria-hidden
          >
            <Clock className="size-8 text-amber-950" strokeWidth={2} />
          </span>
          <p className="mt-5 max-w-md text-left text-sm leading-relaxed text-brand-plum/85">
            Making timely repayments not only maintains your financial health but
            also helps increase your borrowing limit. Recently there have been
            instances of individuals impersonating our company to collect debts.
            To protect your funds, please ensure you are transferring any money
            only through official Smart Kredit channels—not to personal accounts.
          </p>
        </div>
      </header>

      <div className="relative z-[2] -mt-10 flex-1 px-4">
        <section className="mx-auto max-w-md overflow-hidden rounded-[1.25rem] bg-white shadow-[0_8px_30px_rgba(60,21,91,0.08)] ring-1 ring-zinc-100">
          <div className="px-4 py-5">
            <dl className="space-y-4 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="shrink-0 text-zinc-500">Loan Amount</dt>
                <dd className="text-right font-medium tabular-nums text-zinc-800">
                  {formatInr(loanAmount)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="shrink-0 text-zinc-500">Unpaid Amount</dt>
                <dd className="text-right font-medium tabular-nums text-zinc-800">
                  {formatInr(unpaidAmount)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="shrink-0 text-zinc-500">Interest Fee</dt>
                <dd className="text-right font-medium tabular-nums text-zinc-800">
                  {formatInr(interestFee)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="shrink-0 text-zinc-500">Due Date</dt>
                <dd className="text-right font-medium tabular-nums text-zinc-800">
                  {dueDateDisplay}
                </dd>
              </div>
            </dl>
          </div>

          <div className="border-t border-zinc-100 px-4 py-5">
            <div className="rounded-2xl bg-brand-lavender/60 px-4 py-3.5 ring-1 ring-brand-plum/8">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-brand-plum">
                  Is there a lot of repayment pressure? 🤔
                </p>
                <button
                  type="button"
                  className="shrink-0 rounded-full border border-brand-indigo bg-white/80 px-3 py-1 text-xs font-semibold text-brand-indigo shadow-sm transition hover:bg-white"
                >
                  Extended
                </button>
              </div>
              <p className="mt-2 text-xs text-brand-plum/55">
                Try delaying the repayment now~~
              </p>
            </div>

            <Link
              href={`/payment?payableAmountRupees=${unpaidAmount}`}
              className="mt-5 flex w-full cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-[#4a7bff] to-brand-indigo py-3.5 text-center text-sm font-bold uppercase tracking-wide text-white shadow-md transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo"
            >
              Repayment
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
