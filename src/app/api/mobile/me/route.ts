import { NextResponse, type NextRequest } from "next/server";

import { requireMobileSession } from "@/lib/mobile-api";
import { formatAccountId } from "@/lib/mask-account-id";

export async function GET(request: NextRequest) {
  const session = requireMobileSession(request);
  if (session instanceof NextResponse) {
    return session;
  }

  return NextResponse.json({
    userId: session.userId ?? null,
    phone: session.phone ?? null,
    email: session.email ?? null,
    repeatCustomer: session.repeat_customer === true,
    accountLabel: formatAccountId(session.phone ?? null, session.email ?? null),
  });
}
