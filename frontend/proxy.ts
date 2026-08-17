import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "card_credit_session";

const privateUiPrefixes = [
  "/dashboard", "/transactions", "/accounts", "/budgets", "/reports", "/payments",
  "/notifications", "/fees", "/cashback", "/analytics", "/recurring", "/cards", "/masterdata", "/profile", "/admin",
];
const privateApiPrefixes = [
  "/api/admin", "/api/profile", "/api/cards", "/api/notes", "/api/banks", "/api/cardtypes",
  "/api/accounts", "/api/financial-transactions", "/api/financial-reports", "/api/finance",
  "/api/card-statements", "/api/notifications", "/api/fee-center", "/api/cash-flow",
];

const hasSessionCookie = (request: NextRequest) => Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);

export function proxy(request: NextRequest) {
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
  matcher: [
    "/dashboard/:path*", "/transactions/:path*", "/accounts/:path*", "/budgets/:path*", "/reports/:path*",
    "/payments/:path*", "/notifications/:path*", "/fees/:path*", "/cashback/:path*", "/analytics/:path*", "/recurring/:path*",
    "/cards/:path*", "/masterdata/:path*", "/profile/:path*", "/admin/:path*",
    "/api/admin/:path*", "/api/profile/:path*", "/api/cards/:path*", "/api/notes/:path*", "/api/banks/:path*",
    "/api/cardtypes/:path*", "/api/accounts/:path*", "/api/financial-transactions/:path*",
    "/api/financial-reports/:path*", "/api/finance/:path*", "/api/card-statements/:path*",
    "/api/notifications/:path*", "/api/fee-center/:path*", "/api/cash-flow/:path*",
  ],
};
