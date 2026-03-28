import {
  DEV_OTP_SESSION_COOKIE,
  isDevOtpBypassEnabled,
  parseDevSession,
} from "@/lib/dev-otp-bypass";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  if (!isSupabaseConfigured()) {
    redirect("/home");
  }

  if (isDevOtpBypassEnabled()) {
    const jar = await cookies();
    const dev = parseDevSession(jar.get(DEV_OTP_SESSION_COOKIE)?.value);
    if (dev) {
      redirect("/home");
    }
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect("/home");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/home");
  }
  redirect("/login");
}
