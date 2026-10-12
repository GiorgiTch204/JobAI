import { badRequest, fail, ok, readJson, route, tooMany, validationFailed } from "@/lib/http";
import { loginSchema, parse } from "@/lib/validation";
import { verifyPassword } from "@/lib/auth/password";
import { findUserCredentials, recordLogin } from "@/lib/db/users.repo";
import { createSession } from "@/lib/db/sessions.repo";
import { logActivity } from "@/lib/db/activity.repo";
import { checkLoginRate, recordLoginAttempt } from "@/lib/rate-limit";
import { requestMetaFrom, writeSessionCookie } from "@/lib/auth/session";
import { sessionTtlDays } from "@/lib/auth/jwt";

export const POST = route(async (request) => {
  const body = await readJson(request);
  if (!body) return badRequest("Send a JSON body.");

  const { data, error } = parse(loginSchema, body);
  if (error) return validationFailed(error);

  const meta = requestMetaFrom(request);
  const rate = checkLoginRate({ email: data.email, ip: meta.ip });
  if (rate.limited) {
    return tooMany(
      `Too many failed attempts. Try again in ${rate.retryInMinutes} minute${
        rate.retryInMinutes === 1 ? "" : "s"
      }.`,
    );
  }

  const account = findUserCredentials(data.email);
  const valid = account ? await verifyPassword(data.password, account.passwordHash) : false;

  if (!account || !valid) {
    recordLoginAttempt({ email: data.email, ip: meta.ip, success: false });
    if (account) {
      logActivity({
        userId: account.id,
        actorName: account.name,
        actorRole: account.role,
        action: "user.login_failed",
        entity: "user",
        entityId: account.id,
        summary: "Failed sign-in attempt",
        ...meta,
      });
    }
    // Same message either way: never reveal whether an email is registered.
    return fail("That email and password do not match.", 401, { code: "invalid_credentials" });
  }

  if (account.status !== "ACTIVE") {
    recordLoginAttempt({ email: data.email, ip: meta.ip, success: false });
    return fail("This account is suspended. Contact an administrator.", 403, {
      code: "account_suspended",
    });
  }

  recordLoginAttempt({ email: data.email, ip: meta.ip, success: true });

  const { passwordHash, ...user } = account;
  const session = createSession({ userId: user.id, ...meta, ttlDays: sessionTtlDays() });
  await writeSessionCookie({ user, sessionId: session.id });
  recordLogin(user.id);

  logActivity({
    userId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "user.login",
    entity: "user",
    entityId: user.id,
    summary: "Signed in",
    ...meta,
  });

  return ok({ user, message: "Signed in." });
});
