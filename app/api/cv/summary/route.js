import { badRequest, ok, readJson, withUser } from "@/lib/http";
import { findPrimaryResume, findResume } from "@/lib/db/resumes.repo";
import { draftSummary } from "@/lib/optimize";

export const dynamic = "force-dynamic";

export const POST = withUser(async (request, { user }) => {
  const body = (await readJson(request)) || {};

  const document =
    body.resume ||
    (body.resumeId ? findResume(body.resumeId, user.id) : findPrimaryResume(user.id));

  if (!document) return badRequest("Create a CV first.", { code: "no_resume" });
  if (!(document.experience || []).length && !(document.skills || []).length) {
    return badRequest("Add a role or a few skills first — a summary needs something to describe.");
  }

  return ok({ summary: draftSummary(document) });
});
