import { notFound, ok, withUser } from "@/lib/http";
import { setPrimaryResume } from "@/lib/db/resumes.repo";
import { logActivity } from "@/lib/db/activity.repo";

export const POST = withUser(async (_request, { params, user, meta }) => {
  const { id } = await params;
  const resume = setPrimaryResume(id, user.id);
  if (!resume) return notFound("That CV does not exist.");

  logActivity({
    userId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "resume.primary",
    entity: "resume",
    entityId: id,
    summary: `"${resume.title}" is now the primary CV`,
    ...meta,
  });

  return ok({ resume, message: `"${resume.title}" is now your primary CV.` });
});
