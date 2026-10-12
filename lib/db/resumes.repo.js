import { db, fromJson, newId, nowIso, toJson } from "./client.js";

export function mapResume(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    fullName: row.full_name,
    headline: row.headline || "",
    email: row.email || "",
    phone: row.phone || "",
    location: row.location || "",
    website: row.website || "",
    summary: row.summary || "",
    skills: fromJson(row.skills, []),
    experience: fromJson(row.experience, []),
    education: fromJson(row.education, []),
    projects: fromJson(row.projects, []),
    languages: fromJson(row.languages, []),
    certifications: fromJson(row.certifications, []),
    atsScore: row.ats_score ?? 0,
    atsReport: fromJson(row.ats_report, null),
    source: row.source,
    sourceFile: row.source_file || null,
    isPrimary: Boolean(row.is_primary),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** The empty document a new user starts from. No placeholder persona. */
export function blankResume(user) {
  return {
    title: "My CV",
    fullName: user?.name || "",
    headline: user?.headline || "",
    email: user?.email || "",
    phone: user?.phone || "",
    location: user?.location || "",
    website: user?.website || "",
    summary: "",
    skills: [],
    experience: [],
    education: [],
    projects: [],
    languages: [],
    certifications: [],
  };
}

export function listResumes(userId) {
  return db
    .prepare("SELECT * FROM resumes WHERE user_id = ? ORDER BY is_primary DESC, updated_at DESC")
    .all(userId)
    .map(mapResume);
}

export function findResume(id, userId) {
  const row = userId
    ? db.prepare("SELECT * FROM resumes WHERE id = ? AND user_id = ?").get(id, userId)
    : db.prepare("SELECT * FROM resumes WHERE id = ?").get(id);
  return mapResume(row);
}

export function findPrimaryResume(userId) {
  const row =
    db
      .prepare("SELECT * FROM resumes WHERE user_id = ? AND is_primary = 1")
      .get(userId) ||
    db
      .prepare("SELECT * FROM resumes WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1")
      .get(userId);
  return mapResume(row);
}

export function countResumes(userId) {
  if (userId) {
    return db.prepare("SELECT COUNT(*) AS n FROM resumes WHERE user_id = ?").get(userId).n;
  }
  return db.prepare("SELECT COUNT(*) AS n FROM resumes").get().n;
}

export function createResume(userId, data = {}, { atsScore = 0, atsReport = null } = {}) {
  const id = newId("cv");
  const ts = nowIso();
  const existing = countResumes(userId);

  db.prepare(
    `INSERT INTO resumes
       (id, user_id, title, full_name, headline, email, phone, location, website, summary,
        skills, experience, education, projects, languages, certifications,
        ats_score, ats_report, source, source_file, is_primary, created_at, updated_at)
     VALUES
       (@id, @userId, @title, @fullName, @headline, @email, @phone, @location, @website, @summary,
        @skills, @experience, @education, @projects, @languages, @certifications,
        @atsScore, @atsReport, @source, @sourceFile, @isPrimary, @ts, @ts)`,
  ).run({
    id,
    userId,
    title: data.title || "My CV",
    fullName: data.fullName || "",
    headline: data.headline || "",
    email: data.email || "",
    phone: data.phone || "",
    location: data.location || "",
    website: data.website || "",
    summary: data.summary || "",
    skills: toJson(data.skills, []),
    experience: toJson(data.experience, []),
    education: toJson(data.education, []),
    projects: toJson(data.projects, []),
    languages: toJson(data.languages, []),
    certifications: toJson(data.certifications, []),
    atsScore,
    atsReport: atsReport ? JSON.stringify(atsReport) : null,
    source: data.source || "builder",
    sourceFile: data.sourceFile || null,
    isPrimary: existing === 0 ? 1 : 0,
    ts,
  });

  return findResume(id, userId);
}

const RESUME_COLUMNS = {
  title: "title",
  fullName: "full_name",
  headline: "headline",
  email: "email",
  phone: "phone",
  location: "location",
  website: "website",
  summary: "summary",
};

const RESUME_JSON_COLUMNS = {
  skills: "skills",
  experience: "experience",
  education: "education",
  projects: "projects",
  languages: "languages",
  certifications: "certifications",
};

export function updateResume(id, userId, patch = {}, { atsScore, atsReport } = {}) {
  const sets = [];
  const params = { id, userId, ts: nowIso() };

  for (const [key, column] of Object.entries(RESUME_COLUMNS)) {
    if (patch[key] !== undefined) {
      sets.push(`${column} = @${key}`);
      params[key] = patch[key] ?? "";
    }
  }
  for (const [key, column] of Object.entries(RESUME_JSON_COLUMNS)) {
    if (patch[key] !== undefined) {
      sets.push(`${column} = @${key}`);
      params[key] = toJson(patch[key], []);
    }
  }
  if (atsScore !== undefined) {
    sets.push("ats_score = @atsScore");
    params.atsScore = atsScore;
  }
  if (atsReport !== undefined) {
    sets.push("ats_report = @atsReport");
    params.atsReport = atsReport ? JSON.stringify(atsReport) : null;
  }

  if (!sets.length) return findResume(id, userId);

  db.prepare(
    `UPDATE resumes SET ${sets.join(", ")}, updated_at = @ts WHERE id = @id AND user_id = @userId`,
  ).run(params);

  return findResume(id, userId);
}

export function setPrimaryResume(id, userId) {
  const owned = db
    .prepare("SELECT id FROM resumes WHERE id = ? AND user_id = ?")
    .get(id, userId);
  if (!owned) return null;

  const run = db.transaction(() => {
    db.prepare("UPDATE resumes SET is_primary = 0 WHERE user_id = ?").run(userId);
    db.prepare("UPDATE resumes SET is_primary = 1, updated_at = ? WHERE id = ?").run(
      nowIso(),
      id,
    );
  });
  run();

  return findResume(id, userId);
}

export function deleteResume(id, userId) {
  const resume = findResume(id, userId);
  if (!resume) return false;

  const run = db.transaction(() => {
    db.prepare("DELETE FROM resumes WHERE id = ? AND user_id = ?").run(id, userId);
    if (resume.isPrimary) {
      const next = db
        .prepare("SELECT id FROM resumes WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1")
        .get(userId);
      if (next) {
        db.prepare("UPDATE resumes SET is_primary = 1 WHERE id = ?").run(next.id);
      }
    }
  });
  run();

  return true;
}

export function averageAtsScore() {
  const row = db
    .prepare("SELECT AVG(ats_score) AS avg FROM resumes WHERE ats_score > 0")
    .get();
  return row?.avg ? Math.round(row.avg) : 0;
}
