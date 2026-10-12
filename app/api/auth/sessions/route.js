import { ok, withUser } from "@/lib/http";
import { listUserSessions, revokeAllUserSessions } from "@/lib/db/sessions.repo";
import { logActivity } from "@/lib/db/activity.repo";

export const dynamic = "force-dynamic";

export const GET = withUser(async (_request, { user, session }) => {
  const sessions = listUserSessions(user.id).map((item) => ({
    ...item,
    current: item.id === session.sessionId,
  }));
  return ok({ sessions });
});

export const DELETE = withUser(async (_request, { user, session, meta }) => {
  const revoked = revokeAllUserSessions(user.id, { except: session.sessionId });

  logActivity({
    userId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "user.session_revoke",
    entity: "user",
    entityId: user.id,
    summary: `Signed out ${revoked} other session(s)`,
    ...meta,
  });

  return ok({ revoked, message: `Signed out ${revoked} other device(s).` });
});
