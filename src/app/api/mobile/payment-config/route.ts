import { NextResponse, type NextRequest } from "next/server";

import { requireMobileSession } from "@/lib/mobile-api";
import type { MobilePaymentConfigResponse } from "@/lib/mobile-types";
import { getRepaymentUpiForSession } from "@/lib/session-profile";

export async function GET(request: NextRequest) {
  const session = requireMobileSession(request);
  if (session instanceof NextResponse) {
    return session;
  }

  const paymentReceiveUpi = await getRepaymentUpiForSession(session);
  return NextResponse.json<MobilePaymentConfigResponse>({
    paymentReceiveUpi,
  });
}
