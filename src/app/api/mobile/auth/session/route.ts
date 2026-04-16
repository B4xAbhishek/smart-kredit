import { NextResponse, type NextRequest } from "next/server";

import {
  getFirebaseAdminAuth,
  isFirebaseAdminConfigured,
} from "@/lib/firebase/admin";
import {
  isFallbackAccessCodeShapeValid,
  normalizeFallbackAccessCode,
} from "@/lib/fallback-access-code";
import { getMongoDb, isMongoConfigured } from "@/lib/mongodb/client";
import {
  findProfileUidByPhone,
  getPostLoginRedirectPath,
  releasePhoneFromOtherProfiles,
  syncGoogleProfileToMongo,
  upsertPhoneProfile,
} from "@/lib/mongodb/profile";
import type { AppSettingFallbackLoginCodeDoc } from "@/lib/mongodb/types";
import { createMobileSessionToken } from "@/lib/mobile-session";
import type { MobileAuthResponse } from "@/lib/mobile-types";

function buildAuthResponse(params: {
  userId: string;
  phone?: string | null;
  email?: string | null;
  redirectTo: "/home" | "/orders";
}): MobileAuthResponse {
  const { token, expiresAt } = createMobileSessionToken({
    userId: params.userId,
    ...(params.phone ? { phone: params.phone } : {}),
    ...(params.email ? { email: params.email } : {}),
    ...(params.redirectTo === "/orders" ? { repeat_customer: true } : {}),
  });

  return {
    ok: true,
    token,
    expiresAt,
    redirectTo: params.redirectTo,
    user: {
      userId: params.userId,
      phone: params.phone ?? null,
      email: params.email ?? null,
      repeatCustomer: params.redirectTo === "/orders",
    },
  };
}

export async function POST(request: NextRequest) {
  let body:
    | {
        provider?: "firebase" | "fallback_code";
        idToken?: string;
        assertedPhoneE164?: string;
      }
    | {
        provider?: "fallback_code";
        phoneE164?: string;
        code?: string;
      };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const provider = body.provider ?? ("idToken" in body ? "firebase" : "fallback_code");

  if (provider === "fallback_code") {
    const fallbackBody = body as {
      phoneE164?: string;
      code?: string;
    };

    if (!isMongoConfigured()) {
      return NextResponse.json(
        { error: "mongodb_not_configured" },
        { status: 503 },
      );
    }

    const phoneE164 = fallbackBody.phoneE164?.trim();
    const code = fallbackBody.code?.trim() ?? "";

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
        return NextResponse.json(
          { error: "fallback_disabled" },
          { status: 503 },
        );
      }
      if (enteredCode !== activeCode) {
        return NextResponse.json({ error: "invalid_code" }, { status: 401 });
      }

      const uid = await findProfileUidByPhone(phoneE164);
      if (!uid) {
        return NextResponse.json({ error: "user_not_found" }, { status: 404 });
      }

      const redirectTo = await getPostLoginRedirectPath(uid);
      return NextResponse.json(
        buildAuthResponse({
          userId: uid,
          phone: phoneE164,
          redirectTo,
        }),
      );
    } catch (error) {
      console.error("[mobile-auth:fallback_code]", error);
      return NextResponse.json({ error: "verify_failed" }, { status: 401 });
    }
  }

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

  const firebaseBody = body as {
    idToken?: string;
    assertedPhoneE164?: string;
  };

  const idToken = firebaseBody.idToken?.trim();
  if (!idToken) {
    return NextResponse.json({ error: "missing_id_token" }, { status: 400 });
  }

  const assertedPhoneE164 = firebaseBody.assertedPhoneE164?.trim();
  if (!assertedPhoneE164) {
    return NextResponse.json({ error: "missing_phone" }, { status: 400 });
  }

  try {
    const auth = getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const providerId = decoded.firebase?.sign_in_provider;

    if (providerId === "phone") {
      const phone = decoded.phone_number;
      if (!phone) {
        return NextResponse.json({ error: "no_phone" }, { status: 400 });
      }
      if (phone !== assertedPhoneE164) {
        return NextResponse.json({ error: "phone_mismatch" }, { status: 400 });
      }

      const canonicalUid = (await findProfileUidByPhone(phone)) ?? uid;
      await upsertPhoneProfile(canonicalUid, phone);
      await releasePhoneFromOtherProfiles(phone, canonicalUid);
      const redirectTo = await getPostLoginRedirectPath(canonicalUid);

      return NextResponse.json(
        buildAuthResponse({
          userId: canonicalUid,
          phone,
          redirectTo,
        }),
      );
    }

    const email = decoded.email;
    if (!email) {
      return NextResponse.json({ error: "no_email" }, { status: 400 });
    }

    const displayName =
      (typeof decoded.name === "string" ? decoded.name : null) ?? null;
    const canonicalUid = (await findProfileUidByPhone(assertedPhoneE164)) ?? uid;
    await syncGoogleProfileToMongo(
      canonicalUid,
      email,
      displayName,
      assertedPhoneE164,
    );
    await releasePhoneFromOtherProfiles(assertedPhoneE164, canonicalUid);
    const redirectTo = await getPostLoginRedirectPath(canonicalUid);

    return NextResponse.json(
      buildAuthResponse({
        userId: canonicalUid,
        phone: assertedPhoneE164,
        email,
        redirectTo,
      }),
    );
  } catch (error) {
    console.error("[mobile-auth:firebase]", error);
    return NextResponse.json({ error: "verify_failed" }, { status: 401 });
  }
}
