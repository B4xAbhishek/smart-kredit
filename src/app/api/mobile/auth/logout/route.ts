import { NextResponse, type NextRequest } from "next/server";

import { requireMobileSession } from "@/lib/mobile-api";

export async function POST(request: NextRequest) {
  const session = requireMobileSession(request);
  if (session instanceof NextResponse) {
    return session;
  }

  return NextResponse.json({ ok: true });
}
