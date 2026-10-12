import { db, newId, nowIso } from "./client.js";

function mapSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    ip: row.ip,
    userAgent: row.user_agent,
    device: row.device,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    active: !row.revoked_at && new Date(row.expires_at) > new Date(),
  };
}

export function createSession({ userId, ip = "", userAgent = "", device = "", ttlDays = 7 }) {
  const id = newId("ses");
  const ts = nowIso();
  const expires = new Date(Date.now() + ttlDays * 86_400_000).toISOString();

  db.prepare(
    `INSERT INTO sessions (id, user_id, ip, user_agent, device, created_at, last_seen_at, expires_at)
     VALUES (@id, @userId, @ip, @userAgent, @device, @ts, @ts, @expires)`,
  ).run({ id, userId, ip, userAgent, device, ts, expires });

  return mapSession(db.prepare("SELECT * FROM sessions WHERE id = ?").get(id));
}

export function findSession(id) {
  return mapSession(db.prepare("SELECT * FROM sessions WHERE id = ?").get(id));
}

/** True when the session exists, is not revoked and has not expired. */
export function isSessionValid(id) {
  const row = db
    .prepare("SELECT revoked_at, expires_at FROM sessions WHERE id = ?")
    .get(id);
  if (!row) return false;
  if (row.revoked_at) return false;
  return new Date(row.expires_at) > new Date();
}

export function touchSession(id) {
  db.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").run(nowIso(), id);
}

export function revokeSession(id) {
  return (
    db.prepare("UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL").run(
      nowIso(),
      id,
    ).changes > 0
  );
}

export function revokeAllUserSessions(userId, { except } = {}) {
  const ts = nowIso();
  if (except) {
    return db
      .prepare(
        "UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND id != ? AND revoked_at IS NULL",
      )
      .run(ts, userId, except).changes;
  }
  return db
    .prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL")
    .run(ts, userId).changes;
}

export function listUserSessions(userId) {
  return db
    .prepare("SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 25")
    .all(userId)
    .map(mapSession);
}

export function countActiveSessions() {
  return db
    .prepare(
      "SELECT COUNT(*) AS n FROM sessions WHERE revoked_at IS NULL AND expires_at > ?",
    )
    .get(nowIso()).n;
}

/** Housekeeping: drop sessions that expired more than 30 days ago. */
export function pruneSessions() {
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  return db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(cutoff).changes;
}
