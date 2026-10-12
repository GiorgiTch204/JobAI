import { ok, readJson, validationFailed, withUser } from "@/lib/http";
import { optimizeSchema, parse } from "@/lib/validation";
import { findJob } from "@/lib/db/jobs.repo";
import { jobKeywords } from "@/lib/match";
import { optimizeBullet } from "@/lib/optimize";

export const dynamic = "force-dynamic";

export const POST = withUser(async (request) => {
  const body = (await readJson(request)) || {};
  const { data, error } = parse(optimizeSchema, body);
  if (error) return validationFailed(error);

  let keywords = data.keywords || [];
  if (!keywords.length && body.jobId) {
    const job = findJob(body.jobId);
    if (job) keywords = jobKeywords(job).slice(0, 8);
  }

  const result = optimizeBullet(data.text, {
    targetRole: data.targetRole || "",
    keywords,
  });

  return ok({ result });
});
