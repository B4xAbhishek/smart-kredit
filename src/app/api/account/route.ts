import { NextResponse } from "next/server";
import { DEFAULT_CONTACT_EMAIL } from "@/lib/contact";
import { formatAccountHeader } from "@/lib/mask-account-id";
import { isMongoConfigured } from "@/lib/mongodb/client";
import { getProfileIdentifiersForUid } from "@/lib/mongodb/profile-identifiers";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let phone = session.phone ?? null;
    let email = session.email ?? null;
    let displayName: string | null = null;

    if (!phone && !email && session.userId && isMongoConfigured()) {
      const ids = await getProfileIdentifiersForUid(session.userId);
      phone = ids.phone ?? phone;
      email = ids.email ?? email;
      displayName = ids.displayName ?? null;
    }

    const accountLabel = formatAccountHeader(phone, email, displayName);

    return NextResponse.json({
      accountLabel,
      showAdminLink: true,
      contactEmail: DEFAULT_CONTACT_EMAIL,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
