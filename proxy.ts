import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/student",
  "/practice",
  "/pricing",
  "/subscription/success",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (publicPath) => pathname === publicPath || pathname.startsWith(`${publicPath}/`)
  );
}

function hasSessionCookie(request: NextRequest) {
  return Boolean(
    request.cookies.get("next-auth.session-token")?.value ||
      request.cookies.get("__Secure-next-auth.session-token")?.value ||
      request.cookies.get("authjs.session-token")?.value ||
      request.cookies.get("__Secure-authjs.session-token")?.value
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const isAuthenticated = hasSessionCookie(request);

  if ((pathname === "/login" || pathname.startsWith("/login/")) && isAuthenticated) {
    const role = searchParams.get("role");
    const destination = role === "student" ? "/practice" : "/teacher";

    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (!isAuthenticated && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("role", "teacher");
    loginUrl.searchParams.set(
      "callbackUrl",
      `${pathname}${request.nextUrl.search}`
    );

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
