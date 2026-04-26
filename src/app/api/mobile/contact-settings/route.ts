import { NextResponse, type NextRequest } from "next/server";

import { contactMailtoHref } from "@/lib/contact";
import { getContactSettings } from "@/lib/contact-settings";
import { requireMobileSession } from "@/lib/mobile-api";
import type { MobileContactSettingsResponse } from "@/lib/mobile-types";

export async function GET(request: NextRequest) {
  const session = requireMobileSession(request);
  if (session instanceof NextResponse) {
    return session;
  }

  const settings = await getContactSettings();
  return NextResponse.json<MobileContactSettingsResponse>({
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    contactMailtoHref: contactMailtoHref(settings.contactEmail),
  });
}
