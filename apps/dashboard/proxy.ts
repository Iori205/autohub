import { NextResponse, type NextRequest } from "next/server";
import { LOGIN_PATH, SESSION_COOKIE } from "./lib/session";

/**
 * Нэвтрэлтийн урьдчилсан хамгаалалт: күүкигүй хүсэлтийг /login?next=… руу, нэвтэрсэн хэрэглэгчийн /login-ийг самбар руу шилжүүлнэ.
 * Жинхэнэ шалгалтыг сервис API дуудлага бүрт хийж, 401 ирэхэд клиент гаргана.
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
  // /api/* бол хуудас биш, прокси хийсэн apps/service (401-ийг өөрөө буцаана)
  matcher: ["/((?!api/|_next/|favicon.ico|.*\\.[\\w]+$).*)"],
};
