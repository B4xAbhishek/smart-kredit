import * as WebBrowser from "expo-web-browser";

export function resolveWebAppUrl(webOrigin: string, pathOrUrl: string): string {
  const u = pathOrUrl.trim();
  if (!u) return webOrigin.replace(/\/+$/, "");
  const base = webOrigin.replace(/\/+$/, "");
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${base}${u.startsWith("/") ? u : `/${u}`}`;
}

/** Opens a path on the configured web app (e.g. /order/…) in an in-app browser tab. */
export async function openWebAppUrl(webOrigin: string, pathOrUrl: string): Promise<void> {
  await WebBrowser.openBrowserAsync(resolveWebAppUrl(webOrigin, pathOrUrl));
}
