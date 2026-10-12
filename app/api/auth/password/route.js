import { badRequest, fail, ok, readJson, validationFailed, withUser } from "@/lib/http";
import { changePasswordSchema, parse } from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { findUserCredentialsById, updateUserPassword } from "@/lib/db/users.repo";
import { revokeAllUserSessions } from "@/lib/db/sessions.repo";
import { logActivity } from "@/lib/db/activity.repo";

export const PATCH = withUser(async (request, { user, session, meta }) => {
  const body = await readJson(request);
  if (!body) return badRequest("Send a JSON body.");

  const { data, error } = parse(changePasswordSchema, body);
  if (error) return validationFailed(error);

  const account = findUserCredentialsById(user.id);
  const matches = await verifyPassword(data.currentPassword, account.passwordHash);
  if (!matches) {
    return fail("Your current password is not correct.", 400, {
      fields: { currentPassword: "That is not your current password." },
    });
  }

  updateUserPassword(user.id, await hashPassword(data.newPassword));
  const revoked = revokeAllUserSessions(user.id, { except: session.sessionId });

  logActivity({
    userId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "user.password_change",
    entity: "user",
    entityId: user.id,
    summary: `Password changed; ${revoked} other session(s) signed out`,
    ...meta,
  });

  return ok({ message: "Password changed. Other devices have been signed out.", revoked });
});
