import { badRequest, conflict, created, notFound, readJson, validationFailed, withUser } from "@/lib/http";
import { applySchema, parse } from "@/lib/validation";
import { findJob } from "@/lib/db/jobs.repo";
import { findPrimaryResume, findResume } from "@/lib/db/resumes.repo";
import { createApplication, findUserApplicationForJob } from "@/lib/db/applications.repo";
import { matchResumeToJob } from "@/lib/match";
import { logActivity } from "@/lib/db/activity.repo";

export const POST = withUser(async (request, { params, user, meta }) => {
  const { id } = await params;

  const job = findJob(id);
  if (!job) return notFound("That job posting does not exist.");
  if (job.status !== "OPEN") return badRequest("This posting is closed to new applications.");

  if (findUserApplicationForJob(user.id, id)) {
    return conflict("You have already applied to this role.");
  }

  const body = (await readJson(request)) || {};
  const { data, error } = parse(applySchema, body);
  if (error) return validationFailed(error);

  const resume = data.resumeId ? findResume(data.resumeId, user.id) : findPrimaryResume(user.id);
  if (!resume) {
    return badRequest("Create or upload a CV before you apply.", { code: "no_resume" });
  }

  const match = matchResumeToJob(resume, job);
  const application = createApplication({
    jobId: id,
    userId: user.id,
    resumeId: resume.id,
    resumeSnapshot: resume,
    coverLetter: data.coverLetter || "",
    matchScore: match.score,
    atsScore: resume.atsScore || 0,
    actorName: user.name,
  });

  logActivity({
    userId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "application.create",
    entity: "application",
    entityId: application.id,
    summary: `Applied to ${job.title} at ${job.company} (${match.score}% match)`,
    meta: { jobId: id, matchScore: match.score },
    ...meta,
  });

  return created({
    application,
    match,
    message: `Application sent to ${job.company}.`,
  });
});
