# Auth and WebView (Smart Kredit)

This app loads the production web app in a full-screen WebView. Session cookies and Firebase tokens behave like a normal browser tab, with a few mobile-specific caveats.

## Firebase Google sign-in (WebView)

The native app sets `applicationNameForUserAgent` to include `SmartKreditAppWebView` (see `mobile/src/components/MainWebView.tsx`). The web app detects that token in [`src/lib/auth/app-webview.ts`](../../src/lib/auth/app-webview.ts) and uses **`signInWithRedirect`** instead of `signInWithPopup` on the login screen, then completes the session with **`getRedirectResult`** after Google returns. Phone number and `next` are stored in **`sessionStorage`** for the round trip (`smartkredit_google_redirect_*` keys).

Desktop and normal mobile browsers still use the popup flow.

## Cookies and session

- The app WebView uses **`incognito`** mode so **cookies and site data are not written to disk**. Each time the user **fully closes and reopens** the app, they start **logged out**; signing in again works normally for that session.
- `domStorageEnabled` stays on for in-session features; `sharedCookiesEnabled` is off so the WebView does not share a persistent cookie jar with Safari/Chrome.

## OAuth redirect URLs

Ensure any OAuth / Firebase authorized redirect domains include your **exact** production origin (e.g. `https://your-app.vercel.app`). Mobile WebView does not change the host; it is still the same HTTPS origin as the site.

## Vercel / security headers

If you add strict **Content-Security-Policy** or **X-Frame-Options** that block embedding, a full-screen same-origin WebView is usually unaffected because it is top-level navigation, not an iframe. Re-test after changing headers.

## Deep links

If you add `smart-kredit://` (or Universal Links / App Links) later, configure the same paths on Vercel and in the native app so post-login redirects can return to the app when using an external browser flow.
