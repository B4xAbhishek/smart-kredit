import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isDevOtpBypassEnabled } from "@/lib/dev-otp-bypass";
import { isMongoConfigured } from "@/lib/mongodb/client";
import {
  findProfileUidByPhone,
  getPostLoginRedirectPath,
  releasePhoneFromOtherProfiles,
  upsertPhoneProfile,
} from "@/lib/mongodb/profile";
import { createSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Stable synthetic Firebase-shaped UID for dev-only phone login (no SMS / reCAPTCHA). */
function devSyntheticUid(phoneE164: string): string {
  const h = createHash("sha256").update(phoneE164).digest("hex");
  return `devotp${h.slice(0, 22)}`;
}

/**
 * POST /api/auth/dev-phone-session
 * When NEXT_PUBLIC_DEV_OTP_BYPASS=true only: create sk-session from phone (no Firebase phone auth).
 * For native app dev; never enable in production.
 */
export async function POST(request: NextRequest) {
  if (!isDevOtpBypassEnabled()) {
    return NextResponse.json({ error: "dev_bypass_disabled" }, { status: 403 });
  }
  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "mongodb_not_configured" }, { status: 503 });
  }

  let body: { phoneE164?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const phone = body.phoneE164?.trim();
  if (!phone || !phone.startsWith("+")) {
    return NextResponse.json({ error: "missing_phone" }, { status: 400 });
  }

  try {
    const canonicalUid =
      (await findProfileUidByPhone(phone)) ?? devSyntheticUid(phone);
    await upsertPhoneProfile(canonicalUid, phone);
    await releasePhoneFromOtherProfiles(phone, canonicalUid);
    const redirectTo = await getPostLoginRedirectPath(canonicalUid);
    const sessionToken = await createSession(phone, canonicalUid, {
      repeatCustomer: redirectTo === "/orders",
    });
    return NextResponse.json({ ok: true, redirectTo, sessionToken });
  } catch (e) {
    console.error("[dev-phone-session]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
