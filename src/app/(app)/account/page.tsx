import { logoutAction } from "@/app/login/actions";
import { formatAccountId } from "@/lib/mask-account-id";
import { getSession } from "@/lib/session";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccountShell } from "./account-shell";

async function signOut() {
  "use server";
  await logoutAction();
  redirect("/login");
}

export const metadata = {
  title: "Account · Smart Kredit",
};

function isAndroidWebViewUserAgent(userAgent: string): boolean {
  return (
    /Android/i.test(userAgent) &&
    (/\bwv\b|; wv\)/i.test(userAgent) || /WebView/i.test(userAgent))
  );
}

export default async function AccountPage() {
  const session = await getSession();
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent") ?? "";
  const showAdminLink = !isAndroidWebViewUserAgent(userAgent);
  const accountLabel = formatAccountId(
    session?.phone ?? null,
    session?.email ?? null,
  );

  return (
    <AccountShell
      accountLabel={accountLabel}
      signOut={signOut}
      showAdminLink={showAdminLink}
    />
  );
}
