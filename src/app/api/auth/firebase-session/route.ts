import {
  getFirebaseAdminAuth,
  isFirebaseAdminConfigured,
} from "@/lib/firebase/admin";
import { isMongoConfigured } from "@/lib/mongodb/client";
import {
  findProfileUidByPhone,
  getPostLoginRedirectPath,
  releasePhoneFromOtherProfiles,
  syncGoogleProfileToMongo,
  upsertPhoneProfile,
} from "@/lib/mongodb/profile";
import { createEmailSession, createSession } from "@/lib/session";
import { NextResponse, type NextRequest } from "next/server";

/**
 * POST /api/auth/firebase-session
 * Verifies Firebase ID token, writes profile to MongoDB, sets sk-session (Firebase UID).
 */
export async function POST(request: NextRequest) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: "firebase_admin_not_configured" },
      { status: 503 },
    );
  }
  if (!isMongoConfigured()) {
    return NextResponse.json(
      { error: "mongodb_not_configured" },
      { status: 503 },
    );
  }

  let body: { idToken?: string; assertedPhoneE164?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const idToken = body.idToken?.trim();
  if (!idToken) {
    return NextResponse.json({ error: "missing_id_token" }, { status: 400 });
  }
  const assertedPhoneE164 = body.assertedPhoneE164?.trim();
  if (!assertedPhoneE164) {
    return NextResponse.json({ error: "missing_phone" }, { status: 400 });
  }

  try {
    const auth = getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const provider = decoded.firebase?.sign_in_provider;

    if (provider === "phone") {
      const phone = decoded.phone_number;
      if (!phone) {
        return NextResponse.json({ error: "no_phone" }, { status: 400 });
      }
      if (phone !== assertedPhoneE164) {
        return NextResponse.json({ error: "phone_mismatch" }, { status: 400 });
      }
      // Reuse existing profile by phone to keep login idempotent.
      const canonicalUid = (await findProfileUidByPhone(phone)) ?? uid;
      await upsertPhoneProfile(canonicalUid, phone);
      await releasePhoneFromOtherProfiles(phone, canonicalUid);
      const redirectTo = await getPostLoginRedirectPath(canonicalUid);
      await createSession(phone, canonicalUid, {
        repeatCustomer: redirectTo === "/orders",
      });
      return NextResponse.json({ ok: true, redirectTo });
    }

    const email = decoded.email;
    if (!email) {
      return NextResponse.json({ error: "no_email" }, { status: 400 });
    }

    const displayName =
      (typeof decoded.name === "string" ? decoded.name : null) ?? null;

    // Reuse existing profile by phone to avoid duplicate users across logins.
    const canonicalUid = (await findProfileUidByPhone(assertedPhoneE164)) ?? uid;
    await syncGoogleProfileToMongo(
      canonicalUid,
      email,
      displayName,
      assertedPhoneE164,
    );
    await releasePhoneFromOtherProfiles(assertedPhoneE164, canonicalUid);
    const redirectTo = await getPostLoginRedirectPath(canonicalUid);
    await createEmailSession(email, canonicalUid, {
      repeatCustomer: redirectTo === "/orders",
    });

    return NextResponse.json({ ok: true, redirectTo });
  } catch (e) {
    console.error("[firebase-session]", e);
    return NextResponse.json({ error: "verify_failed" }, { status: 401 });
  }
}
