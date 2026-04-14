export type FallbackCodeSessionExchangeResult =
  | { ok: true; redirectTo: "/home" | "/orders" }
  | { ok: false; message: string };

export async function exchangeFallbackCodeForSession(
  phoneE164: string,
  code: string,
): Promise<FallbackCodeSessionExchangeResult> {
  const res = await fetch("/api/auth/fallback-code-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneE164, code }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    redirectTo?: "/home" | "/orders";
  };
  if (!res.ok) {
    return {
      ok: false,
      message: mapFallbackSessionError(data.error),
    };
  }
  return { ok: true, redirectTo: data.redirectTo ?? "/home" };
}

function mapFallbackSessionError(code: string | undefined): string {
  switch (code) {
    case "mongodb_not_configured":
      return "Server is missing MongoDB settings. Please contact admin.";
    case "fallback_disabled":
      return "Admin has not generated an emergency login code yet. Please ask admin.";
    case "missing_phone":
    case "invalid_phone":
      return "Enter a valid phone number first.";
    case "invalid_code":
      return "Invalid admin login code. Ask admin for the latest 6-digit code.";
    case "user_not_found":
      return "No account found for this phone number. Ask admin to create your user first.";
    default:
      return "Could not sign in with admin code. Try again.";
  }
}
