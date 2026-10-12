import { db, fromJson, newId, nowIso, toJson } from "./client.js";

export function mapJob(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    location: row.location,
    workMode: row.work_mode,
    employmentType: row.employment_type,
    seniority: row.seniority,
    salaryMin: row.salary_min ?? null,
    salaryMax: row.salary_max ?? null,
    salaryCurrency: row.salary_currency || "USD",
    description: row.description,
    requirements: fromJson(row.requirements, []),
    benefits: fromJson(row.benefits, []),
    tags: fromJson(row.tags, []),
    status: row.status,
    views: row.views ?? 0,
    externalUrl: row.external_url || null,
    postedBy: row.posted_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    applicationCount: row.application_count ?? undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* reads                                                                      */
/* -------------------------------------------------------------------------- */

export function listJobs({
  search = "",
  location = "",
  workMode = "",
  employmentType = "",
  seniority = "",
  tag = "",
  status = "OPEN",
  sort = "newest",
  page = 1,
  perPage = 12,
  withCounts = false,
} = {}) {
  const where = [];
  const params = {};

  if (status) {
    where.push("j.status = :status");
    params.status = status;
  }
  if (search) {
    where.push(
      "(j.title LIKE :q OR j.company LIKE :q OR j.description LIKE :q OR j.tags LIKE :q)",
    );
    params.q = `%${search}%`;
  }
  if (location) {
    where.push("j.location LIKE :loc");
    params.loc = `%${location}%`;
  }
  if (workMode) {
    where.push("j.work_mode = :workMode");
    params.workMode = workMode;
  }
  if (employmentType) {
    where.push("j.employment_type = :employmentType");
    params.employmentType = employmentType;
  }
  if (seniority) {
    where.push("j.seniority = :seniority");
    params.seniority = seniority;
  }
  if (tag) {
    where.push("j.tags LIKE :tag");
    params.tag = `%"${tag}"%`;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const orderSql =
    {
      newest: "j.created_at DESC",
      oldest: "j.created_at ASC",
      salary: "COALESCE(j.salary_max, j.salary_min, 0) DESC",
      company: "j.company COLLATE NOCASE ASC",
      popular: "j.views DESC",
    }[sort] || "j.created_at DESC";

  const total = db.prepare(`SELECT COUNT(*) AS n FROM jobs j ${whereSql}`).get(params).n;

  const limit = Math.min(Math.max(Number(perPage) || 12, 1), 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const countsSql = withCounts
    ? ", (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS application_count"
    : "";

  const rows = db
    .prepare(
      `SELECT j.*${countsSql}
         FROM jobs j
         ${whereSql}
        ORDER BY ${orderSql}
        LIMIT ${limit} OFFSET ${offset}`,
    )
    .all(params)
    .map(mapJob);

  return { rows, total, page: Math.max(Number(page) || 1, 1), perPage: limit };
}

export function findJob(id) {
  return mapJob(db.prepare("SELECT * FROM jobs WHERE id = ?").get(id));
}

export function findJobWithCounts(id) {
  const row = db
    .prepare(
      `SELECT j.*, (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS application_count
         FROM jobs j WHERE j.id = ?`,
    )
    .get(id);
  return mapJob(row);
}

export function countJobs(status) {
  if (status) {
    return db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE status = ?").get(status).n;
  }
  return db.prepare("SELECT COUNT(*) AS n FROM jobs").get().n;
}

/** Distinct values used to populate the filter menus. */
export function jobFacets() {
  const locations = db
    .prepare(
      "SELECT location, COUNT(*) AS n FROM jobs WHERE status = 'OPEN' GROUP BY location ORDER BY n DESC LIMIT 12",
    )
    .all()
    .map((row) => ({ value: row.location, count: row.n }));

  const tagRows = db.prepare("SELECT tags FROM jobs WHERE status = 'OPEN'").all();
  const tally = new Map();
  for (const row of tagRows) {
    for (const tag of fromJson(row.tags, [])) {
      tally.set(tag, (tally.get(tag) || 0) + 1);
    }
  }
  const tags = [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([value, count]) => ({ value, count }));

  const companies = db
    .prepare("SELECT COUNT(DISTINCT company) AS n FROM jobs WHERE status = 'OPEN'")
    .get().n;

  return { locations, tags, companies };
}

export function incrementJobViews(id) {
  db.prepare("UPDATE jobs SET views = views + 1 WHERE id = ?").run(id);
}

/* -------------------------------------------------------------------------- */
/* writes                                                                     */
/* -------------------------------------------------------------------------- */

export function createJob(data, postedBy = null) {
  const id = newId("job");
  const ts = nowIso();

  db.prepare(
    `INSERT INTO jobs
       (id, title, company, location, work_mode, employment_type, seniority,
        salary_min, salary_max, salary_currency, description, requirements, benefits,
        tags, status, views, external_url, posted_by, created_at, updated_at)
     VALUES
       (@id, @title, @company, @location, @workMode, @employmentType, @seniority,
        @salaryMin, @salaryMax, @salaryCurrency, @description, @requirements, @benefits,
        @tags, @status, 0, @externalUrl, @postedBy, @ts, @ts)`,
  ).run({
    id,
    title: data.title,
    company: data.company,
    location: data.location,
    workMode: data.workMode || "ONSITE",
    employmentType: data.employmentType || "FULL_TIME",
    seniority: data.seniority || "MID",
    salaryMin: data.salaryMin ?? null,
    salaryMax: data.salaryMax ?? null,
    salaryCurrency: data.salaryCurrency || "USD",
    description: data.description,
    requirements: toJson(data.requirements, []),
    benefits: toJson(data.benefits, []),
    tags: toJson(data.tags, []),
    status: data.status || "OPEN",
    externalUrl: data.externalUrl || null,
    postedBy,
    ts,
  });

  return findJob(id);
}

const JOB_COLUMNS = {
  title: "title",
  company: "company",
  location: "location",
  workMode: "work_mode",
  employmentType: "employment_type",
  seniority: "seniority",
  salaryMin: "salary_min",
  salaryMax: "salary_max",
  salaryCurrency: "salary_currency",
  description: "description",
  status: "status",
  externalUrl: "external_url",
};

const JOB_JSON_COLUMNS = {
  requirements: "requirements",
  benefits: "benefits",
  tags: "tags",
};

export function updateJob(id, patch = {}) {
  const sets = [];
  const params = { id, ts: nowIso() };

  for (const [key, column] of Object.entries(JOB_COLUMNS)) {
    if (patch[key] !== undefined) {
      sets.push(`${column} = @${key}`);
      params[key] = patch[key];
    }
  }
  for (const [key, column] of Object.entries(JOB_JSON_COLUMNS)) {
    if (patch[key] !== undefined) {
      sets.push(`${column} = @${key}`);
      params[key] = toJson(patch[key], []);
    }
  }
  if (!sets.length) return findJob(id);

  db.prepare(`UPDATE jobs SET ${sets.join(", ")}, updated_at = @ts WHERE id = @id`).run(params);
  return findJob(id);
}

export function deleteJob(id) {
  return db.prepare("DELETE FROM jobs WHERE id = ?").run(id).changes > 0;
}

export function topJobsByApplications(limit = 5) {
  return db
    .prepare(
      `SELECT j.id, j.title, j.company, j.status,
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS application_count,
              j.views
         FROM jobs j
        ORDER BY application_count DESC, j.views DESC
        LIMIT ?`,
    )
    .all(limit)
    .map((row) => ({
      id: row.id,
      title: row.title,
      company: row.company,
      status: row.status,
      applicationCount: row.application_count,
      views: row.views,
    }));
}
