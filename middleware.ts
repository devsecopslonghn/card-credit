import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "card_credit_session";

const privateUiPrefixes = ["/cards", "/masterdata"];
const privateApiPrefixes = ["/api/cards", "/api/notes", "/api/reports", "/api/banks", "/api/cardtypes"];

const hasSessionCookie = (request: NextRequest) => Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const privateUi = privateUiPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const privateApi = privateApiPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!privateUi && !privateApi) return NextResponse.next();
  if (hasSessionCookie(request)) return NextResponse.next();

  if (privateApi) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Vui lòng đăng nhập." } },
      { status: 401 },
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/cards/:path*", "/masterdata/:path*", "/api/cards/:path*", "/api/notes/:path*", "/api/reports/:path*", "/api/banks/:path*", "/api/cardtypes/:path*"],
};
