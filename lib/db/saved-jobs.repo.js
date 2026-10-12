import { db, newId, nowIso } from "./client.js";
import { mapJob } from "./jobs.repo.js";

export function listSavedJobs(userId) {
  return db
    .prepare(
      `SELECT j.*, s.created_at AS saved_at
         FROM saved_jobs s
         JOIN jobs j ON j.id = s.job_id
        WHERE s.user_id = ?
        ORDER BY s.created_at DESC`,
    )
    .all(userId)
    .map((row) => ({ ...mapJob(row), savedAt: row.saved_at }));
}

export function savedJobIds(userId) {
  return db
    .prepare("SELECT job_id FROM saved_jobs WHERE user_id = ?")
    .all(userId)
    .map((row) => row.job_id);
}

export function isJobSaved(userId, jobId) {
  return Boolean(
    db.prepare("SELECT id FROM saved_jobs WHERE user_id = ? AND job_id = ?").get(userId, jobId),
  );
}

export function saveJob(userId, jobId) {
  db.prepare(
    `INSERT INTO saved_jobs (id, user_id, job_id, created_at)
     VALUES (@id, @userId, @jobId, @ts)
     ON CONFLICT (user_id, job_id) DO NOTHING`,
  ).run({ id: newId("sav"), userId, jobId, ts: nowIso() });
  return true;
}

export function unsaveJob(userId, jobId) {
  return (
    db.prepare("DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?").run(userId, jobId)
      .changes > 0
  );
}

export function countSavedJobs(userId) {
  return db.prepare("SELECT COUNT(*) AS n FROM saved_jobs WHERE user_id = ?").get(userId).n;
}
