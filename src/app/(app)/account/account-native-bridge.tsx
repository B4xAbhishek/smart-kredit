"use client";

import { useEffect } from "react";

const APP_UA = "SmartKreditAppWebView";

/**
 * When the app WebView loads Account with a broken label (`Account —`), tell the native
 * shell to clear the session and show sign-in again.
 */
export function AccountNativeBridge({ accountLabel }: { accountLabel: string }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!navigator.userAgent.includes(APP_UA)) return;
    if (accountLabel !== "Account —") return;
    const w = window as unknown as {
      ReactNativeWebView?: { postMessage: (msg: string) => void };
    };
    w.ReactNativeWebView?.postMessage(
      JSON.stringify({ type: "smartkredit:account-broken" }),
    );
  }, [accountLabel]);

  return null;
}
