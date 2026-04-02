"use client";

import { sendOtpAction, verifyOtpAction } from "@/app/login/actions";
import { FirebaseGoogleButton } from "@/components/auth/FirebaseGoogleButton";
import { Loader2, Shield, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: "Google sign-in failed. Try again.",
  no_code: "Sign-in was cancelled or incomplete. Try again.",
  no_email: "Your Google account has no email on file. Use another Google account.",
};

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

  useEffect(() => {
    const code = searchParams.get("error");
    if (!code) return;
    const mapped = LOGIN_ERROR_MESSAGES[code];
    setError(mapped ?? decodeURIComponent(code));
    const next = searchParams.get("next");
    const qs = new URLSearchParams();
    if (next) qs.set("next", next);
    router.replace(`/login${qs.toString() ? `?${qs}` : ""}`, {
      scroll: false,
    });
  }, [router, searchParams]);

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

      <FirebaseGoogleButton nextPath={nextPath} />

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
