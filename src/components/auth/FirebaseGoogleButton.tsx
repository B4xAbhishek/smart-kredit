"use client";

import { exchangeFirebaseIdTokenForSession } from "@/lib/auth/exchange-firebase-session";
import { saveLastLoginPhone } from "@/lib/auth/persistent-login";
import {
  getPersistentFirebaseAuth,
  isFirebaseClientConfigured,
} from "@/lib/firebase/client";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
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

type Props = {
  /** `next` query param; when absent or `/home`, server `redirectTo` is used after Google sign-in. */
  explicitNext: string | null;
  phoneE164: string;
  phoneValid: boolean;
};

export function FirebaseGoogleButton({ explicitNext, phoneE164, phoneValid }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firebaseReady = isFirebaseClientConfigured();

  const onFirebaseClick = useCallback(async () => {
    if (!phoneValid) {
      setError("Phone number is mandatory.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const auth = await getPersistentFirebaseAuth();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      const session = await exchangeFirebaseIdTokenForSession(idToken, phoneE164);
      if (!session.ok) {
        throw new Error(session.message);
      }
      saveLastLoginPhone(phoneE164);
      const dest =
        explicitNext && explicitNext !== "/home"
          ? explicitNext
          : session.redirectTo;
      router.replace(dest);
      router.refresh();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Google sign-in failed.";
      if (
        message.includes("auth/popup-closed-by-user") ||
        message.includes("cancelled")
      ) {
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [router, explicitNext, phoneE164, phoneValid]);

  if (!firebaseReady) {
    return (
      <div className="rounded-xl border border-brand-plum/15 bg-brand-lavender/40 px-3 py-3 text-center text-xs text-brand-plum/80">
        Google sign-in requires Firebase: set{" "}
        <code className="rounded bg-white/80 px-1 py-0.5 text-[0.65rem]">
          NEXT_PUBLIC_FIREBASE_*
        </code>{" "}
        in your environment (see <code className="text-[0.65rem]">.env.example</code>
        ).
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={onFirebaseClick}
        disabled={loading}
        className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-brand-plum/15 bg-white py-3.5 text-sm font-medium text-brand-plum shadow-sm transition hover:bg-brand-lavender/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-indigo disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin text-brand-indigo" aria-hidden />
        ) : (
          <GoogleIcon />
        )}
        {loading ? "Signing in…" : "Login via Gmail"}
      </button>
      {error ? (
        <p
          className="rounded-xl bg-brand-alert/10 px-3 py-2 text-center text-xs text-brand-alert"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </>
  );
}
