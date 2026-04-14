import { applyWebSessionCookie } from "./web-session-cookie";

export type FirebaseSessionExchangeResult =
  | { ok: true; redirectTo: "/home" | "/orders"; sessionToken?: string }
  | { ok: false; message: string };

function mapFirebaseSessionError(code: string | undefined): string {
  switch (code) {
    case "firebase_admin_not_configured":
      return "Server missing Firebase Admin credentials.";
    case "mongodb_not_configured":
      return "Server is missing database configuration.";
    case "no_email":
      return "Your Google account has no email on file.";
    case "no_phone":
      return "Phone sign-in did not return a number.";
    case "missing_phone":
      return "Phone number is required for login.";
    case "missing_id_token":
      return "Sign-in token missing. Try Google again.";
    case "phone_mismatch":
      return "Use the same phone number you entered.";
    case "verify_failed":
      return "Could not verify sign-in. Try again.";
    case "server_error":
      return "Server error. Try again.";
    default:
      return "Sign-in failed. Try again.";
  }
}

export async function exchangeFirebaseIdTokenForSessionAbsolute(
  webOrigin: string,
  idToken: string,
  assertedPhoneE164: string,
): Promise<FirebaseSessionExchangeResult> {
  const base = webOrigin.replace(/\/+$/, "");
  const res = await fetch(`${base}/api/auth/firebase-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, assertedPhoneE164 }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    redirectTo?: "/home" | "/orders";
    sessionToken?: string;
  };
  if (!res.ok) {
    return { ok: false, message: mapFirebaseSessionError(data.error) };
  }
  return {
    ok: true,
    redirectTo: data.redirectTo ?? "/home",
    sessionToken: data.sessionToken,
  };
}

export async function devPhoneSessionAbsolute(
  webOrigin: string,
  phoneE164: string,
): Promise<FirebaseSessionExchangeResult> {
  const base = webOrigin.replace(/\/+$/, "");
  const res = await fetch(`${base}/api/auth/dev-phone-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneE164 }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    redirectTo?: "/home" | "/orders";
    sessionToken?: string;
  };
  if (!res.ok) {
    if (data.error === "dev_bypass_disabled") {
      return {
        ok: false,
        message: "Dev phone bypass is off on the server. Use Google or enable NEXT_PUBLIC_DEV_OTP_BYPASS.",
      };
    }
    return { ok: false, message: mapFirebaseSessionError(data.error) };
  }
  return {
    ok: true,
    redirectTo: data.redirectTo ?? "/home",
    sessionToken: data.sessionToken,
  };
}

export async function persistSessionFromExchange(
  webOrigin: string,
  result: Extract<FirebaseSessionExchangeResult, { ok: true }>,
): Promise<void> {
  if (result.sessionToken) {
    await applyWebSessionCookie(webOrigin, result.sessionToken);
  }
}
