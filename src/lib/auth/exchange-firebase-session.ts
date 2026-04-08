/** Client: POST verified Firebase ID token → app session cookie. */

export type FirebaseSessionExchangeResult =
  | { ok: true; redirectTo: "/home" | "/orders" }
  | { ok: false; message: string };

export async function exchangeFirebaseIdTokenForSession(
  idToken: string,
  assertedPhoneE164?: string,
): Promise<FirebaseSessionExchangeResult> {
  const res = await fetch("/api/auth/firebase-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, assertedPhoneE164 }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    redirectTo?: "/home" | "/orders";
  };
  if (!res.ok) {
    return {
      ok: false,
      message: mapFirebaseSessionError(data.error),
    };
  }
  return { ok: true, redirectTo: data.redirectTo ?? "/home" };
}

function mapFirebaseSessionError(code: string | undefined): string {
  switch (code) {
    case "firebase_admin_not_configured":
      return "Server missing Firebase Admin credentials. In Vercel: Project → Settings → Environment Variables — add FIREBASE_SERVICE_ACCOUNT_JSON (full service account JSON as one line) or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY. Redeploy after saving.";
    case "mongodb_not_configured":
      return "Server is missing MONGODB_URI. Set it in .env.local and restart.";
    case "no_email":
      return "Your Google account has no email on file. Use another Google account.";
    case "no_phone":
      return "Phone sign-in did not return a number. Try again.";
    case "missing_phone":
      return "Phone number is required for login.";
    case "phone_mismatch":
      return "Please verify OTP with the same phone number entered.";
    default:
      return "Sign-in failed. Try again.";
  }
}
