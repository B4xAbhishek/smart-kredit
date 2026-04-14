import { getCookieManagerNative } from "./native-cookies";

function originBase(webOrigin: string): string {
  return `${webOrigin.replace(/\/+$/, "")}/`;
}

/**
 * Same-origin API calls with cookies from the native cookie store (manual `Cookie` header).
 */
export async function authenticatedFetch(
  webOrigin: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const CookieManager = getCookieManagerNative();
  const base = webOrigin.replace(/\/+$/, "");
  const url = path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const raw = await CookieManager.getCookie(originBase(webOrigin));
  const cookieHeader = raw?.trim() ?? "";

  const headers = new Headers(init?.headers);
  if (cookieHeader) headers.set("Cookie", cookieHeader);

  return fetch(url, {
    ...init,
    headers,
    credentials: "omit",
  });
}
