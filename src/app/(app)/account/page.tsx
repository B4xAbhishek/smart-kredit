import { clearDevOtpSession } from "@/app/login/dev-actions";
import {
  DEV_OTP_SESSION_COOKIE,
  isDevOtpBypassEnabled,
  parseDevSession,
} from "@/lib/dev-otp-bypass";
import { formatAccountId } from "@/lib/mask-account-id";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccountShell } from "./account-shell";

async function signOut() {
  "use server";
  await clearDevOtpSession();
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/login");
}

export const metadata = {
  title: "Account · Smart Kredit",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const user = supabase
    ? (await supabase.auth.getUser()).data.user
    : null;

  const jar = await cookies();
  const devPhone =
    isDevOtpBypassEnabled() && !user
      ? parseDevSession(jar.get(DEV_OTP_SESSION_COOKIE)?.value)?.phone
      : null;

  const accountLabel = formatAccountId(
    user?.phone ?? devPhone ?? null,
    user?.email ?? null,
  );

  return (
    <AccountShell
      accountLabel={accountLabel}
      signOut={signOut}
      showAdminLink
    />
  );
}
