import { NextResponse } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/jwt";

/**
 * Next.js 16 renamed Middleware to Proxy. This runs before every page
 * request and does the cheap, optimistic part of access control: read the
 * signed cookie and send people somewhere sensible.
 *
 * It is deliberately not the only check. Every protected page re-verifies the
 * session against the database (revoked sessions, suspended accounts) and
 * every API route guards itself, so a forged or stale cookie cannot reach
 * data even though the redirect here is based on the token alone.
 */

const MEMBER_PREFIXES = ["/dashboard", "/cv", "/applications", "/saved", "/settings"];
const ADMIN_PREFIXES = ["/admin"];
const GUEST_ONLY = ["/login", "/register"];

function startsWithAny(pathname, prefixes) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request) {
  const { pathname, search } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySessionToken(token) : null;

  const needsMember = startsWithAny(pathname, MEMBER_PREFIXES);
  const needsAdmin = startsWithAny(pathname, ADMIN_PREFIXES);

  if ((needsMember || needsAdmin) && !claims) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
    return NextResponse.redirect(url);
  }

  if (needsAdmin && claims?.role !== "ADMIN") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "?denied=admin";
    return NextResponse.redirect(url);
  }

  if (claims && startsWithAny(pathname, GUEST_ONLY)) {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    url.pathname = next && next.startsWith("/") ? next : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Everything except API routes, Next internals and static files — those
     * guard themselves and do not need a redirect pass.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|txt|xml)$).*)",
  ],
};
