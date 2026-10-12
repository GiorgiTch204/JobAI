import { db, nowIso } from "./client.js";

/** Counts for the admin overview tiles. */
export function platformTotals() {
  const one = (sql, ...params) => db.prepare(sql).get(...params).n;

  return {
    users: one("SELECT COUNT(*) AS n FROM users"),
    admins: one("SELECT COUNT(*) AS n FROM users WHERE role = 'ADMIN'"),
    suspended: one("SELECT COUNT(*) AS n FROM users WHERE status = 'SUSPENDED'"),
    jobs: one("SELECT COUNT(*) AS n FROM jobs"),
    openJobs: one("SELECT COUNT(*) AS n FROM jobs WHERE status = 'OPEN'"),
    applications: one("SELECT COUNT(*) AS n FROM applications"),
    resumes: one("SELECT COUNT(*) AS n FROM resumes"),
    savedJobs: one("SELECT COUNT(*) AS n FROM saved_jobs"),
    activeSessions: one(
      "SELECT COUNT(*) AS n FROM sessions WHERE revoked_at IS NULL AND expires_at > ?",
      nowIso(),
    ),
    jobViews: db.prepare("SELECT COALESCE(SUM(views), 0) AS n FROM jobs").get().n,
    avgAtsScore:
      Math.round(
        db.prepare("SELECT COALESCE(AVG(ats_score), 0) AS n FROM resumes WHERE ats_score > 0").get()
          .n,
      ) || 0,
    avgMatchScore:
      Math.round(
        db
          .prepare("SELECT COALESCE(AVG(match_score), 0) AS n FROM applications WHERE match_score > 0")
          .get().n,
      ) || 0,
  };
}

/** Counts created in the last `days` days, for the "new this week" deltas. */
export function recentCounts(days = 7) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const one = (sql) => db.prepare(sql).get(since).n;
  return {
    users: one("SELECT COUNT(*) AS n FROM users WHERE created_at >= ?"),
    jobs: one("SELECT COUNT(*) AS n FROM jobs WHERE created_at >= ?"),
    applications: one("SELECT COUNT(*) AS n FROM applications WHERE created_at >= ?"),
    logins: one("SELECT COUNT(*) AS n FROM activity_log WHERE action = 'user.login' AND created_at >= ?"),
  };
}

/**
 * Daily signup / application counts for the last `days` days.
 * Gaps are filled with zeroes so the chart has a continuous axis.
 */
export function dailySeries(days = 14) {
  const since = new Date(Date.now() - (days - 1) * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const bucket = (table) =>
    db
      .prepare(
        `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n
           FROM ${table}
          WHERE created_at >= ?
          GROUP BY day`,
      )
      .all(sinceIso)
      .reduce((acc, row) => ({ ...acc, [row.day]: row.n }), {});

  const users = bucket("users");
  const applications = bucket("applications");

  const out = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(since.getTime() + i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    out.push({
      day: key,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      users: users[key] || 0,
      applications: applications[key] || 0,
    });
  }
  return out;
}

/** Most requested skills across all stored CVs — useful signal for admins. */
export function topSkills(limit = 12) {
  const rows = db.prepare("SELECT skills FROM resumes").all();
  const tally = new Map();
  for (const row of rows) {
    let list = [];
    try {
      list = JSON.parse(row.skills || "[]");
    } catch {
      list = [];
    }
    for (const skill of list) {
      const key = String(skill).trim();
      if (!key) continue;
      tally.set(key, (tally.get(key) || 0) + 1);
    }
  }
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([skill, count]) => ({ skill, count }));
}
