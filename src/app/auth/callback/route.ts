import { createServerClient } from "@supabase/ssr";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createEmailSession } from "@/lib/session";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /auth/callback
 * Supabase redirects here after Google OAuth.
 * Exchanges the code for a session, then creates our sk-session cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";
  const errorParam = searchParams.get("error");

  if (errorParam) {
    console.error("[OAuth callback] provider error:", errorParam);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorParam)}`, origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !anonKey) {
    return NextResponse.redirect(
      new URL("/login?error=supabase_not_configured", origin),
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("[OAuth callback] exchangeCodeForSession error:", error?.message);
    return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
  }

  const user = data.user;
  const email = user.email ?? "";

  if (!email) {
    return NextResponse.redirect(new URL("/login?error=no_email", origin));
  }

  // Create our custom sk-session cookie (replaces Supabase's own session cookie for our app)
  await createEmailSession(email, user.id);

  // Update profile row: set email + display_name from Google if not already set
  const serviceClient = createServiceRoleClient();
  if (serviceClient) {
    const displayName =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      null;

    // Ensure profile exists first (trigger should have created it; upsert as safety net)
    await serviceClient
      .from("profiles")
      .upsert({ id: user.id, email }, { onConflict: "id" });

    // Set display_name only if not already set
    if (displayName) {
      await serviceClient
        .from("profiles")
        .update({ display_name: displayName })
        .eq("id", user.id)
        .is("display_name", null);
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
