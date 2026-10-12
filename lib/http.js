import { NextResponse } from "next/server";

import { getSession, requestMetaFrom } from "@/lib/auth/session";

/**
 * Every API route answers with the same envelope so the client never has to
 * guess:   success -> { ok: true,  ...payload }
 *          failure -> { ok: false, error: { message, code, fields? } }
 */

export function json(payload, status = 200, init = {}) {
  return NextResponse.json(payload, { status, ...init });
}

export function ok(payload = {}, status = 200) {
  return json({ ok: true, ...payload }, status);
}

export function created(payload = {}) {
  return ok(payload, 201);
}

export function fail(message, status = 400, { code = "", fields = null } = {}) {
  return json({ ok: false, error: { message, code: code || codeFor(status), fields } }, status);
}

function codeFor(status) {
  return (
    {
      400: "bad_request",
      401: "unauthorized",
      403: "forbidden",
      404: "not_found",
      409: "conflict",
      413: "payload_too_large",
      422: "unprocessable",
      429: "too_many_requests",
      500: "server_error",
    }[status] || "error"
  );
}

export const badRequest = (message = "That request was not valid.", options) =>
  fail(message, 400, options);
export const unauthorized = (message = "Sign in to continue.") => fail(message, 401);
export const forbidden = (message = "You do not have access to this.") => fail(message, 403);
export const notFound = (message = "Not found.") => fail(message, 404);
export const conflict = (message = "That already exists.") => fail(message, 409);
export const tooMany = (message = "Too many attempts. Try again shortly.") => fail(message, 429);
export const serverError = (message = "Something went wrong on our side.") => fail(message, 500);

/** Turns a ZodError into `{ message, fields }` the forms can render inline. */
export function validationFailed(error) {
  const fields = {};
  for (const issue of error?.issues || []) {
    const key = issue.path?.join(".") || "form";
    if (!fields[key]) fields[key] = issue.message;
  }
  const first = Object.values(fields)[0] || "Check the highlighted fields.";
  return fail(first, 422, { fields });
}

/* -------------------------------------------------------------------------- */
/* request helpers                                                            */
/* -------------------------------------------------------------------------- */

export async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return null;
  }
}

export function searchParamsOf(request) {
  return new URL(request.url).searchParams;
}

export function paginationFrom(params, defaultPerPage = 20) {
  return {
    page: Math.max(Number(params.get("page")) || 1, 1),
    perPage: Math.min(Math.max(Number(params.get("perPage")) || defaultPerPage, 1), 100),
  };
}

/**
 * Wraps a route handler: catches unexpected errors so the client always gets
 * JSON (never an HTML error page) and the stack lands in the server log.
 */
export function route(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error(`[api] ${request?.method} ${request?.url} failed:`, error);
      return serverError(
        process.env.NODE_ENV === "production"
          ? "Something went wrong on our side."
          : `Server error: ${error.message}`,
      );
    }
  };
}

/** Route handler that requires a signed-in user. */
export function withUser(handler) {
  return route(async (request, context) => {
    const session = await getSession();
    if (!session) return unauthorized();
    return handler(request, {
      ...context,
      session,
      user: session.user,
      meta: requestMetaFrom(request),
    });
  });
}

/** Route handler that requires an admin. */
export function withAdmin(handler) {
  return route(async (request, context) => {
    const session = await getSession();
    if (!session) return unauthorized();
    if (session.user.role !== "ADMIN") return forbidden("Admin access is required.");
    return handler(request, {
      ...context,
      session,
      user: session.user,
      meta: requestMetaFrom(request),
    });
  });
}

/** Route handler open to everyone, with request metadata attached. */
export function withPublic(handler) {
  return route(async (request, context) => {
    const session = await getSession().catch(() => null);
    return handler(request, {
      ...context,
      session,
      user: session?.user ?? null,
      meta: requestMetaFrom(request),
    });
  });
}
