import { db, fromJson, newId, nowIso } from "./client.js";

/* -------------------------------------------------------------------------- */
/* mapping                                                                    */
/* -------------------------------------------------------------------------- */

/** Shape returned to the application. `passwordHash` is deliberately omitted. */
export function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    headline: row.headline || "",
    phone: row.phone || "",
    location: row.location || "",
    website: row.website || "",
    bio: row.bio || "",
    avatarTone: row.avatar_tone ?? 0,
    lastLoginAt: row.last_login_at || null,
    loginCount: row.login_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUserWithSecret(row) {
  if (!row) return null;
  return { ...mapUser(row), passwordHash: row.password_hash };
}

/* -------------------------------------------------------------------------- */
/* reads                                                                      */
/* -------------------------------------------------------------------------- */

export function findUserById(id) {
  return mapUser(db.prepare("SELECT * FROM users WHERE id = ?").get(id));
}

export function findUserByEmail(email) {
  const row = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(String(email || "").trim().toLowerCase());
  return mapUser(row);
}

/** Only for the login flow — includes the password hash. */
export function findUserCredentials(email) {
  const row = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(String(email || "").trim().toLowerCase());
  return mapUserWithSecret(row);
}

export function findUserCredentialsById(id) {
  return mapUserWithSecret(db.prepare("SELECT * FROM users WHERE id = ?").get(id));
}

export function countUsers() {
  return db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
}

/**
 * Admin listing with search, role/status filters, sorting and pagination.
 * Returns rows enriched with per-user counts so the table needs one query.
 */
