# Store release checklist (Expo / EAS)

## Prerequisites

1. [Expo](https://expo.dev) account and `npm i -g eas-cli` (or `npx eas-cli`).
2. Apple Developer Program (iOS) and Google Play Console (Android).
3. Replace placeholder IDs if needed: `com.smartkredit.app` in [`app.json`](../app.json) (`ios.bundleIdentifier`, `android.package`).

## Web app URL & sign-in

- The **login screen** uses a native header (gradient + logo) and a **WebView** of the same `/login` page as the website (see [`src/components/NativeLoginScreen.tsx`](../src/components/NativeLoginScreen.tsx)). After sign-in, the main WebView opens at `/home` or `/orders`. Origin comes from [`web-app-default.ts`](../web-app-default.ts) / [`src/config.ts`](../src/config.ts).
- After adding or changing native modules, run `npx expo prebuild` (or EAS) before shipping a new APK/AAB.

## EAS Build (first time)

```bash
cd mobile
eas login
eas build:configure
eas build --platform ios --profile production
eas build --platform android --profile production
```

Use **development** profile when testing with a dev client; use **production** for store binaries.

## iOS (App Store Connect)

- App name, subtitle, description, keywords, support URL, marketing URL.
- Privacy policy URL (required for many apps; align with in-app data collection).
- **App Privacy** questionnaire (data types, tracking).
- Screenshots per device class (phone required; tablet if `supportsTablet` is true).
- Signing: EAS manages credentials or upload your distribution cert + provisioning profile.
- **Review notes:** explain that core experience is the embedded web app at your production URL (if asked).

## Android (Play Console)

- Store listing: short/full description, graphics, feature graphic.
- **Data safety** form (aligned with actual SDKs and WebView content).
- Content rating questionnaire.
- App signing: Play App Signing (recommended); upload AAB from EAS.
- **Privacy policy** link if you collect personal or sensitive data.

## Versioning

- Bump `version` in `app.json` for user-visible version.
- iOS build number / Android `versionCode` are handled by EAS when `appVersionSource` is `remote`, or configure per build.

## After submission

- Monitor rejection feedback; common WebView issues are “minimal functionality” (mitigate with native shell, error states, pull-to-refresh) and broken login (see [AUTH_WEBVIEW.md](./AUTH_WEBVIEW.md)).
