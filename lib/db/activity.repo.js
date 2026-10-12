import { db, fromJson, newId, nowIso } from "./client.js";

function mapActivity(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    summary: row.summary,
    meta: fromJson(row.meta, null),
    ip: row.ip,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

/**
 * Appends an audit entry. Logging must never break the request that triggered
 * it, so failures are swallowed (and surfaced in the server console).
 */
export function logActivity({
  userId = null,
  actorName = "",
  actorRole = "",
  action,
  entity = null,
  entityId = null,
  summary = "",
  meta = null,
  ip = "",
  userAgent = "",
}) {
  try {
    db.prepare(
      `INSERT INTO activity_log
         (id, user_id, actor_name, actor_role, action, entity, entity_id, summary, meta, ip, user_agent, created_at)
       VALUES
         (@id, @userId, @actorName, @actorRole, @action, @entity, @entityId, @summary, @meta, @ip, @userAgent, @ts)`,
    ).run({
      id: newId("act"),
      userId,
      actorName,
      actorRole,
      action,
      entity,
      entityId,
      summary,
      meta: meta ? JSON.stringify(meta) : null,
      ip,
      userAgent: String(userAgent || "").slice(0, 400),
      ts: nowIso(),
    });
  } catch (error) {
    console.error("[activity] failed to write entry:", error.message);
  }
}

export function listActivity({ search = "", action = "", userId = "", page = 1, perPage = 30 } = {}) {
  const where = [];
  const params = {};

  if (search) {
    where.push("(actor_name LIKE :q OR summary LIKE :q OR action LIKE :q OR entity_id LIKE :q)");
    params.q = `%${search}%`;
  }
  if (action) {
    where.push("action = :action");
    params.action = action;
  }
  if (userId) {
    where.push("user_id = :userId");
    params.userId = userId;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = db.prepare(`SELECT COUNT(*) AS n FROM activity_log ${whereSql}`).get(params).n;

  const limit = Math.min(Math.max(Number(perPage) || 30, 1), 200);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const rows = db
    .prepare(
      `SELECT * FROM activity_log ${whereSql} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    )
    .all(params)
    .map(mapActivity);

  return { rows, total, page: Math.max(Number(page) || 1, 1), perPage: limit };
}

export function distinctActions() {
  return db
    .prepare("SELECT action, COUNT(*) AS n FROM activity_log GROUP BY action ORDER BY n DESC")
    .all()
    .map((row) => ({ value: row.action, count: row.n }));
}

export function recentActivity(limit = 12) {
  return db
    .prepare("SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?")
    .all(limit)
    .map(mapActivity);
}
