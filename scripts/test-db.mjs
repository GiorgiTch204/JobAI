/*
 * Repository + auth checks.
 *
 * Runs against its own database file, seeded fresh, so it never depends on or
 * disturbs the data you are working with.
 *
 *   node scripts/test-db.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { loadEnv } from "./load-env.mjs";

loadEnv();

const TEST_DB = path.join("data", "test.db");
process.env.DATABASE_FILE = TEST_DB;

for (const suffix of ["", "-shm", "-wal"]) {
  fs.rmSync(`${TEST_DB}${suffix}`, { force: true });
}

execFileSync(process.execPath, ["scripts/db-seed.mjs"], {
  env: { ...process.env, DATABASE_FILE: TEST_DB },
  stdio: "ignore",
});

process.on("exit", () => {
  for (const suffix of ["", "-shm", "-wal"]) {
    fs.rmSync(`${TEST_DB}${suffix}`, { force: true });
  }
});

const { listUsers, findUserByEmail, findUserCredentials, getUserDossier, updateUserProfile, countAdmins } =
  await import("../lib/db/users.repo.js");
const { listJobs, findJobWithCounts, jobFacets, topJobsByApplications, createJob, updateJob, deleteJob } =
  await import("../lib/db/jobs.repo.js");
const { listApplications, applicationStatusByJob, applicationsByStatus, listApplicationEvents, findUserApplicationForJob } =
  await import("../lib/db/applications.repo.js");
const { listResumes, findPrimaryResume, setPrimaryResume, createResume, deleteResume } =
  await import("../lib/db/resumes.repo.js");
const { listSavedJobs, saveJob, unsaveJob, isJobSaved } = await import("../lib/db/saved-jobs.repo.js");
const { platformTotals, dailySeries, topSkills, recentCounts } = await import("../lib/db/stats.repo.js");
const { listActivity, distinctActions } = await import("../lib/db/activity.repo.js");
const { createSession, isSessionValid, revokeSession, listUserSessions } = await import("../lib/db/sessions.repo.js");
const { verifyPassword } = await import("../lib/auth/password.js");
const { signSessionToken, verifySessionToken } = await import("../lib/auth/jwt.js");
const { checkLoginRate, recordLoginAttempt } = await import("../lib/rate-limit.js");
const { annotateJobsWithMatch } = await import("../lib/match.js");

let passed = 0;
const check = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (error) {
    console.error(`  FAIL ${name}\n       ${error.message}`);
    process.exitCode = 1;
  }
};

console.log("Users");
const demo = findUserByEmail("demo@jobai.dev");
await check("seeded member is found by email", () => {
  assert.ok(demo, "demo user missing");
  assert.equal(demo.role, "USER");
  assert.equal(demo.status, "ACTIVE");
  assert.equal(demo.passwordHash, undefined, "mapUser must not leak the hash");
});
await check("credentials lookup returns a verifiable hash", async () => {
  const creds = findUserCredentials("DEMO@jobai.dev");
  assert.ok(creds.passwordHash);
  assert.equal(await verifyPassword("Demo12345", creds.passwordHash), true);
  assert.equal(await verifyPassword("wrong-password", creds.passwordHash), false);
});
await check("admin exists exactly once", () => assert.equal(countAdmins(), 1));
await check("listUsers paginates and searches", () => {
  const all = listUsers({ perPage: 2 });
  assert.equal(all.rows.length, 2);
  assert.equal(all.total, 5);
  const found = listUsers({ search: "nino" });
  assert.equal(found.total, 1);
  assert.equal(found.rows[0].name, "Nino Beridze");
  assert.ok(found.rows[0].applicationCount >= 1, "counts should be attached");
  assert.equal(listUsers({ role: "ADMIN" }).total, 1);
});
await check("dossier returns every related record", () => {
  const dossier = getUserDossier(demo.id);
  assert.ok(dossier.user);
  assert.equal(dossier.resumes.length, 1);
  assert.ok(dossier.applications.length >= 3);
  assert.ok(dossier.sessions.length >= 1);
  assert.ok(dossier.activity.length >= 2);
  assert.ok(dossier.savedJobs.length >= 1);
});
await check("profile update persists and ignores unknown fields", () => {
  const before = findUserByEmail("demo@jobai.dev");
  const updated = updateUserProfile(demo.id, { headline: "Senior full-stack developer", role: "ADMIN" });
  assert.equal(updated.headline, "Senior full-stack developer");
  assert.equal(updated.role, "USER", "role must not be writable through the profile path");
  updateUserProfile(demo.id, { headline: before.headline });
});

console.log("Jobs");
await check("open jobs exclude the closed posting", () => {
  const open = listJobs({ perPage: 50 });
  assert.equal(open.total, 15);
  assert.ok(open.rows.every((job) => job.status === "OPEN"));
  assert.ok(Array.isArray(open.rows[0].tags), "tags must be parsed to an array");
});
await check("filters narrow results", () => {
  assert.ok(listJobs({ workMode: "REMOTE" }).total >= 3);
  assert.ok(listJobs({ seniority: "JUNIOR" }).total >= 3);
  assert.equal(listJobs({ employmentType: "INTERNSHIP" }).total, 1);
  assert.ok(listJobs({ search: "react" }).total >= 3);
  assert.ok(listJobs({ tag: "Next.js" }).total >= 3);
  assert.equal(listJobs({ search: "zzzzz" }).total, 0);
});
await check("sorting works", () => {
  const bySalary = listJobs({ sort: "salary", perPage: 3 }).rows;
  assert.ok((bySalary[0].salaryMax || 0) >= (bySalary[1].salaryMax || 0));
});
await check("facets list locations and tags", () => {
  const facets = jobFacets();
  assert.ok(facets.tags.length > 5);
  assert.ok(facets.locations.length > 2);
  assert.ok(facets.companies > 5);
});
await check("job detail carries an application count", () => {
  const top = topJobsByApplications(3);
  assert.ok(top[0].applicationCount >= 1);
  const job = findJobWithCounts(top[0].id);
  assert.equal(job.applicationCount, top[0].applicationCount);
});
await check("create, update and delete a job", () => {
  const job = createJob(
    { title: "Temp role", company: "Test", location: "Nowhere", description: "x".repeat(40), tags: ["A"] },
    demo.id,
  );
  assert.ok(job.id);
  const updated = updateJob(job.id, { title: "Temp role v2", tags: ["A", "B"] });
  assert.equal(updated.title, "Temp role v2");
  assert.deepEqual(updated.tags, ["A", "B"]);
  assert.equal(deleteJob(job.id), true);
  assert.equal(deleteJob(job.id), false);
});

console.log("Applications");
await check("admin listing joins user and job", () => {
  const list = listApplications({ perPage: 50 });
  assert.equal(list.total, 9);
  assert.ok(list.rows[0].job.title);
  assert.ok(list.rows[0].user.email);
});
await check("filter by status and user", () => {
  assert.ok(listApplications({ status: "INTERVIEW" }).total >= 1);
  assert.ok(listApplications({ userId: demo.id }).total >= 3);
  assert.ok(listApplications({ search: "bank" }).total >= 1);
});
await check("status map and tallies", () => {
  const map = applicationStatusByJob(demo.id);
  assert.ok(Object.keys(map).length >= 3);
  const tally = applicationsByStatus();
  assert.ok(tally.INTERVIEW >= 1 && tally.OFFER >= 1);
});
await check("timeline records the status change", () => {
  const interview = listApplications({ status: "INTERVIEW" }).rows[0];
  const events = listApplicationEvents(interview.id);
  assert.ok(events.length >= 2);
  assert.equal(events[0].toStatus, "SUBMITTED");
  assert.equal(events[events.length - 1].toStatus, "INTERVIEW");
});
await check("duplicate application is detectable", () => {
  const existing = listApplications({ userId: demo.id }).rows[0];
  assert.ok(findUserApplicationForJob(demo.id, existing.jobId));
  assert.equal(findUserApplicationForJob(demo.id, "job_does_not_exist"), null);
});

console.log("Résumés");
await check("primary résumé resolves and scores are stored", () => {
  const primary = findPrimaryResume(demo.id);
  assert.ok(primary.isPrimary);
  assert.ok(primary.atsScore > 50, `ats score was ${primary.atsScore}`);
  assert.ok(Array.isArray(primary.skills) && primary.skills.includes("React"));
  assert.ok(primary.atsReport?.checks?.length === 6);
});
await check("second résumé can take over as primary", () => {
  const extra = createResume(demo.id, { title: "Backend variant", fullName: "Luka Danelia", skills: ["Node.js"] });
  assert.equal(extra.isPrimary, false);
  setPrimaryResume(extra.id, demo.id);
  assert.equal(findPrimaryResume(demo.id).id, extra.id);
  assert.equal(listResumes(demo.id).length, 2);
  deleteResume(extra.id, demo.id);
  assert.equal(listResumes(demo.id).length, 1);
  assert.equal(findPrimaryResume(demo.id).isPrimary, true, "deleting the primary must promote another");
});
await check("a résumé cannot be read by another user", () => {
  const primary = findPrimaryResume(demo.id);
  const other = findUserByEmail("nino.beridze@example.com");
  const { findResume } = { findResume: null };
  assert.equal(listResumes(other.id).some((r) => r.id === primary.id), false);
});

console.log("Saved jobs");
await check("save, detect and unsave", () => {
  const job = listJobs({ perPage: 1 }).rows[0];
  const before = listSavedJobs(demo.id).length;
  saveJob(demo.id, job.id);
  saveJob(demo.id, job.id); // must not duplicate
  assert.equal(isJobSaved(demo.id, job.id), true);
  assert.equal(listSavedJobs(demo.id).length, before + 1);
  unsaveJob(demo.id, job.id);
  assert.equal(isJobSaved(demo.id, job.id), false);
});

console.log("Sessions and auth");
await check("session lifecycle", () => {
  const session = createSession({ userId: demo.id, ip: "1.2.3.4", userAgent: "test", device: "test" });
  assert.equal(isSessionValid(session.id), true);
  assert.equal(revokeSession(session.id), true);
  assert.equal(isSessionValid(session.id), false, "revoked session must stop working");
  assert.equal(isSessionValid("ses_nope"), false);
  assert.ok(listUserSessions(demo.id).length >= 2);
});
await check("JWT round trip", async () => {
  process.env.AUTH_SECRET = process.env.AUTH_SECRET || "x".repeat(40);
  const token = await signSessionToken({
    userId: demo.id, sessionId: "ses_test", email: demo.email, name: demo.name, role: "USER",
  });
  const claims = await verifySessionToken(token);
  assert.equal(claims.userId, demo.id);
  assert.equal(claims.sessionId, "ses_test");
  assert.equal(claims.role, "USER");
  assert.equal(await verifySessionToken(`${token}tampered`), null);
  assert.equal(await verifySessionToken("not-a-jwt"), null);
  assert.equal(await verifySessionToken(""), null);
});
await check("login throttle counts failures and clears on success", () => {
  const key = { email: "throttle@test.dev", ip: "9.9.9.9" };
  for (let i = 0; i < 8; i += 1) recordLoginAttempt({ ...key, success: false });
  assert.equal(checkLoginRate(key).limited, true);
  recordLoginAttempt({ ...key, success: true });
  assert.equal(checkLoginRate(key).limited, false);
});

console.log("Stats");
await check("platform totals are coherent", () => {
  const totals = platformTotals();
  assert.equal(totals.users, 5);
  assert.equal(totals.openJobs, 15);
  assert.equal(totals.applications, 9);
  assert.ok(totals.avgAtsScore > 0);
  assert.ok(totals.activeSessions >= 1);
});
await check("daily series has a continuous axis", () => {
  const series = dailySeries(14);
  assert.equal(series.length, 14);
  assert.ok(series.every((point) => typeof point.users === "number"));
  assert.ok(series.reduce((sum, p) => sum + p.applications, 0) >= 9);
});
await check("top skills and recent counts", () => {
  const skills = topSkills(5);
  assert.ok(skills.length > 0 && skills[0].count >= 1);
  assert.ok(recentCounts(7).applications >= 1);
});
await check("activity log is searchable", () => {
  assert.ok(listActivity({ perPage: 5 }).rows.length === 5);
  assert.ok(listActivity({ action: "application.create" }).total >= 5);
  assert.ok(distinctActions().length >= 3);
});

console.log("Match annotation");
await check("jobs get match data from a résumé", () => {
  const resume = findPrimaryResume(demo.id);
  const annotated = annotateJobsWithMatch(listJobs({ perPage: 5 }).rows, resume);
  assert.ok(annotated.every((job) => job.match && typeof job.match.score === "number"));
  assert.ok(annotated.some((job) => job.match.score > 50));
  const none = annotateJobsWithMatch(listJobs({ perPage: 2 }).rows, null);
  assert.equal(none[0].match, null);
});

console.log(`\n${passed} checks passed (isolated database, removed afterwards)`);
