import { badRequest, notFound, ok, readJson, validationFailed, withUser } from "@/lib/http";
import { parse, scoreSchema } from "@/lib/validation";
import { findPrimaryResume, findResume } from "@/lib/db/resumes.repo";
import { findJob } from "@/lib/db/jobs.repo";
import { scoreResume } from "@/lib/ats";
import { matchResumeToJob } from "@/lib/match";

export const dynamic = "force-dynamic";

export const POST = withUser(async (request, { user }) => {
  const body = (await readJson(request)) || {};
  const { data, error } = parse(scoreSchema, body);
  if (error) return validationFailed(error);

  const document =
    data.resume ||
    (data.resumeId ? findResume(data.resumeId, user.id) : findPrimaryResume(user.id));

  if (!document) return badRequest("Send a CV, or create one first.", { code: "no_resume" });

  const report = scoreResume(document);

  let match = null;
  if (data.jobId) {
    const job = findJob(data.jobId);
    if (!job) return notFound("That job posting does not exist.");
    match = { jobId: job.id, jobTitle: job.title, ...matchResumeToJob(document, job) };
  }

  return ok({ report, match });
});
