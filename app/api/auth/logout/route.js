import { ok, route } from "@/lib/http";
import { clearSessionCookie, getSession, requestMetaFrom } from "@/lib/auth/session";
import { revokeSession } from "@/lib/db/sessions.repo";
import { logActivity } from "@/lib/db/activity.repo";

export const POST = route(async (request) => {
  const session = await getSession();

  if (session) {
    revokeSession(session.sessionId);
    logActivity({
      userId: session.user.id,
      actorName: session.user.name,
      actorRole: session.user.role,
      action: "user.logout",
      entity: "user",
      entityId: session.user.id,
      summary: "Signed out",
      ...requestMetaFrom(request),
    });
  }

  await clearSessionCookie();
  return ok({ message: "Signed out." });
});
