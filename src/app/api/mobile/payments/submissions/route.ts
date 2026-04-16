import { NextResponse, type NextRequest } from "next/server";

import { requireMobileSession } from "@/lib/mobile-api";
import { getMongoDb } from "@/lib/mongodb/client";
import { resolveProfileUserId } from "@/lib/session-profile";

export async function POST(request: NextRequest) {
  const session = requireMobileSession(request);
  if (session instanceof NextResponse) {
    return session;
  }

  let body: {
    productId?: string;
    payableAmountRupees?: number;
    utr?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const utr = body.utr?.trim() ?? "";
  if (!/^\d{12}$/.test(utr)) {
    return NextResponse.json({ error: "invalid_utr" }, { status: 400 });
  }

  const profileUserId = await resolveProfileUserId(session);
  if (!profileUserId) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  }

  const db = await getMongoDb();
  const result = await db.collection("payment_submissions").insertOne({
    userId: profileUserId,
    sessionUserId: session.userId ?? null,
    productId: body.productId ?? null,
    payableAmountRupees:
      typeof body.payableAmountRupees === "number"
        ? body.payableAmountRupees
        : null,
    utr,
    created_at: new Date(),
  });

  return NextResponse.json({
    ok: true,
    submissionId: String(result.insertedId),
  });
}
