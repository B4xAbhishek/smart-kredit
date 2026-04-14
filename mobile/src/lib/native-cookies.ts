import { NativeModules } from "react-native";

/**
 * App-local native module ({@link SkCookieModule}) — registered with TurboReactPackage so it works
 * with Expo’s ReactHost (unlike `@react-native-cookies/cookies`, which uses legacy ReactPackage only).
 */
export type CookieManagerNative = {
  getCookie: (url: string) => Promise<string>;
  setCookieLine: (url: string, cookieLine: string) => Promise<boolean>;
  flush: () => Promise<boolean>;
  removeAllCookies: () => Promise<boolean>;
  removeSessionCookies: () => Promise<boolean>;
};

export function getCookieManagerNative(): CookieManagerNative {
  const m = NativeModules.SkCookieManager as CookieManagerNative | undefined;
  if (!m) {
    throw new Error("SkCookieManager native module is not linked.");
  }
  return m;
}
