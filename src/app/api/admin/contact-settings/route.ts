import { isAdminForSession } from "@/lib/admin-auth";
import {
  createContactSettings,
  deleteContactSettings,
  getContactSettings,
  updateContactSettings,
} from "@/lib/contact-settings";
import { getSession } from "@/lib/session";
import { NextResponse, type NextRequest } from "next/server";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return false;
  return isAdminForSession(session);
}

type ContactSettingsPayload = {
  contactEmail?: string;
  contactPhone?: string | null;
};

function parseContactEmail(input: unknown): string {
  const value = typeof input === "string" ? input.trim() : "";
  if (!value || !value.includes("@")) {
    throw new Error("A valid contact email is required.");
  }
  return value;
}

function parsePayload(body: ContactSettingsPayload) {
  return {
    contactEmail: parseContactEmail(body.contactEmail),
    contactPhone: typeof body.contactPhone === "string" ? body.contactPhone : null,
  };
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const settings = await getContactSettings();
  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as ContactSettingsPayload;
    const result = await createContactSettings(parsePayload(body));
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as ContactSettingsPayload;
    await updateContactSettings(parsePayload(body));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  await deleteContactSettings();
  return NextResponse.json({ ok: true });
}
