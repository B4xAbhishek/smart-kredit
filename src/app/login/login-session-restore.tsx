"use client";

import { exchangeFirebaseIdTokenForSession } from "@/lib/auth/exchange-firebase-session";
import { getLastLoginPhone } from "@/lib/auth/persistent-login";
import {
  getPersistentFirebaseAuth,
  isFirebaseClientConfigured,
} from "@/lib/firebase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function LoginSessionRestore() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!isFirebaseClientConfigured()) {
        if (!cancelled) setRestoring(false);
        return;
      }

      try {
        const auth = await getPersistentFirebaseAuth();
        await auth.authStateReady();

        const user = auth.currentUser;
        if (!user) {
          if (!cancelled) setRestoring(false);
          return;
        }

        const assertedPhoneE164 = user.phoneNumber ?? getLastLoginPhone() ?? undefined;
        if (!assertedPhoneE164) {
          if (!cancelled) setRestoring(false);
          return;
        }

        const idToken = await user.getIdToken();
        const session = await exchangeFirebaseIdTokenForSession(
          idToken,
          assertedPhoneE164,
        );

        if (!session.ok) {
          if (!cancelled) setRestoring(false);
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
        }
      } catch {
        if (!cancelled) setRestoring(false);
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (!restoring) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-brand-indigo/10 bg-brand-lavender/40 px-4 py-3 text-center text-sm text-brand-plum/75">
      Restoring your session...
    </div>
  );
}
