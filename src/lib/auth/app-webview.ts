/**
 * Token legacy WebView builds appended to the user agent (optional for newer native-only apps).
 */
export const APP_WEBVIEW_UA_TOKEN = "SmartKreditAppWebView";

export function isAppWebViewUserAgent(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  return userAgent.includes(APP_WEBVIEW_UA_TOKEN);
}

export function isAppWebViewClient(): boolean {
  if (typeof navigator === "undefined") return false;
  return isAppWebViewUserAgent(navigator.userAgent);
}

export const GOOGLE_REDIRECT_SESSION_PHONE_KEY =
  "smartkredit_google_redirect_phone_e164";
export const GOOGLE_REDIRECT_SESSION_NEXT_KEY =
  "smartkredit_google_redirect_next";
