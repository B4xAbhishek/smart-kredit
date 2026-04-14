import { DEFAULT_WEB_APP_URL } from "../web-app-default";

export { DEFAULT_WEB_APP_URL };

/** Site origin, e.g. `https://smart-kredit.vercel.app`. */
export const WEB_APP_ORIGIN = new URL(DEFAULT_WEB_APP_URL).origin;

/** Default web app URL without trailing slash (path from default may be included). */
export const WEB_APP_BASE_URL = DEFAULT_WEB_APP_URL.replace(/\/+$/, "");
