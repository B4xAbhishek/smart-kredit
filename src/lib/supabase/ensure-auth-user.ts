import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Ensures a Supabase Auth user (and public.profiles row via trigger) exists for this phone.
 * OTP login only sets a cookie; without this, profiles stay empty for the admin console.
 */
export async function ensureAuthUserForPhone(phoneE164: string): Promise<void> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.admin.createUser({
    phone: phoneE164,
    phone_confirm: true,
  });

  if (!error) {
    return;
  }

  const msg = error.message.toLowerCase();
  if (
    msg.includes("already") ||
    msg.includes("registered") ||
    msg.includes("exists") ||
    msg.includes("duplicate")
  ) {
    return;
  }

  console.error("[ensureAuthUserForPhone]", error.message);
}
