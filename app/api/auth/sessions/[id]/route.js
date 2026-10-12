import { forbidden, notFound, ok, withUser } from "@/lib/http";
import { findSession, revokeSession } from "@/lib/db/sessions.repo";
import { logActivity } from "@/lib/db/activity.repo";

export const DELETE = withUser(async (_request, { params, user, session, meta }) => {
  const { id } = await params;

  const target = findSession(id);
  if (!target) return notFound("That session no longer exists.");
  if (target.userId !== user.id) return forbidden("That session belongs to another account.");
  if (id === session.sessionId) {
    return forbidden("That is the session you are using. Sign out instead.");
  }

  revokeSession(id);
  logActivity({
    userId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "user.session_revoke",
    entity: "session",
    entityId: id,
    summary: `Revoked session on ${target.device || "unknown device"}`,
    ...meta,
  });

  return ok({ message: "Session signed out." });
});
