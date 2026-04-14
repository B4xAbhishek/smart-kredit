import {
  isFallbackAccessCodeShapeValid,
  normalizeFallbackAccessCode,
} from "@/lib/fallback-access-code";
import { getMongoDb, isMongoConfigured } from "@/lib/mongodb/client";
import { findProfileUidByPhone, getPostLoginRedirectPath } from "@/lib/mongodb/profile";
import type { AppSettingFallbackLoginCodeDoc } from "@/lib/mongodb/types";
import { createSession } from "@/lib/session";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  if (!isMongoConfigured()) {
    return NextResponse.json(
      { error: "mongodb_not_configured" },
      { status: 503 },
    );
  }

  let body: { phoneE164?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const phoneE164 = body.phoneE164?.trim();
  const code = body.code?.trim() ?? "";

  if (!phoneE164) {
    return NextResponse.json({ error: "missing_phone" }, { status: 400 });
  }
  if (!/^\+\d{10,15}$/.test(phoneE164)) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }
  const enteredCode = normalizeFallbackAccessCode(code);
  if (!isFallbackAccessCodeShapeValid(enteredCode)) {
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }

  try {
    const db = await getMongoDb();
    const fallbackDoc = await db
      .collection<AppSettingFallbackLoginCodeDoc>("app_settings")
      .findOne(
        { _id: "fallback_login_code" },
        { projection: { code: 1 } },
      );
    const activeCode = normalizeFallbackAccessCode(fallbackDoc?.code ?? "");
    if (!isFallbackAccessCodeShapeValid(activeCode)) {
      return NextResponse.json({ error: "fallback_disabled" }, { status: 503 });
    }
    if (enteredCode !== activeCode) {
      return NextResponse.json({ error: "invalid_code" }, { status: 401 });
    }

    const uid = await findProfileUidByPhone(phoneE164);
    if (!uid) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }
    const redirectTo = await getPostLoginRedirectPath(uid);
    await createSession(phoneE164, uid, {
      repeatCustomer: redirectTo === "/orders",
    });
    return NextResponse.json({ ok: true, redirectTo });
  } catch (e) {
    console.error("[fallback-code-session]", e);
    return NextResponse.json({ error: "verify_failed" }, { status: 401 });
  }
}
