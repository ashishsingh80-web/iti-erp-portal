import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CSRF_COOKIE = "iti_erp_csrf";

function genCsrfToken() {
  // Edge-compatible random token.
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isExcludedFromCsrf(pathname: string) {
  // Login endpoints are allowed without CSRF because they establish session cookies.
  return (
    pathname === "/api/auth/login" ||
    pathname === "/api/student-auth/login" ||
    pathname === "/api/parent-auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/student-auth/logout" ||
    pathname === "/api/parent-auth/logout"
  );
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"]
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  const csrfCookie = request.cookies.get(CSRF_COOKIE)?.value;
  const csrfHeader = request.headers.get("x-csrf-token");

  const shouldSetCookie = method === "GET" && !csrfCookie && pathname.startsWith("/");
  if (shouldSetCookie) {
    const token = genCsrfToken();
    const response = NextResponse.next();
    response.cookies.set(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12
    });
    return response;
  }

  const isUnsafeMethod = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
  const isApi = pathname.startsWith("/api/");
  if (isApi && isUnsafeMethod && !isExcludedFromCsrf(pathname)) {
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return new NextResponse("Forbidden - CSRF token invalid", { status: 403 });
    }
  }

  return NextResponse.next();
}

