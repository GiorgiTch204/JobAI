import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { findUserById } from "@/lib/db/users.repo";
import { isSessionValid, touchSession } from "@/lib/db/sessions.repo";
import {
  SESSION_COOKIE,
  cookieOptions,
  sessionTtlDays,
  signSessionToken,
  verifySessionToken,
} from "./jwt.js";

/**
 * Server-side session helpers for Server Components, layouts and Route
 * Handlers. Every call verifies three things: the cookie signature, that the
 * session row is still live (so "sign out everywhere" works immediately), and
 * that the account is not suspended.
 */

export async function getSessionClaims() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

/** @returns {Promise<{ user: object, sessionId: string } | null>} */
export async function getSession() {
  const claims = await getSessionClaims();
  if (!claims) return null;

  if (!isSessionValid(claims.sessionId)) return null;

  const user = findUserById(claims.userId);
  if (!user || user.status !== "ACTIVE") return null;

  return { user, sessionId: claims.sessionId };
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/** Redirects to the sign-in page, preserving the intended destination. */
export async function requireUser(nextPath = "") {
  const session = await getSession();
  if (!session) {
    const target = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";
    redirect(target);
  }
  touchSession(session.sessionId);
  return session;
}

export async function requireAdmin(nextPath = "") {
  const session = await requireUser(nextPath);
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard?denied=admin");
  }
  return session;
}

/* -------------------------------------------------------------------------- */
/* cookie writes                                                              */
/* -------------------------------------------------------------------------- */

export async function writeSessionCookie({ user, sessionId }) {
  const token = await signSessionToken({
    userId: user.id,
    sessionId,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieOptions({ maxAgeDays: sessionTtlDays() }));
  return token;
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...cookieOptions({ maxAgeDays: 0 }), maxAge: 0 });
}

/* -------------------------------------------------------------------------- */
/* request metadata (for sessions + audit log)                                */
/* -------------------------------------------------------------------------- */

export function describeDevice(userAgent = "") {
  const ua = userAgent.toLowerCase();
  const os = ua.includes("windows")
    ? "Windows"
    : ua.includes("mac os") || ua.includes("macintosh")
      ? "macOS"
      : ua.includes("android")
        ? "Android"
        : ua.includes("iphone") || ua.includes("ipad")
          ? "iOS"
          : ua.includes("linux")
            ? "Linux"
            : "Unknown OS";

  const browser = ua.includes("edg/")
    ? "Edge"
    : ua.includes("chrome/") && !ua.includes("chromium")
      ? "Chrome"
      : ua.includes("firefox/")
        ? "Firefox"
        : ua.includes("safari/") && !ua.includes("chrome")
          ? "Safari"
          : ua.includes("curl")
            ? "curl"
            : "Unknown browser";

  return `${browser} on ${os}`;
}

export function requestMetaFrom(request) {
  const h = request?.headers;
  const get = (name) => (h?.get ? h.get(name) : "") || "";
  const forwarded = get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : get("x-real-ip") || "local";
  const userAgent = get("user-agent");
  return { ip, userAgent, device: describeDevice(userAgent) };
}

export async function requestMeta() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : h.get("x-real-ip") || "local";
  const userAgent = h.get("user-agent") || "";
  return { ip, userAgent, device: describeDevice(userAgent) };
}
