import { SESSION_COOKIE } from "@/lib/session-constants";
import { DEV_OTP_SESSION_COOKIE } from "@/lib/dev-otp-bypass";
import { verifySessionTokenEdge } from "@/lib/session-edge-verify";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = [
  "/home",
  "/orders",
  "/order",
  "/account",
  "/accounts",
  "/payment",
  "/admin",
];

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAuthEntryPath = path === "/" || path === "/login";

  if (isAuthEntryPath) {
    const response =
      path === "/"
        ? NextResponse.redirect(new URL("/login", request.url))
        : NextResponse.next();
    response.cookies.delete(SESSION_COOKIE);
    response.cookies.delete(DEV_OTP_SESSION_COOKIE);
    return response;
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionTokenEdge(sessionToken);
  const isAuthed = Boolean(session);

  const isProtected = PROTECTED.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  if (isProtected && !isAuthed) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
