"use client";

import { exchangeFirebaseIdTokenForSession } from "@/lib/auth/exchange-firebase-session";
import { FirebaseGoogleButton } from "@/components/auth/FirebaseGoogleButton";
import { getFirebaseAuth, isFirebaseClientConfigured } from "@/lib/firebase/client";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
} from "firebase/auth";
import { Loader2, Shield, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: "Google sign-in failed. Try again.",
  no_code: "Sign-in was cancelled or incomplete. Try again.",
  no_email: "Your Google account has no email on file. Use another Google account.",
};

const CC = "+91";

function toE164(digits: string) {
  const d = digits.replace(/\D/g, "").slice(-10);
  return `${CC}${d}`;
}

function mapFirebasePhoneError(code: string): string {
  switch (code) {
    case "auth/invalid-phone-number":
      return "That phone number is not valid. Use a 10-digit Indian mobile number.";
    case "auth/missing-phone-number":
      return "Enter your mobile number.";
    case "auth/too-many-requests":
    case "auth/quota-exceeded":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/captcha-check-failed":
      return "Verification failed. Refresh the page and try again.";
    case "auth/invalid-app-credential":
      return "SMS could not be sent. Check Firebase Phone Auth and reCAPTCHA setup.";
    case "auth/invalid-verification-code":
      return "Invalid code. Check the SMS and try again.";
    case "auth/code-expired":
      return "That code expired. Tap Resend and enter the new code.";
    case "auth/session-expired":
      return "This step timed out. Request a new OTP.";
    default:
      return "Could not verify your number. Try again.";
  }
}

const RECAPTCHA_CONTAINER_ID = "recaptcha-phone-login";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitNext = searchParams.get("next");

  const [phoneDigits, setPhoneDigits] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);

  const firebaseReady = isFirebaseClientConfigured();

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

  useEffect(() => {
    return () => {
      try {
        verifierRef.current?.clear();
      } catch {
        /* ignore */
      }
      verifierRef.current = null;
      confirmationRef.current = null;
    };
  }, []);

  const phoneE164 = useCallback(() => toE164(phoneDigits), [phoneDigits]);
  const phoneValid = phoneDigits.length === 10;

  const clearRecaptcha = useCallback(() => {
    try {
      verifierRef.current?.clear();
    } catch {
      /* ignore */
    }
    verifierRef.current = null;
  }, []);

  const sendOtp = async () => {
    if (!firebaseReady) return;
    setError(null);
    const phone = phoneE164();
    if (phone.length < 13) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setSendingOtp(true);
    clearRecaptcha();
    confirmationRef.current = null;
    try {
      const auth = getFirebaseAuth();
      const appVerifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
        size: "invisible",
      });
      verifierRef.current = appVerifier;
      const confirmation = await signInWithPhoneNumber(auth, phone, appVerifier);
      confirmationRef.current = confirmation;
      setOtpSent(true);
    } catch (e: unknown) {
      const code =
        e && typeof e === "object" && "code" in e
          ? String((e as { code: string }).code)
          : "";
      setError(mapFirebasePhoneError(code));
      clearRecaptcha();
    } finally {
      setSendingOtp(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseReady) return;
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

    const confirmation = confirmationRef.current;
    if (!confirmation) {
      setError('Tap "Get OTP" first — we need to send you a verification code.');
      return;
    }

    setVerifying(true);
    const auth = getFirebaseAuth();
    try {
      await confirmation.confirm(otp.trim());
      const user = auth.currentUser;
      if (!user) {
        setError("Sign-in did not complete. Try again.");
        return;
      }
      const idToken = await user.getIdToken();
      const session = await exchangeFirebaseIdTokenForSession(idToken, phone);
      await signOut(auth);
      if (!session.ok) {
        setError(session.message);
        return;
      }
      const dest =
        explicitNext && explicitNext !== "/home"
          ? explicitNext
          : session.redirectTo;
      router.replace(dest);
      router.refresh();
    } catch (e: unknown) {
      const code =
        e && typeof e === "object" && "code" in e
          ? String((e as { code: string }).code)
          : "";
      if (code) {
        setError(mapFirebasePhoneError(code));
      } else {
        setError("Verification failed. Try again.");
      }
      try {
        await signOut(auth);
      } catch {
        /* ignore */
      }
    } finally {
      setVerifying(false);
    }
  };

  if (!firebaseReady) {
    return (
      <div className="rounded-xl border border-brand-plum/15 bg-brand-lavender/40 px-3 py-3 text-center text-xs text-brand-plum/80">
        Phone and Google sign-in need Firebase: set{" "}
        <code className="rounded bg-white/80 px-1 py-0.5 text-[0.65rem]">
          NEXT_PUBLIC_FIREBASE_*
        </code>{" "}
        in your environment (see <code className="text-[0.65rem]">.env.example</code>
        ). In Firebase Console → Authentication → Sign-in method, enable{" "}
        <strong>Phone</strong> and <strong>Google</strong>.
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-5"
      noValidate
    >
      <p className="text-sm text-brand-plum/75">
        Please enter your mobile number{" "}
        <span className="font-medium text-brand-plum/55">(mandatory)</span>
      </p>

      <label className="block">
        <span className="sr-only">Phone number (mandatory)</span>
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
            aria-required="true"
            className="min-w-0 flex-1 bg-transparent text-base text-brand-plum placeholder:text-brand-plum/35 outline-none"
          />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-brand-plum/50">
          Phone number is mandatory — required for OTP, Login / Register, and Login via
          Gmail.
        </p>
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

      <div id={RECAPTCHA_CONTAINER_ID} aria-hidden="true" className="sr-only" />

      {otpSent && !error ? (
        <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700" role="status">
          OTP sent to {CC} {phoneDigits} (SMS from Firebase).
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

      <FirebaseGoogleButton
        explicitNext={explicitNext}
        phoneE164={phoneE164()}
        phoneValid={phoneValid}
      />

      <p className="text-center text-xs leading-relaxed text-brand-plum/50">
        By continuing you agree to our{" "}
        <Link
          href="/terms"
          className="font-medium text-brand-indigo underline-offset-2 hover:underline"
        >
          Terms &amp; Conditions
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="font-medium text-brand-indigo underline-offset-2 hover:underline"
        >
          Privacy Policy
        </Link>
        . SMS is sent by Firebase; carrier charges may apply.
      </p>
    </form>
  );
}