export function listUsers({
  search = "",
  role = "",
  status = "",
  sort = "newest",
  page = 1,
  perPage = 20,
} = {}) {
  const where = [];
  const params = {};

  if (search) {
    where.push("(u.name LIKE :q OR u.email LIKE :q OR u.location LIKE :q OR u.headline LIKE :q)");
    params.q = `%${search}%`;
  }
  if (role) {
    where.push("u.role = :role");
    params.role = role;
  }
  if (status) {
    where.push("u.status = :status");
    params.status = status;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const orderSql =
    {
      newest: "u.created_at DESC",
      oldest: "u.created_at ASC",
      name: "u.name COLLATE NOCASE ASC",
      active: "COALESCE(u.last_login_at, '') DESC",
      applications: "application_count DESC",
    }[sort] || "u.created_at DESC";

  const total = db
    .prepare(`SELECT COUNT(*) AS n FROM users u ${whereSql}`)
    .get(params).n;

  const limit = Math.min(Math.max(Number(perPage) || 20, 1), 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const rows = db
    .prepare(
      `SELECT u.*,
              (SELECT COUNT(*) FROM applications a WHERE a.user_id = u.id) AS application_count,
              (SELECT COUNT(*) FROM resumes r WHERE r.user_id = u.id)      AS resume_count,
              (SELECT COUNT(*) FROM saved_jobs s WHERE s.user_id = u.id)   AS saved_count,
              (SELECT MAX(r.ats_score) FROM resumes r WHERE r.user_id = u.id) AS best_ats_score
         FROM users u
         ${whereSql}
        ORDER BY ${orderSql}
        LIMIT ${limit} OFFSET ${offset}`,
    )
    .all(params)
    .map((row) => ({
      ...mapUser(row),
      applicationCount: row.application_count,
      resumeCount: row.resume_count,
      savedCount: row.saved_count,
      bestAtsScore: row.best_ats_score ?? 0,
    }));

  return { rows, total, page: Math.max(Number(page) || 1, 1), perPage: limit };
}

/** Everything the admin user-detail page needs, in one call. */
export function getUserDossier(id) {
  const user = findUserById(id);
  if (!user) return null;

  const resumes = db
    .prepare("SELECT * FROM resumes WHERE user_id = ? ORDER BY is_primary DESC, updated_at DESC")
    .all(id)
    .map((row) => ({
      id: row.id,
      title: row.title,
      fullName: row.full_name,
      headline: row.headline,
      atsScore: row.ats_score,
      skills: fromJson(row.skills),
      source: row.source,
      isPrimary: Boolean(row.is_primary),
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    }));

  const applications = db
    .prepare(
      `SELECT a.*, j.title AS job_title, j.company AS job_company, j.location AS job_location
         FROM applications a
         JOIN jobs j ON j.id = a.job_id
        WHERE a.user_id = ?
        ORDER BY a.created_at DESC`,
    )
    .all(id)
    .map((row) => ({
      id: row.id,
      jobId: row.job_id,
      jobTitle: row.job_title,
      jobCompany: row.job_company,
      jobLocation: row.job_location,
      status: row.status,
      matchScore: row.match_score,
      atsScore: row.ats_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

  const savedJobs = db
    .prepare(
      `SELECT s.created_at, j.id, j.title, j.company
         FROM saved_jobs s JOIN jobs j ON j.id = s.job_id
        WHERE s.user_id = ? ORDER BY s.created_at DESC`,
    )
    .all(id)
    .map((row) => ({
      id: row.id,
      title: row.title,
      company: row.company,
      savedAt: row.created_at,
    }));

  const sessions = db
    .prepare("SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20")
    .all(id)
    .map((row) => ({
      id: row.id,
      ip: row.ip,
      device: row.device,
      userAgent: row.user_agent,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
      active: !row.revoked_at && new Date(row.expires_at) > new Date(),
    }));

  const activity = db
    .prepare("SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 40")
    .all(id)
    .map((row) => ({
      id: row.id,
      action: row.action,
      entity: row.entity,
      entityId: row.entity_id,
      summary: row.summary,
      ip: row.ip,
      createdAt: row.created_at,
    }));

  return { user, resumes, applications, savedJobs, sessions, activity };
}

/* -------------------------------------------------------------------------- */
/* writes                                                                     */
/* -------------------------------------------------------------------------- */

export function createUser({
  name,
  email,
  passwordHash,
  role = "USER",
  headline = "",
  location = "",
  phone = "",
}) {
  const id = newId("usr");
  const ts = nowIso();
  db.prepare(
    `INSERT INTO users
       (id, name, email, password_hash, role, status, headline, phone, location,
        website, bio, avatar_tone, login_count, created_at, updated_at)
     VALUES
       (@id, @name, @email, @passwordHash, @role, 'ACTIVE', @headline, @phone, @location,
        '', '', @avatarTone, 0, @ts, @ts)`,
  ).run({
    id,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    role,
    headline,
    phone,
    location,
    avatarTone: Math.floor(Math.random() * 6),
    ts,
  });
  return findUserById(id);
}

const PROFILE_FIELDS = {
  name: "name",
  headline: "headline",
  phone: "phone",
  location: "location",
  website: "website",
  bio: "bio",
};

export function updateUserProfile(id, patch = {}) {
  const sets = [];
  const params = { id, ts: nowIso() };

  for (const [key, column] of Object.entries(PROFILE_FIELDS)) {
    if (patch[key] !== undefined) {
      sets.push(`${column} = @${key}`);
      params[key] = patch[key];
    }
  }
  if (!sets.length) return findUserById(id);

  db.prepare(`UPDATE users SET ${sets.join(", ")}, updated_at = @ts WHERE id = @id`).run(params);
  return findUserById(id);
}

export function updateUserAdminFields(id, { role, status } = {}) {
  const sets = [];
  const params = { id, ts: nowIso() };
  if (role) {
    sets.push("role = @role");
    params.role = role;
  }
  if (status) {
    sets.push("status = @status");
    params.status = status;
  }
  if (!sets.length) return findUserById(id);

  db.prepare(`UPDATE users SET ${sets.join(", ")}, updated_at = @ts WHERE id = @id`).run(params);
  return findUserById(id);
}

export function updateUserPassword(id, passwordHash) {
  db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
    passwordHash,
    nowIso(),
    id,
  );
}

export function recordLogin(id) {
  const ts = nowIso();
  db.prepare(
    "UPDATE users SET last_login_at = ?, login_count = login_count + 1, updated_at = ? WHERE id = ?",
  ).run(ts, ts, id);
}

export function deleteUser(id) {
  return db.prepare("DELETE FROM users WHERE id = ?").run(id).changes > 0;
}

export function countAdmins() {
  return db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'ADMIN'").get().n;
}
