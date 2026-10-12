import { db, fromJson, newId, nowIso } from "./client.js";
import { mapJob } from "./jobs.repo.js";

export function mapApplication(row) {
  if (!row) return null;
  return {
    id: row.id,
    jobId: row.job_id,
    userId: row.user_id,
    resumeId: row.resume_id || null,
    resumeSnapshot: fromJson(row.resume_snapshot, null),
    coverLetter: row.cover_letter || "",
    matchScore: row.match_score ?? 0,
    atsScore: row.ats_score ?? 0,
    status: row.status,
    note: row.note || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedAt: row.reviewed_at || null,
    job: row.job_title
      ? {
          id: row.job_id,
          title: row.job_title,
          company: row.job_company,
          location: row.job_location,
          workMode: row.job_work_mode,
          employmentType: row.job_employment_type,
          tags: fromJson(row.job_tags, []),
          salaryMin: row.job_salary_min ?? null,
          salaryMax: row.job_salary_max ?? null,
          salaryCurrency: row.job_salary_currency || "USD",
          status: row.job_status,
        }
      : undefined,
    user: row.user_name
      ? {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email,
          location: row.user_location,
          headline: row.user_headline,
          avatarTone: row.user_avatar_tone ?? 0,
        }
      : undefined,
  };
}

const JOIN_SELECT = `
  a.*,
  j.title           AS job_title,
  j.company         AS job_company,
  j.location        AS job_location,
  j.work_mode       AS job_work_mode,
  j.employment_type AS job_employment_type,
  j.tags            AS job_tags,
  j.salary_min      AS job_salary_min,
  j.salary_max      AS job_salary_max,
  j.salary_currency AS job_salary_currency,
  j.status          AS job_status,
  u.name            AS user_name,
  u.email           AS user_email,
  u.location        AS user_location,
  u.headline        AS user_headline,
  u.avatar_tone     AS user_avatar_tone
`;

/* -------------------------------------------------------------------------- */
/* reads                                                                      */
/* -------------------------------------------------------------------------- */

