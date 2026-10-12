import { badRequest, created, ok, readJson, validationFailed, withUser } from "@/lib/http";
import { parse, resumeCreateSchema } from "@/lib/validation";
import { createResume, listResumes } from "@/lib/db/resumes.repo";
import { scoreResume } from "@/lib/ats";
import { logActivity } from "@/lib/db/activity.repo";

export const dynamic = "force-dynamic";

export const GET = withUser(async (_request, { user }) => {
  return ok({ resumes: listResumes(user.id) });
});

export const POST = withUser(async (request, { user, meta }) => {
  const body = await readJson(request);
  if (!body) return badRequest("Send a JSON body.");

  const { data, error } = parse(resumeCreateSchema, body);
  if (error) return validationFailed(error);

  const document = { ...data, fullName: data.fullName || user.name, email: data.email || user.email };
  const report = scoreResume(document);
  const resume = createResume(user.id, document, { atsScore: report.score, atsReport: report });

  logActivity({
    userId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: data.source === "upload" ? "resume.upload" : "resume.create",
    entity: "resume",
    entityId: resume.id,
    summary: `${data.source === "upload" ? "Uploaded" : "Created"} "${resume.title}" (ATS ${report.score})`,
    ...meta,
  });

  return created({ resume, report, message: "CV saved." });
});
