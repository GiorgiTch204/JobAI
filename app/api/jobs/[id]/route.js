import {
  badRequest,
  notFound,
  ok,
  readJson,
  validationFailed,
  withAdmin,
  withPublic,
} from "@/lib/http";
import { jobUpdateSchema, parse } from "@/lib/validation";
import { deleteJob, findJobWithCounts, incrementJobViews, updateJob } from "@/lib/db/jobs.repo";
import { findPrimaryResume } from "@/lib/db/resumes.repo";
import { findUserApplicationForJob } from "@/lib/db/applications.repo";
import { isJobSaved } from "@/lib/db/saved-jobs.repo";
import { matchResumeToJob } from "@/lib/match";
import { logActivity } from "@/lib/db/activity.repo";

export const dynamic = "force-dynamic";

export const GET = withPublic(async (request, { params, user }) => {
  const { id } = await params;
  const job = findJobWithCounts(id);
  if (!job) return notFound("That job posting does not exist.");
  if (job.status !== "OPEN" && user?.role !== "ADMIN" && !user) {
    return notFound("That job posting is no longer open.");
  }

  if (new URL(request.url).searchParams.get("track") === "1") incrementJobViews(id);

  let match = null;
  let application = null;
  let saved = false;

  if (user) {
    const resume = findPrimaryResume(user.id);
    if (resume) match = matchResumeToJob(resume, job);
    application = findUserApplicationForJob(user.id, id);
    saved = isJobSaved(user.id, id);
  }

  return ok({ job, match, application, saved });
});

export const PATCH = withAdmin(async (request, { params, user, meta }) => {
  const { id } = await params;
  const existing = findJobWithCounts(id);
  if (!existing) return notFound("That job posting does not exist.");

  const body = await readJson(request);
  if (!body) return badRequest("Send a JSON body.");

  const { data, error } = parse(jobUpdateSchema, body);
  if (error) return validationFailed(error);

  const job = updateJob(id, data);

  logActivity({
    userId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "job.update",
    entity: "job",
    entityId: id,
    summary: `Updated "${job.title}"`,
    meta: { fields: Object.keys(data) },
    ...meta,
  });

  return ok({ job, message: "Job updated." });
});

export const DELETE = withAdmin(async (_request, { params, user, meta }) => {
  const { id } = await params;
  const existing = findJobWithCounts(id);
  if (!existing) return notFound("That job posting does not exist.");

  deleteJob(id);

  logActivity({
    userId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "job.delete",
    entity: "job",
    entityId: id,
    summary: `Deleted "${existing.title}" at ${existing.company}`,
    ...meta,
  });

  return ok({ message: "Job deleted." });
});
