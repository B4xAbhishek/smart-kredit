import {
  getFirebaseAdminAuth,
  isFirebaseAdminConfigured,
} from "@/lib/firebase/admin";
import { isMongoConfigured } from "@/lib/mongodb/client";
import { syncGoogleProfileToMongo } from "@/lib/mongodb/profile";
import { createEmailSession } from "@/lib/session";
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

  let body: { idToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const idToken = body.idToken?.trim();
  if (!idToken) {
    return NextResponse.json({ error: "missing_id_token" }, { status: 400 });
  }

  try {
    const auth = getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const email = decoded.email;
    if (!email) {
      return NextResponse.json({ error: "no_email" }, { status: 400 });
    }

    const displayName =
      (typeof decoded.name === "string" ? decoded.name : null) ?? null;
    const uid = decoded.uid;

    await syncGoogleProfileToMongo(uid, email, displayName);
    await createEmailSession(email, uid);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[firebase-session]", e);
    return NextResponse.json({ error: "verify_failed" }, { status: 401 });
  }
}
