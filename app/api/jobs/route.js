import { created, ok, readJson, validationFailed, withAdmin, withPublic, badRequest } from "@/lib/http";
import { searchParamsOf } from "@/lib/http";
import { jobSchema, parse } from "@/lib/validation";
import { createJob, jobFacets, listJobs } from "@/lib/db/jobs.repo";
import { findPrimaryResume, findResume } from "@/lib/db/resumes.repo";
import { applicationStatusByJob } from "@/lib/db/applications.repo";
import { savedJobIds } from "@/lib/db/saved-jobs.repo";
import { annotateJobsWithMatch } from "@/lib/match";
import { logActivity } from "@/lib/db/activity.repo";

export const dynamic = "force-dynamic";

export const GET = withPublic(async (request, { user }) => {
  const params = searchParamsOf(request);

  const query = {
    search: params.get("search") || "",
    location: params.get("location") || "",
    workMode: params.get("workMode") || "",
    employmentType: params.get("employmentType") || "",
    seniority: params.get("seniority") || "",
    tag: params.get("tag") || "",
    sort: params.get("sort") || "newest",
    page: Number(params.get("page")) || 1,
    perPage: Number(params.get("perPage")) || 12,
    status: params.get("status") || "OPEN",
    withCounts: params.get("withCounts") === "1",
  };

  // Only an admin may look at non-open postings.
  if (query.status !== "OPEN" && user?.role !== "ADMIN") query.status = "OPEN";

  const { rows, total, page, perPage } = listJobs(query);

  let jobs = rows;
  let resumeUsed = null;

  if (user) {
    const requestedResumeId = params.get("resumeId");
    const resume = requestedResumeId
      ? findResume(requestedResumeId, user.id)
      : findPrimaryResume(user.id);

    if (resume) {
      resumeUsed = { id: resume.id, title: resume.title };
      jobs = annotateJobsWithMatch(jobs, resume);
      if (query.sort === "match") jobs = [...jobs].sort((a, b) => b.match.score - a.match.score);
    }

    const applied = applicationStatusByJob(user.id);
    const saved = new Set(savedJobIds(user.id));
    jobs = jobs.map((job) => ({
      ...job,
      applicationStatus: applied[job.id] || null,
      saved: saved.has(job.id),
    }));
  }

  return ok({
    jobs,
    total,
    page,
    perPage,
    pages: Math.max(1, Math.ceil(total / perPage)),
    facets: params.get("facets") === "1" ? jobFacets() : undefined,
    resumeUsed,
  });
});

export const POST = withAdmin(async (request, { user, meta }) => {
  const body = await readJson(request);
  if (!body) return badRequest("Send a JSON body.");

  const { data, error } = parse(jobSchema, body);
  if (error) return validationFailed(error);

  const job = createJob(data, user.id);

  logActivity({
    userId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "job.create",
    entity: "job",
    entityId: job.id,
    summary: `Posted "${job.title}" at ${job.company}`,
    ...meta,
  });

  return created({ job, message: "Job published." });
});
