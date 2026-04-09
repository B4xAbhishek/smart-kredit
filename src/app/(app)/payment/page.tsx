import { Suspense } from "react";

import { getRepaymentUpiForSession } from "@/lib/session-profile";
import { getSession } from "@/lib/session";

import { PaymentCheckout } from "./payment-checkout";

export const metadata = {
  title: "Payment · Smart Kredit",
};

// Repayment UPI is admin-managed and can change at any time.
// Force dynamic rendering so the latest value is always shown.
export const dynamic = "force-dynamic";
export const revalidate = 0;

function PaymentFallback() {
  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col bg-gradient-to-b from-[#ebe4fb] via-[#ede8f7] to-[#e2daf3]">
      <div className="h-28 animate-pulse rounded-b-[1.75rem] bg-gradient-to-br from-[#dfd4f5] to-[#d3c6ee]" />
      <div className="mx-auto w-full max-w-md flex-1 px-4 pt-6">
        <div className="h-4 w-32 animate-pulse rounded bg-brand-plum/15" />
        <div className="mt-3 h-10 w-48 animate-pulse rounded bg-white/60" />
      </div>
    </div>
  );
}

export default async function PaymentPage() {
  const session = await getSession();
  const paymentReceiveUpi = await getRepaymentUpiForSession(session);

  return (
    <Suspense fallback={<PaymentFallback />}>
      <PaymentCheckout paymentReceiveUpi={paymentReceiveUpi} />
    </Suspense>
  );
}
