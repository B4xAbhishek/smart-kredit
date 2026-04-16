"use client";

import { exchangeFirebaseIdTokenForSession } from "@/lib/auth/exchange-firebase-session";
import { getLastLoginPhone } from "@/lib/auth/persistent-login";
import {
  getPersistentFirebaseAuth,
  isFirebaseClientConfigured,
} from "@/lib/firebase/client";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type RestoreState = "checking" | "restoring" | "idle";

/**
 * Silently re-exchanges a persisted Firebase auth session for an `sk-session`
 * cookie when the server cookie is missing but Firebase still has the user
 * (e.g. after the WebView was killed and the HTTP-only session cookie was
 * lost, but IndexedDB-backed Firebase auth survived).
 *
 * Renders `children` (the login form) only after the restore attempt has
 * either navigated away or determined there is nothing to restore, so the
 * user does not briefly see the login form when they are actually logged in.
 */
export function LoginSessionRestore({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<RestoreState>("checking");

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!isFirebaseClientConfigured()) {
        if (!cancelled) setState("idle");
        return;
      }

      try {
        const auth = await getPersistentFirebaseAuth();
        await auth.authStateReady();

        const user = auth.currentUser;
        if (!user) {
          if (!cancelled) setState("idle");
          return;
        }

        const assertedPhoneE164 =
          user.phoneNumber ?? getLastLoginPhone() ?? undefined;
        if (!assertedPhoneE164) {
          if (!cancelled) setState("idle");
          return;
        }

        if (!cancelled) setState("restoring");

        const idToken = await user.getIdToken();
        const session = await exchangeFirebaseIdTokenForSession(
          idToken,
          assertedPhoneE164,
        );

        if (!session.ok) {
          if (!cancelled) setState("idle");
          return;
        }

        const explicitNext = searchParams.get("next");
        const dest =
          explicitNext && explicitNext !== "/home"
            ? explicitNext
            : session.redirectTo;

        if (!cancelled) {
          router.replace(dest);
          router.refresh();
          // Intentionally leave state as "restoring" — keeps the loader on
          // screen until the navigation completes instead of flashing the
          // login form.
        }
      } catch {
        if (!cancelled) setState("idle");
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (state === "idle") {
    return <>{children}</>;
  }

  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-brand-plum/75"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-6 animate-spin text-brand-indigo" aria-hidden />
      <p className="text-sm font-medium">
        {state === "restoring" ? "Signing you in..." : "Checking your session..."}
      </p>
    </div>
  );
}
