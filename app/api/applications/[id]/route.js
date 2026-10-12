import { badRequest, notFound, ok, withUser } from "@/lib/http";
import {
  findApplication,
  listApplicationEvents,
  updateApplicationStatus,
} from "@/lib/db/applications.repo";
import { logActivity } from "@/lib/db/activity.repo";

export const dynamic = "force-dynamic";

export const GET = withUser(async (_request, { params, user }) => {
  const { id } = await params;
  const application = findApplication(id, user.id);
  if (!application) return notFound("That application does not exist.");
  return ok({ application, events: listApplicationEvents(id) });
});

/** Members may only withdraw. Status changes belong to the admin endpoint. */
export const PATCH = withUser(async (_request, { params, user, meta }) => {
  const { id } = await params;
  const application = findApplication(id, user.id);
  if (!application) return notFound("That application does not exist.");

  if (["WITHDRAWN", "REJECTED", "OFFER"].includes(application.status)) {
    return badRequest(`This application is already marked "${application.status.toLowerCase()}".`);
  }

  const updated = updateApplicationStatus(id, "WITHDRAWN", {
    actorId: user.id,
    actorName: user.name,
    note: "Withdrawn by the applicant",
  });

  logActivity({
    userId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "application.withdraw",
    entity: "application",
    entityId: id,
    summary: `Withdrew the application for ${application.job?.title || "a role"}`,
    ...meta,
  });

  return ok({ application: updated, message: "Application withdrawn." });
});
