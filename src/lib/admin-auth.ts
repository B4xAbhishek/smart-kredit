import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { SessionPayload } from "@/lib/session";

/**
 * Admin access: optional env phone allowlist, or profiles.is_admin = true.
 * Set ADMIN_PHONE_E164 in .env for the first admin before running SQL.
 */
export async function isAdminForPhone(phone: string): Promise<boolean> {
  const envAdmin = process.env.ADMIN_PHONE_E164?.trim();
  if (envAdmin && envAdmin === phone) {
    return true;
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return false;
  }

  const { data: byE164 } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("phone_e164", phone)
    .maybeSingle();

  if (byE164?.is_admin) {
    return true;
  }

  const { data: byPhone } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("phone", phone)
    .maybeSingle();

  return Boolean(byPhone?.is_admin);
}

/** Check admin by email (for Google OAuth users). */
export async function isAdminForEmail(email: string): Promise<boolean> {
  const envAdmin = process.env.ADMIN_EMAIL?.trim();
  if (envAdmin && envAdmin.toLowerCase() === email.toLowerCase()) {
    return true;
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return false;
  }

  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("email", email)
    .maybeSingle();

  return Boolean(data?.is_admin);
}

/** Check admin by Supabase user ID (most direct lookup). */
export async function isAdminForUserId(userId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (!supabase) return false;

  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  return Boolean(data?.is_admin);
}

/** Unified admin check for any session type. */
export async function isAdminForSession(
  session: SessionPayload,
): Promise<boolean> {
  if (session.userId) {
    return isAdminForUserId(session.userId);
  }
  if (session.phone) {
    return isAdminForPhone(session.phone);
  }
  if (session.email) {
    return isAdminForEmail(session.email);
  }
  return false;
}
