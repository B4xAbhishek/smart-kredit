import { SESSION_COOKIE } from "@/lib/session-constants";
import { verifySessionTokenEdge } from "@/lib/session-edge-verify";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = [
  "/home",
  "/orders",
  "/account",
  "/payment",
  "/agreement",
  "/admin",
];

export async function updateSession(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionTokenEdge(sessionToken);
  const isAuthed = Boolean(session);

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  if (isProtected && !isAuthed) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (isAuthed && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
