import { logoutAction } from "@/app/login/actions";
import { formatAccountId } from "@/lib/mask-account-id";
import { getSession } from "@/lib/session";
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

export default async function AccountPage() {
  const session = await getSession();
  const accountLabel = formatAccountId(
    session?.phone ?? null,
    session?.email ?? null,
  );

  return (
    <AccountShell
      accountLabel={accountLabel}
      signOut={signOut}
      showAdminLink
    />
  );
}
