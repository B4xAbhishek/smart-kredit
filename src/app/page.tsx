import {
  DEV_OTP_SESSION_COOKIE,
  isDevOtpBypassEnabled,
  parseDevSession,
} from "@/lib/dev-otp-bypass";
import { getSession } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  if (isDevOtpBypassEnabled()) {
    const jar = await cookies();
    const dev = parseDevSession(jar.get(DEV_OTP_SESSION_COOKIE)?.value);
    if (dev) {
      redirect("/home");
    }
  }

  const session = await getSession();
  if (session) {
    redirect("/home");
  }
  redirect("/login");
}
