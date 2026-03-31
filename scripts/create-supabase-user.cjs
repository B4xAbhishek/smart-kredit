/**
 * Create a Supabase Auth user (and profile row via DB trigger).
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (Dashboard → Project Settings → API → service_role secret).
 *
 * Usage:
 *   node --env-file=.env.local scripts/create-supabase-user.cjs +918073132808
 */

const { createClient } = require("@supabase/supabase-js");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const phone = process.argv[2];

  if (!url || !serviceRole) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add the service role secret to .env.local.",
    );
    process.exit(1);
  }
  if (!phone || !phone.startsWith("+")) {
    console.error("Usage: node --env-file=.env.local scripts/create-supabase-user.cjs +918073132808");
    process.exit(1);
  }

  const supabase = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.admin.createUser({
    phone,
    phone_confirm: true,
  });

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  console.log("Created user:", data.user?.id);
  console.log("Phone:", data.user?.phone);
}

main();
