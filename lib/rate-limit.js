import { db, nowIso } from "./db/client.js";

/**
 * Login throttling, stored in SQLite so it survives a restart and is visible
 * to the admin. Failed attempts are counted per email+IP bucket; a successful
 * sign-in clears the bucket.
 */

const WINDOW_MINUTES = 15;
const MAX_FAILURES = 8;

function bucketKey(email, ip) {
  return `${String(email || "").toLowerCase()}|${ip || "local"}`;
}

function windowStart() {
  return new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
}

export function recordLoginAttempt({ email, ip, success }) {
  db.prepare("INSERT INTO login_attempts (key, success, created_at) VALUES (?, ?, ?)").run(
    bucketKey(email, ip),
    success ? 1 : 0,
    nowIso(),
  );

  if (success) {
    db.prepare("DELETE FROM login_attempts WHERE key = ? AND success = 0").run(
      bucketKey(email, ip),
    );
  }

  // Keep the table small.
  db.prepare("DELETE FROM login_attempts WHERE created_at < ?").run(
    new Date(Date.now() - 86_400_000).toISOString(),
  );
}

/** @returns {{ limited: boolean, remaining: number, retryInMinutes: number }} */
export function checkLoginRate({ email, ip }) {
  const row = db
    .prepare(
      "SELECT COUNT(*) AS n, MAX(created_at) AS last FROM login_attempts WHERE key = ? AND success = 0 AND created_at >= ?",
    )
    .get(bucketKey(email, ip), windowStart());

  const failures = row?.n ?? 0;
  const limited = failures >= MAX_FAILURES;
  const last = row?.last ? new Date(row.last).getTime() : Date.now();
  const retryInMinutes = limited
    ? Math.max(1, Math.ceil((last + WINDOW_MINUTES * 60_000 - Date.now()) / 60_000))
    : 0;

  return { limited, remaining: Math.max(0, MAX_FAILURES - failures), retryInMinutes };
}
