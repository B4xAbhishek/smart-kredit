import { logoutAction } from "@/app/login/actions";
import { formatAccountHeader } from "@/lib/mask-account-id";
import { isMongoConfigured } from "@/lib/mongodb/client";
import { getProfileIdentifiersForUid } from "@/lib/mongodb/profile-identifiers";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AccountNativeBridge } from "./account-native-bridge";
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
  let phone = session?.phone ?? null;
  let email = session?.email ?? null;
  let displayName: string | null = null;

  if ((!phone && !email) && session?.userId && isMongoConfigured()) {
    const ids = await getProfileIdentifiersForUid(session.userId);
    phone = ids.phone ?? phone;
    email = ids.email ?? email;
    displayName = ids.displayName ?? null;
  }

  const accountLabel = formatAccountHeader(phone, email, displayName);

  return (
    <>
      <AccountNativeBridge accountLabel={accountLabel} />
      <AccountShell
        accountLabel={accountLabel}
        signOut={signOut}
        showAdminLink
      />
    </>
  );
}
