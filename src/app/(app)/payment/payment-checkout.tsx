"use client";

import { ArrowLeft, FileText, Hand } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const INITIAL_SECONDS = 5 * 60 + 10; // 05:10

/** Shown in UI; copy uses full UPI for wallet paste. */
const UPI_MASKED = "s****2@ibl";
const UPI_COPY_VALUE = "smartkredit.pay@ibl";

function formatTime(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PaymentCheckout() {
  const [secondsLeft, setSecondsLeft] = useState(INITIAL_SECONDS);
  const [qrVisible, setQrVisible] = useState(false);
  const [refNo, setRefNo] = useState("");
  const [copied, setCopied] = useState(false);

  const refDigits = refNo.replace(/\D/g, "");
  const canSubmit = refDigits.length === 12;

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const onShowQr = useCallback(() => setQrVisible(true), []);

  const copyUpi = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(UPI_COPY_VALUE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, []);

  const onSubmit = useCallback(() => {
    if (!canSubmit) return;
    // Hook payment confirmation / API here
  }, [canSubmit]);

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col bg-white pb-6">
      <header className="relative flex items-center justify-center bg-brand-indigo py-3.5 text-white shadow-sm">
        <Link
          href="/home"
          className="absolute left-3 flex size-10 cursor-pointer items-center justify-center rounded-full transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label="Back to home"
        >
          <ArrowLeft className="size-5" strokeWidth={2} />
        </Link>
        <h1 className="text-base font-medium lowercase tracking-wide">payment</h1>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 px-4 pt-8">
        <p className="text-[15px] font-medium text-zinc-600">Amount Payable</p>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-montserrat)] text-3xl font-bold tracking-tight text-brand-indigo sm:text-[2rem]">
              ₹7,023.21
            </p>
            <p className="mt-1 text-sm text-zinc-400 line-through">₹ 7,025</p>
          </div>
          <span className="mt-1 inline-flex text-brand-indigo" aria-hidden>
            <FileText className="size-7" strokeWidth={1.5} />
          </span>
        </div>

        <p
          className="mt-5 text-center font-[family-name:var(--font-montserrat)] text-xl font-semibold tabular-nums text-brand-alert"
          aria-live="polite"
        >
          {formatTime(secondsLeft)}
        </p>

        <div className="mt-10">
          <p className="text-center text-[15px] font-medium text-zinc-900">
            Use Mobile Scan code to pay
          </p>
          <div className="relative mx-auto mt-5 max-w-[260px]">
            <div
              className={`relative overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200/80 ${
                !qrVisible ? "blur-md" : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=smartkredit%3Apay%3Aref-demo"
                alt=""
                width={260}
                height={260}
                className="mx-auto block h-auto w-full"
              />
            </div>
            {!qrVisible ? (
              <div className="absolute inset-0 flex items-center justify-center px-2">
                <button
                  type="button"
                  onClick={onShowQr}
                  className="cursor-pointer rounded-full border-2 border-brand-indigo bg-white px-6 py-2.5 text-sm font-semibold text-brand-indigo shadow-sm transition hover:bg-brand-lavender/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo"
                >
                  Show QR code
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-12 space-y-6 pb-8">
          <h2 className="text-center font-[family-name:var(--font-montserrat)] text-base font-bold text-zinc-900">
            Choose a payment method to pay
          </h2>

          <div className="space-y-3">
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-left shadow-sm transition hover:border-brand-indigo/35 hover:bg-brand-lavender/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo"
            >
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold leading-tight text-white shadow-inner"
                style={{
                  background: "linear-gradient(135deg, #00baf2 0%, #0066b3 100%)",
                }}
                aria-hidden
              >
                Pay
                <br />
                tm
              </span>
              <span className="flex-1 text-[15px] font-semibold text-zinc-900">
                Paytm
              </span>
              <Hand className="size-5 shrink-0 text-zinc-400" strokeWidth={1.5} aria-hidden />
            </button>

            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-left shadow-sm transition hover:border-brand-indigo/35 hover:bg-brand-lavender/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo"
            >
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-inner"
                style={{
                  background: "linear-gradient(145deg, #5f259f 0%, #7c3aed 55%, #a78bfa 100%)",
                }}
                aria-hidden
              >
                Pe
              </span>
              <span className="flex-1 text-[15px] font-semibold capitalize text-zinc-900">
                phonepe
              </span>
              <Hand className="size-5 shrink-0 text-zinc-400" strokeWidth={1.5} aria-hidden />
            </button>
          </div>

          <section
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            aria-labelledby="manual-transfer-heading"
          >
            <h3
              id="manual-transfer-heading"
              className="font-[family-name:var(--font-montserrat)] text-sm font-bold text-zinc-900"
            >
              Manual transfer
            </h3>

            <div className="mt-4">
              <p className="text-xs font-medium text-zinc-500">1. Manual transfer</p>
              <div className="mt-2 flex items-stretch gap-2">
                <div className="flex min-w-0 flex-1 items-center rounded-lg bg-zinc-100 px-3 py-2.5 text-sm font-medium text-zinc-800 ring-1 ring-zinc-200/80">
                  {UPI_MASKED}
                </div>
                <button
                  type="button"
                  onClick={copyUpi}
                  className="shrink-0 cursor-pointer rounded-lg bg-[#5c93e6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4a82d4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5c93e6]"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                Tip: Don&apos;t save the UPI, get new UPI every time.
              </p>
            </div>

            <div className="mt-6 border-t border-zinc-100 pt-5">
              <p className="text-sm font-medium text-zinc-800">
                2. Need to enter your 12 Ref No (UTR)
              </p>
              <label className="mt-3 block">
                <span className="sr-only">Reference number</span>
                <span className="mb-1.5 block text-xs font-medium text-zinc-600">
                  Ref No.
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Ref No is required"
                  value={refNo}
                  onChange={(e) =>
                    setRefNo(e.target.value.replace(/\D/g, "").slice(0, 12))
                  }
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none ring-0 transition focus:border-brand-indigo/50 focus:bg-white focus:ring-2 focus:ring-brand-indigo/25"
                />
              </label>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                Tip: Open your UPI wallet and complete the transfer Record your
                reference No.(Ref No.) after payment.
              </p>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  className="cursor-pointer text-sm font-medium text-[#5c93e6] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5c93e6]"
                >
                  How to find utr?
                </button>
              </div>
            </div>
          </section>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmit}
            className="w-full cursor-pointer rounded-xl py-3.5 text-base font-semibold text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 enabled:bg-brand-indigo enabled:hover:bg-brand-indigo/92"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
