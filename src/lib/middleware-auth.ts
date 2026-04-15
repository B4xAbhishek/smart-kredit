import { SESSION_COOKIE } from "@/lib/session-constants";
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
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionTokenEdge(sessionToken);
  const isAuthed = Boolean(session);
  const defaultAuthedPath = session?.repeat_customer ? "/orders" : "/home";

  if (path === "/") {
    return NextResponse.redirect(
      new URL(isAuthed ? defaultAuthedPath : "/login", request.url),
    );
  }

  if (path === "/login") {
    if (!isAuthed) return NextResponse.next();
    const nextParam = request.nextUrl.searchParams.get("next");
    const nextPath =
      nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : defaultAuthedPath;
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

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
