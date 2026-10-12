import { conflict, created, readJson, route, validationFailed, badRequest } from "@/lib/http";
import { parse, registerSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth/password";
import { createUser, findUserByEmail } from "@/lib/db/users.repo";
import { createSession } from "@/lib/db/sessions.repo";
import { logActivity } from "@/lib/db/activity.repo";
import { requestMetaFrom, writeSessionCookie } from "@/lib/auth/session";
import { sessionTtlDays } from "@/lib/auth/jwt";

export const POST = route(async (request) => {
  const body = await readJson(request);
  if (!body) return badRequest("Send a JSON body.");

  const { data, error } = parse(registerSchema, body);
  if (error) return validationFailed(error);

  if (findUserByEmail(data.email)) {
    return conflict("That email already has an account. Sign in instead.");
  }

  const user = createUser({
    name: data.name,
    email: data.email,
    passwordHash: await hashPassword(data.password),
  });

  const meta = requestMetaFrom(request);
  const session = createSession({ userId: user.id, ...meta, ttlDays: sessionTtlDays() });
  await writeSessionCookie({ user, sessionId: session.id });

  logActivity({
    userId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "user.register",
    entity: "user",
    entityId: user.id,
    summary: "Account created",
    ...meta,
  });

  return created({ user, message: "Account created." });
});
