"use client";

import { sendOtpAction, verifyOtpAction } from "@/app/login/actions";
import { Loader2, Shield, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

const CC = "+91";

const DEV_OTP_BYPASS =
  process.env.NEXT_PUBLIC_DEV_OTP_BYPASS === "true";

function toE164(digits: string) {
  const d = digits.replace(/\D/g, "").slice(-10);
  return `${CC}${d}`;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/home";

  const [phoneDigits, setPhoneDigits] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneE164 = useCallback(() => toE164(phoneDigits), [phoneDigits]);

  const sendOtp = async () => {
    setError(null);
    const phone = phoneE164();
    if (phone.length < 13) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setSendingOtp(true);
    const res = await sendOtpAction(phone);
    setSendingOtp(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setOtpSent(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const phone = phoneE164();
    if (phone.length < 13) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!otp.trim()) {
      setError("Enter the OTP sent to your phone.");
      return;
    }

    setVerifying(true);
    const res = await verifyOtpAction(phone, otp.trim());
    setVerifying(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.replace(nextPath);
    router.refresh();
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-5"
      noValidate
    >
      <p className="text-sm text-brand-plum/75">
        Please enter your mobile number
      </p>

      <label className="block">
        <span className="sr-only">Phone number</span>
        <div className="flex items-center gap-2 rounded-full bg-brand-lavender/90 px-4 py-3.5 ring-1 ring-brand-plum/10 transition-[box-shadow] focus-within:ring-2 focus-within:ring-brand-indigo/40">
          <Smartphone
            className="size-5 shrink-0 text-brand-indigo"
            strokeWidth={1.75}
            aria-hidden
          />
          <span className="text-sm font-medium text-brand-plum/80">{CC}</span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="Enter phone number"
            value={phoneDigits}
            onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
            className="min-w-0 flex-1 bg-transparent text-base text-brand-plum placeholder:text-brand-plum/35 outline-none"
          />
        </div>
      </label>

      <label className="block">
        <span className="sr-only">One-time password</span>
        <div className="flex items-center gap-2 rounded-full bg-brand-lavender/90 px-4 py-3.5 ring-1 ring-brand-plum/10 transition-[box-shadow] focus-within:ring-2 focus-within:ring-brand-indigo/40">
          <Shield
            className="size-5 shrink-0 text-brand-indigo"
            strokeWidth={1.75}
            aria-hidden
          />
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="min-w-0 flex-1 bg-transparent text-base text-brand-plum placeholder:text-brand-plum/35 outline-none"
          />
          <button
            type="button"
            onClick={sendOtp}
            disabled={sendingOtp || verifying}
            className="shrink-0 cursor-pointer rounded-full bg-brand-indigo px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-indigo/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sendingOtp ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : otpSent ? (
              "Resend"
            ) : (
              "Get OTP"
            )}
          </button>
        </div>
      </label>

      {otpSent && !error ? (
        <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700" role="status">
          {DEV_OTP_BYPASS ? (
            <>
              Dev mode: enter any <strong>6 digits</strong> as OTP (no real SMS).
            </>
          ) : (
            <>
              OTP sent to {CC} {phoneDigits}
            </>
          )}
        </p>
      ) : null}

      {error ? (
        <p
          className="rounded-xl bg-brand-alert/10 px-3 py-2 text-sm text-brand-alert"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={sendingOtp || verifying}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-brand-indigo py-4 text-base font-semibold text-white shadow-md transition hover:bg-brand-indigo/92 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo disabled:cursor-not-allowed disabled:opacity-60"
      >
        {verifying ? (
          <>
            <Loader2 className="size-5 animate-spin" aria-hidden />
            Verifying…
          </>
        ) : (
          "Login / Register"
        )}
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-brand-plum/10" />
        <span className="text-xs text-brand-plum/40">or</span>
        <div className="h-px flex-1 bg-brand-plum/10" />
      </div>

      <Link
        href={`/auth/google${nextPath !== "/home" ? `?next=${encodeURIComponent(nextPath)}` : ""}`}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-brand-plum/15 bg-white py-3.5 text-sm font-medium text-brand-plum shadow-sm transition hover:bg-brand-lavender/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo"
      >
        <GoogleIcon />
        Login via Gmail
      </Link>

      <p className="text-center text-xs text-brand-plum/50">
        By continuing you agree to Smart Kredit&apos;s terms. SMS charges may
        apply.{" "}
        <Link
          href="#"
          className="font-medium text-brand-indigo underline-offset-2 hover:underline"
        >
          Privacy
        </Link>
      </p>
    </form>
  );
}
