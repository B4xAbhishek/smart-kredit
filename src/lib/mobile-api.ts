import { NextResponse, type NextRequest } from "next/server";

import { getMobileSessionFromRequest } from "@/lib/mobile-session";
import type { SessionPayload } from "@/lib/session-types";

export function jsonUnauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: "unauthorized", message }, { status: 401 });
}

export function requireMobileSession(
  request: NextRequest,
): SessionPayload | NextResponse {
  const session = getMobileSessionFromRequest(request);
  return session ?? jsonUnauthorized();
}
