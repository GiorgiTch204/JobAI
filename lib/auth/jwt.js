import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { SignJWT, jwtVerify } from "jose";

/**
 * Session tokens are signed with HS256 via `jose`, which runs unchanged in
 * Node and in Proxy (Next.js 16's middleware replacement). The secret is read
 * lazily so a missing value fails at request time with a clear message rather
 * than crashing the build.
 */

const ISSUER = "jobai";
const AUDIENCE = "jobai:session";

let cachedKey = null;
let cachedSecret = null;

/**
 * Where a generated secret is kept when the environment does not provide one.
 * It sits beside the database, which is already git-ignored.
 */
function secretFilePath() {
  const dbFile = process.env.DATABASE_FILE || "data/jobai.db";
  const dir = path.dirname(path.isAbsolute(dbFile) ? dbFile : path.join(process.cwd(), dbFile));
  return path.join(dir, ".auth-secret");
}

/**
 * Reads, or creates once, a per-installation signing secret.
 *
 * Setting AUTH_SECRET in the environment is still the right thing to do for a
 * real deployment — and the only option across several machines — but an
 * installation that has not got round to it gets a strong random secret rather
 * than a shared default or a server that will not start.
 */
function fileSecret() {
  const file = secretFilePath();

  try {
    const existing = fs.readFileSync(file, "utf8").trim();
    if (existing.length >= 32) return existing;
  } catch {
    /* not created yet */
  }

  try {
    const generated = crypto.randomBytes(48).toString("hex");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${generated}\n`, { mode: 0o600 });

    if (!globalThis.__jobaiSecretNotice) {
      globalThis.__jobaiSecretNotice = true;
      console.warn(
        `[auth] AUTH_SECRET was not set, so a random one was generated and saved to ${path.relative(
          process.cwd(),
          file,
        )}.\n` +
          "       Sessions will survive restarts. For a real deployment, set AUTH_SECRET in the environment instead.",
      );
    }
    return generated;
  } catch (error) {
    throw new Error(
      "AUTH_SECRET is not set and a secret file could not be written " +
        `(${error.message}). Set AUTH_SECRET to a random string of at least 32 characters.`,
    );
  }
}

function secretString() {
  const value = process.env.AUTH_SECRET;

  if (value && value.length >= 32) return value;

  if (value && !globalThis.__jobaiShortSecretWarned) {
    globalThis.__jobaiShortSecretWarned = true;
    console.warn(
      "[auth] AUTH_SECRET is shorter than 32 characters and was ignored. Using the generated secret file instead.",
    );
  }

  return fileSecret();
}

function key() {
  const secret = secretString();
  if (!cachedKey || cachedSecret !== secret) {
    cachedSecret = secret;
    cachedKey = new TextEncoder().encode(secret);
  }
  return cachedKey;
}

export const SESSION_COOKIE = "jobai_session";

export function sessionTtlDays() {
  const parsed = Number(process.env.SESSION_TTL_DAYS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
}

/** @param {{ userId: string, sessionId: string, email: string, name: string, role: string }} payload */
export async function signSessionToken(payload, { ttlDays = sessionTtlDays() } = {}) {
  const seconds = Math.floor(ttlDays * 86_400);
  return new SignJWT({
    sub: payload.userId,
    sid: payload.sessionId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(`${seconds}s`)
    .sign(key());
}

/** Returns the claims, or `null` for any invalid / expired / tampered token. */
export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    if (!payload.sub || !payload.sid) return null;
    return {
      userId: payload.sub,
      sessionId: payload.sid,
      email: payload.email || "",
      name: payload.name || "",
      role: payload.role || "USER",
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
    };
  } catch {
    return null;
  }
}

export function cookieOptions({ maxAgeDays = sessionTtlDays() } = {}) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(maxAgeDays * 86_400),
  };
}
