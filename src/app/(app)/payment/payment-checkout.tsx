"use client";

import { ArrowLeft, FileText, Hand, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import paytmLogo from "@/assets/paytm.png";
import phonepeLogo from "@/assets/phonepe.png";
import utrHowToFind from "@/assets/utr-how-to-find.png";

const INITIAL_SECONDS = 5 * 60 + 10; // 05:10

const UPI_PAYEE_NAME = "Smart Kredit";

function formatTime(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** UPI `am` value: positive rupees as a string with two decimals, or undefined if invalid. */
function parsePayableAmountAm(payableAmountRupees: string | null): string | undefined {
  if (payableAmountRupees == null) return undefined;
  const normalized = payableAmountRupees.replace(/,/g, "").trim();
  if (normalized === "") return undefined;
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n.toFixed(2);
}

/**
 * UPI query string for `upi://pay`, `phonepe://pay`, and `paytmmp://pay`.
 * Uses percent-encoding (not `+` for spaces) — some apps reject `URLSearchParams` output.
 */
function buildUpiPayQueryString(
  pa: string,
  opts?: { am?: string },
): string {
  const parts = [
    `pa=${encodeURIComponent(pa)}`,
    `pn=${encodeURIComponent(UPI_PAYEE_NAME)}`,
    `tn=${encodeURIComponent("Repayment")}`,
    `cu=INR`,
  ];
  if (opts?.am) parts.push(`am=${encodeURIComponent(opts.am)}`);
  return parts.join("&");
}

type WalletApp = "paytm" | "phonepe";

/**
 * Opens Paytm or PhonePe via each app’s documented deep link. Falls back to generic `upi://pay`
 * on non-mobile or if the environment blocks custom schemes (user can pick an app).
 */
function navigateToWalletUpi(
  pa: string,
  wallet: WalletApp,
  opts?: { am?: string },
): void {
  if (typeof window === "undefined") return;
  const q = buildUpiPayQueryString(pa, opts);
  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    // App-specific schemes work more reliably than Chrome intent + `package=` for these wallets.
    const href =
      wallet === "phonepe" ? `phonepe://pay?${q}` : `paytmmp://pay?${q}`;
    window.location.href = href;
    return;
  }

  window.location.href = `upi://pay?${q}`;
}

export function PaymentCheckout({
  paymentReceiveUpi,
}: {
  /** Per-user UPI from profile when set, else global admin UPI (`app_settings.payment_upi`). */
  paymentReceiveUpi: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const payableAmountRupees = searchParams.get("payableAmountRupees");
  const upiTrimmed = paymentReceiveUpi?.trim() ?? "";
  const hasUpi = upiTrimmed.length > 0;
  const upiDisplay = hasUpi ? upiTrimmed : "—";
  const amountAm = parsePayableAmountAm(payableAmountRupees);
  const upiPayOpts = amountAm ? { am: amountAm } : undefined;
  const qrPayPayload = hasUpi
    ? `upi://pay?${buildUpiPayQueryString(upiTrimmed, upiPayOpts)}`
    : "";
  const qrSrc = hasUpi
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(qrPayPayload)}`
    : "https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=smartkredit%3Apay%3Aref-demo";
  const [secondsLeft, setSecondsLeft] = useState(INITIAL_SECONDS);
  const [qrVisible, setQrVisible] = useState(false);
  const [refNo, setRefNo] = useState("");
  const [copied, setCopied] = useState(false);
  const [utrHelpOpen, setUtrHelpOpen] = useState(false);
  const [submitSuccessOpen, setSubmitSuccessOpen] = useState(false);
  const [refError, setRefError] = useState<string | null>(null);

  const refDigits = refNo.replace(/\D/g, "");

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!utrHelpOpen && !submitSuccessOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setUtrHelpOpen(false);
        setSubmitSuccessOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [utrHelpOpen, submitSuccessOpen]);

  const onShowQr = useCallback(() => setQrVisible(true), []);

  const copyUpi = useCallback(async () => {
    if (!hasUpi) return;
    try {
      await navigator.clipboard.writeText(upiTrimmed);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [hasUpi, upiTrimmed]);

  const onSubmit = useCallback(() => {
    if (refDigits.length === 0) {
      setRefError("This field is required");
      return;
    }
    if (refDigits.length !== 12) {
      setRefError("Enter all 12 digits of your Ref No.");
      return;
    }
    setRefError(null);
    setSubmitSuccessOpen(true);
  }, [refDigits.length]);

  const onOpenPaytm = useCallback(() => {
    if (!hasUpi) return;
    navigateToWalletUpi(
      upiTrimmed,
      "paytm",
      amountAm ? { am: amountAm } : undefined,
    );
  }, [hasUpi, upiTrimmed, amountAm]);

  const onOpenPhonePe = useCallback(() => {
    if (!hasUpi) return;
    navigateToWalletUpi(
      upiTrimmed,
      "phonepe",
      amountAm ? { am: amountAm } : undefined,
    );
  }, [hasUpi, upiTrimmed, amountAm]);

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col bg-gradient-to-b from-[#ebe4fb] via-[#ede8f7] to-[#e2daf3] pb-6">
      <header className="relative overflow-hidden rounded-b-[1.75rem] bg-gradient-to-br from-[#ebe4fb] via-[#dfd4f5] to-[#d3c6ee] px-4 pb-8 pt-4 shadow-md">
        <div
          className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-brand-plum/8"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-8 -left-8 size-32 rounded-full bg-brand-plum/6"
          aria-hidden
        />
        <div className="relative flex items-center justify-center">
          <Link
            href="/home"
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full p-2 text-brand-plum ring-1 ring-brand-plum/20 transition hover:bg-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-plum"
            aria-label="Back to home"
          >
            <ArrowLeft className="size-6" strokeWidth={2} />
          </Link>
          <h1 className="font-[family-name:var(--font-montserrat)] text-lg font-semibold tracking-tight text-brand-plum">
            Repayment
          </h1>
        </div>
      </header>

      <div className="relative z-[1] mx-auto w-full max-w-md flex-1 -mt-10 px-4">
        <div className="overflow-hidden rounded-[1.25rem] bg-white px-4 py-6 shadow-[0_8px_30px_rgba(60,21,91,0.08)] ring-1 ring-zinc-100 sm:px-5">
        <p className="text-[15px] font-medium text-zinc-600">Amount Payable</p>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-montserrat)] text-3xl font-bold tracking-tight text-brand-indigo sm:text-[2rem]">
              {payableAmountRupees && `₹${payableAmountRupees}`}
            </p>
            {/* <p className="mt-1 text-sm text-zinc-400 line-through">₹ 7,025</p> */}
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
                src={qrSrc}
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
              onClick={onOpenPaytm}
              disabled={!hasUpi}
              aria-label="Open Paytm to pay with UPI"
              className="flex w-full cursor-pointer items-center gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-left shadow-sm transition hover:border-brand-indigo/35 hover:bg-brand-lavender/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span
                className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-zinc-100"
                aria-hidden
              >
                <Image
                  src={paytmLogo}
                  alt=""
                  fill
                  className="object-contain p-0.5"
                  sizes="44px"
                />
              </span>
              <span className="flex-1 text-[15px] font-semibold text-zinc-900">
                Paytm
              </span>
              <Hand className="size-5 shrink-0 text-zinc-400" strokeWidth={1.5} aria-hidden />
            </button>

            <button
              type="button"
              onClick={onOpenPhonePe}
              disabled={!hasUpi}
              aria-label="Open PhonePe to pay with UPI"
              className="flex w-full cursor-pointer items-center gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-left shadow-sm transition hover:border-brand-indigo/35 hover:bg-brand-lavender/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span
                className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-zinc-100"
                aria-hidden
              >
                <Image
                  src={phonepeLogo}
                  alt=""
                  fill
                  className="object-contain p-0.5"
                  sizes="44px"
                />
              </span>
              <span className="flex-1 text-[15px] font-semibold text-zinc-900">
                PhonePe
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
                  {upiDisplay}
                </div>
                <button
                  type="button"
                  onClick={copyUpi}
                  disabled={!hasUpi}
                  className="shrink-0 cursor-pointer rounded-lg bg-[#5c93e6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4a82d4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5c93e6] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
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
                  id="payment-ref-no"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Ref No is required"
                  value={refNo}
                  onChange={(e) => {
                    setRefNo(e.target.value.replace(/\D/g, "").slice(0, 12));
                    setRefError(null);
                  }}
                  aria-invalid={refError != null}
                  aria-describedby={refError ? "payment-ref-no-error" : undefined}
                  className={`w-full rounded-lg border bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none ring-0 transition focus:bg-white focus:ring-2 ${
                    refError
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/25"
                      : "border-zinc-200 focus:border-brand-indigo/50 focus:ring-brand-indigo/25"
                  }`}
                />
              </label>
              {refError ? (
                <p
                  id="payment-ref-no-error"
                  role="alert"
                  className="mt-1.5 text-xs font-medium text-red-600"
                >
                  {refError}
                </p>
              ) : null}
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                Tip: Open your UPI wallet and complete the transfer Record your
                reference No.(Ref No.) after payment.
              </p>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setUtrHelpOpen(true)}
                  className="cursor-pointer text-sm font-medium text-[#5c93e6] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5c93e6]"
                >
                  How to find utr?
                </button>
              </div>
            </div>
          </section>

          <button
            type="button"
            onClick={onSubmit}
            className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-[#4a7bff] to-brand-indigo py-3.5 text-base font-semibold text-white shadow-md transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo"
          >
            Submit
          </button>
        </div>
        </div>
      </div>

      {submitSuccessOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="presentation"
          onClick={() => setSubmitSuccessOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-success-title"
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <h2
                id="submit-success-title"
                className="text-base font-semibold text-zinc-900"
              >
                Submit Success
              </h2>
              <button
                type="button"
                onClick={() => setSubmitSuccessOpen(false)}
                className="flex size-9 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo"
                aria-label="Close"
              >
                <X className="size-5" strokeWidth={2} />
              </button>
            </div>
            <div className="px-4 py-4">
              <p className="text-sm leading-relaxed text-zinc-800">
                We will confirm your payment shortly. Please await a moment. If
                the payment has not been confirmed, please contact customer
                service in time.
              </p>
            </div>
            <div className="flex gap-3 border-t border-zinc-100 px-4 py-3">
              <button
                type="button"
                onClick={() => setSubmitSuccessOpen(false)}
                className="flex-1 cursor-pointer rounded-xl bg-zinc-600 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600"
              >
                Resubmit
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmitSuccessOpen(false);
                  router.push("/home");
                }}
                className="flex-1 cursor-pointer rounded-xl bg-brand-indigo py-3 text-sm font-semibold text-white transition hover:bg-brand-indigo/92 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo"
              >
                Return to App
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {utrHelpOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="presentation"
          onClick={() => setUtrHelpOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="utr-help-title"
            className="relative max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <h2 id="utr-help-title" className="text-sm font-semibold text-zinc-900">
                Where to find your UTR
              </h2>
              <button
                type="button"
                onClick={() => setUtrHelpOpen(false)}
                className="flex size-9 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo"
                aria-label="Close"
              >
                <X className="size-5" strokeWidth={2} />
              </button>
            </div>
            <div className="max-h-[calc(90vh-3.5rem)] overflow-y-auto p-3">
              <Image
                src={utrHowToFind}
                alt="Example payment receipt: the UTR appears in the payment details section, below the debited account."
                width={utrHowToFind.width}
                height={utrHowToFind.height}
                className="h-auto w-full object-contain"
                sizes="(max-width: 28rem) 100vw, 28rem"
                priority
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
