"use client";

import { devOtpBypassSignIn } from "@/app/login/dev-actions";
import { isDevOtpBypassEnabled } from "@/lib/dev-otp-bypass";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Shield, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

const CC = "+91";

function toE164(digits: string) {
  const d = digits.replace(/\D/g, "").slice(-10);
  return `${CC}${d}`;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/home";
  const previewMode = !isSupabaseConfigured();
  const devOtpBypass = isDevOtpBypassEnabled();

  const [phoneDigits, setPhoneDigits] = useState("");
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneE164 = useCallback(() => toE164(phoneDigits), [phoneDigits]);

  const sendOtp = async () => {
    setError(null);
    if (devOtpBypass) {
      setError(null);
      return;
    }
    if (previewMode) {
      router.replace(nextPath);
      return;
    }
    const phone = phoneE164();
    if (phone.length < 13) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setSendingOtp(true);
    const supabase = createClient();
    if (!supabase) {
      setSendingOtp(false);
      router.replace(nextPath);
      return;
    }
    const { error: err } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true },
    });
    setSendingOtp(false);
    if (err) {
      setError(err.message);
      return;
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (previewMode) {
      router.replace(nextPath);
      return;
    }
    const phone = phoneE164();
    if (phone.length < 13) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!otp.trim()) {
      setError(
        devOtpBypass
          ? "Enter any digits as OTP (dev bypass)."
          : "Enter the OTP sent to your phone.",
      );
      return;
    }

    if (devOtpBypass) {
      setVerifying(true);
      const res = await devOtpBypassSignIn(phone);
      setVerifying(false);
      if (!res.ok) {
        setError("Could not start dev session.");
        return;
      }
      router.replace(nextPath);
      router.refresh();
      return;
    }

    setVerifying(true);
    const supabase = createClient();
    if (!supabase) {
      setVerifying(false);
      router.replace(nextPath);
      return;
    }
    const { error: err } = await supabase.auth.verifyOtp({
      phone,
      token: otp.trim(),
      type: "sms",
    });
    setVerifying(false);
    if (err) {
      setError(err.message);
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
      {previewMode ? (
        <p className="rounded-xl bg-brand-lavender/90 px-3 py-2.5 text-sm text-brand-plum/85 ring-1 ring-brand-plum/10">
          <span className="font-medium text-brand-plum">Screen preview.</span> Add
          Supabase URL and anon key to <code className="text-xs">.env.local</code>{" "}
          to enable real OTP sign-in.
        </p>
      ) : null}

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
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
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
            ) : (
              "Get OTP"
            )}
          </button>
        </div>
      </label>

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
