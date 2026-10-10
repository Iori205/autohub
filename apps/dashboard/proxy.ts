import { NextResponse, type NextRequest } from "next/server";
import { LOGIN_PATH, SESSION_COOKIE } from "./lib/session";

/**
 * Auth guard (optimistic check). Every admin route needs the session cookie;
 * without it the request is redirected to /login?next=…. Signed-in users who
 * open /login go to the dashboard. apps/service will own the real session —
 * this check stays the same, only the cookie gets issued by the server.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.has(SESSION_COOKIE);
  const onLogin = pathname === LOGIN_PATH;

  if (!signedIn && !onLogin) {
    const url = new URL(LOGIN_PATH, request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (signedIn && onLogin) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|.*\\.[\\w]+$).*)"],
};