export function listApplications({
  userId = "",
  jobId = "",
  status = "",
  search = "",
  sort = "newest",
  page = 1,
  perPage = 20,
} = {}) {
  const where = [];
  const params = {};

  if (userId) {
    where.push("a.user_id = :userId");
    params.userId = userId;
  }
  if (jobId) {
    where.push("a.job_id = :jobId");
    params.jobId = jobId;
  }
  if (status) {
    where.push("a.status = :status");
    params.status = status;
  }
  if (search) {
    where.push("(u.name LIKE :q OR u.email LIKE :q OR j.title LIKE :q OR j.company LIKE :q)");
    params.q = `%${search}%`;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const orderSql =
    {
      newest: "a.created_at DESC",
      oldest: "a.created_at ASC",
      match: "a.match_score DESC",
      status: "a.status ASC, a.created_at DESC",
    }[sort] || "a.created_at DESC";

  const total = db
    .prepare(
      `SELECT COUNT(*) AS n
         FROM applications a
         JOIN jobs j ON j.id = a.job_id
         JOIN users u ON u.id = a.user_id
         ${whereSql}`,
    )
    .get(params).n;

  const limit = Math.min(Math.max(Number(perPage) || 20, 1), 200);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const rows = db
    .prepare(
      `SELECT ${JOIN_SELECT}
         FROM applications a
         JOIN jobs j ON j.id = a.job_id
         JOIN users u ON u.id = a.user_id
         ${whereSql}
        ORDER BY ${orderSql}
        LIMIT ${limit} OFFSET ${offset}`,
    )
    .all(params)
    .map(mapApplication);

  return { rows, total, page: Math.max(Number(page) || 1, 1), perPage: limit };
}

export function findApplication(id, userId) {
  const sql = `SELECT ${JOIN_SELECT}
                 FROM applications a
                 JOIN jobs j ON j.id = a.job_id
                 JOIN users u ON u.id = a.user_id
                WHERE a.id = ?${userId ? " AND a.user_id = ?" : ""}`;
  const row = userId ? db.prepare(sql).get(id, userId) : db.prepare(sql).get(id);
  return mapApplication(row);
}

export function findUserApplicationForJob(userId, jobId) {
  return mapApplication(
    db
      .prepare("SELECT * FROM applications WHERE user_id = ? AND job_id = ?")
      .get(userId, jobId),
  );
}

/** Map of jobId -> application status for the current user (list badges). */
export function applicationStatusByJob(userId) {
  const rows = db
    .prepare("SELECT job_id, status FROM applications WHERE user_id = ?")
    .all(userId);
  return Object.fromEntries(rows.map((row) => [row.job_id, row.status]));
}

export function countApplications({ userId = "", status = "" } = {}) {
  const where = [];
  const params = {};
  if (userId) {
    where.push("user_id = :userId");
    params.userId = userId;
  }
  if (status) {
    where.push("status = :status");
    params.status = status;
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return db.prepare(`SELECT COUNT(*) AS n FROM applications ${whereSql}`).get(params).n;
}

export function applicationsByStatus() {
  return db
    .prepare("SELECT status, COUNT(*) AS n FROM applications GROUP BY status")
    .all()
    .reduce((acc, row) => ({ ...acc, [row.status]: row.n }), {});
}

export function listApplicationEvents(applicationId) {
  return db
    .prepare(
      "SELECT * FROM application_events WHERE application_id = ? ORDER BY created_at ASC",
    )
    .all(applicationId)
    .map((row) => ({
      id: row.id,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      actorId: row.actor_id,
      actorName: row.actor_name,
      note: row.note,
      createdAt: row.created_at,
    }));
}

/** Recent applications for the dashboard, with their job attached. */
export function recentApplications(userId, limit = 5) {
  return db
    .prepare(
      `SELECT ${JOIN_SELECT}
         FROM applications a
         JOIN jobs j ON j.id = a.job_id
         JOIN users u ON u.id = a.user_id
        WHERE a.user_id = ?
        ORDER BY a.created_at DESC
        LIMIT ?`,
    )
    .all(userId, limit)
    .map(mapApplication);
}

/* -------------------------------------------------------------------------- */
/* writes                                                                     */
/* -------------------------------------------------------------------------- */

export function createApplication({
  jobId,
  userId,
  resumeId = null,
  resumeSnapshot = null,
  coverLetter = "",
  matchScore = 0,
  atsScore = 0,
  actorName = "",
}) {
  const id = newId("app");
  const ts = nowIso();

  const run = db.transaction(() => {
    db.prepare(
      `INSERT INTO applications
         (id, job_id, user_id, resume_id, resume_snapshot, cover_letter,
          match_score, ats_score, status, note, created_at, updated_at)
       VALUES
         (@id, @jobId, @userId, @resumeId, @resumeSnapshot, @coverLetter,
          @matchScore, @atsScore, 'SUBMITTED', '', @ts, @ts)`,
    ).run({
      id,
      jobId,
      userId,
      resumeId,
      resumeSnapshot: resumeSnapshot ? JSON.stringify(resumeSnapshot) : null,
      coverLetter,
      matchScore,
      atsScore,
      ts,
    });

    db.prepare(
      `INSERT INTO application_events
         (id, application_id, from_status, to_status, actor_id, actor_name, note, created_at)
       VALUES (@id, @applicationId, NULL, 'SUBMITTED', @actorId, @actorName, 'Application sent', @ts)`,
    ).run({
      id: newId("evt"),
      applicationId: id,
      actorId: userId,
      actorName,
      ts,
    });
  });
  run();

  return findApplication(id);
}

export function updateApplicationStatus(id, status, { actorId = null, actorName = "", note = "" } = {}) {
  const current = db.prepare("SELECT status FROM applications WHERE id = ?").get(id);
  if (!current) return null;

  const ts = nowIso();
  const run = db.transaction(() => {
    db.prepare(
      `UPDATE applications
          SET status = @status,
              note = CASE WHEN @note != '' THEN @note ELSE note END,
              updated_at = @ts,
              reviewed_at = CASE WHEN @status != 'SUBMITTED' THEN @ts ELSE reviewed_at END
        WHERE id = @id`,
    ).run({ id, status, note, ts });

    db.prepare(
      `INSERT INTO application_events
         (id, application_id, from_status, to_status, actor_id, actor_name, note, created_at)
       VALUES (@id, @applicationId, @fromStatus, @toStatus, @actorId, @actorName, @note, @ts)`,
    ).run({
      id: newId("evt"),
      applicationId: id,
      fromStatus: current.status,
      toStatus: status,
      actorId,
      actorName,
      note,
      ts,
    });
  });
  run();

  return findApplication(id);
}

export function deleteApplication(id) {
  return db.prepare("DELETE FROM applications WHERE id = ?").run(id).changes > 0;
}
