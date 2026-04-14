import { getCookieManagerNative } from "./native-cookies";

export const SESSION_COOKIE_NAME = "sk-session";

function baseUrl(webOrigin: string): string {
  const o = webOrigin.replace(/\/+$/, "");
  return `${o}/`;
}

/** Android {@code CookieManager.getCookie} returns {@code a=b; c=d} fragments. */
function parseCookieHeader(raw: string): Record<string, { value?: string }> {
  const out: Record<string, { value?: string }> = {};
  if (!raw) return out;
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) out[name] = { value };
  }
  return out;
}

export async function applyWebSessionCookie(
  webOrigin: string,
  sessionToken: string,
): Promise<void> {
  const CookieManager = getCookieManagerNative();
  const url = baseUrl(webOrigin);
  const host = new URL(url).hostname;
  const line = `${SESSION_COOKIE_NAME}=${sessionToken}; Path=/; Domain=${host}; Secure`;
  await CookieManager.setCookieLine(url, line);
  await CookieManager.flush();
}

export async function clearWebAppCookies(webOrigin: string): Promise<void> {
  const CookieManager = getCookieManagerNative();
  try {
    await CookieManager.removeAllCookies();
  } catch {
    /* ignore */
  }
  try {
    await CookieManager.removeSessionCookies();
  } catch {
    /* ignore */
  }
  await CookieManager.flush();
}

export async function hasWebSessionCookie(webOrigin: string): Promise<boolean> {
  try {
    const CookieManager = getCookieManagerNative();
    const raw = await CookieManager.getCookie(baseUrl(webOrigin));
    const jar = parseCookieHeader(raw);
    const c = jar[SESSION_COOKIE_NAME];
    return Boolean(c?.value && c.value.length > 0);
  } catch {
    return false;
  }
}
