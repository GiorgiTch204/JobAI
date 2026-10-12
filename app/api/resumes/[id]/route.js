import { badRequest, notFound, ok, readJson, validationFailed, withUser } from "@/lib/http";
import { parse, resumeSchema } from "@/lib/validation";
import { deleteResume, findResume, updateResume } from "@/lib/db/resumes.repo";
import { scoreResume } from "@/lib/ats";
import { logActivity } from "@/lib/db/activity.repo";

export const dynamic = "force-dynamic";

export const GET = withUser(async (_request, { params, user }) => {
  const { id } = await params;
  const resume = findResume(id, user.id);
  if (!resume) return notFound("That CV does not exist.");
  return ok({ resume });
});

export const PATCH = withUser(async (request, { params, user, meta }) => {
  const { id } = await params;
  const existing = findResume(id, user.id);
  if (!existing) return notFound("That CV does not exist.");

  const body = await readJson(request);
  if (!body) return badRequest("Send a JSON body.");

  const { data, error } = parse(resumeSchema, body);
  if (error) return validationFailed(error);

  const merged = { ...existing, ...data };
  const report = scoreResume(merged);
  const resume = updateResume(id, user.id, data, { atsScore: report.score, atsReport: report });

  logActivity({
    userId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "resume.update",
    entity: "resume",
    entityId: id,
    summary: `Updated "${resume.title}" (ATS ${report.score})`,
    meta: { fields: Object.keys(data) },
    ...meta,
  });

  return ok({ resume, report, message: "Saved." });
});

export const DELETE = withUser(async (_request, { params, user, meta }) => {
  const { id } = await params;
  const existing = findResume(id, user.id);
  if (!existing) return notFound("That CV does not exist.");

  deleteResume(id, user.id);

  logActivity({
    userId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "resume.delete",
    entity: "resume",
    entityId: id,
    summary: `Deleted "${existing.title}"`,
    ...meta,
  });

  return ok({ message: "CV deleted." });
});
