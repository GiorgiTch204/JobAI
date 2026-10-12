import { notFound, ok, withUser } from "@/lib/http";
import { findJob } from "@/lib/db/jobs.repo";
import { isJobSaved, saveJob, unsaveJob } from "@/lib/db/saved-jobs.repo";
import { logActivity } from "@/lib/db/activity.repo";

export const POST = withUser(async (_request, { params, user, meta }) => {
  const { id } = await params;
  const job = findJob(id);
  if (!job) return notFound("That job posting does not exist.");

  saveJob(user.id, id);
  logActivity({
    userId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "job.save",
    entity: "job",
    entityId: id,
    summary: `Saved "${job.title}"`,
    ...meta,
  });

  return ok({ saved: true, message: "Saved to your list." });
});

export const DELETE = withUser(async (_request, { params, user, meta }) => {
  const { id } = await params;
  const removed = unsaveJob(user.id, id);

  if (removed) {
    logActivity({
      userId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "job.unsave",
      entity: "job",
      entityId: id,
      summary: "Removed a saved job",
      ...meta,
    });
  }

  return ok({ saved: false, removed, message: "Removed from your list." });
});

export const GET = withUser(async (_request, { params, user }) => {
  const { id } = await params;
  return ok({ saved: isJobSaved(user.id, id) });
});
