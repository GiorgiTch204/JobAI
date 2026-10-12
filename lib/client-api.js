/**
 * Browser-side API client.
 *
 * Every endpoint answers with `{ ok, ... }` or `{ ok: false, error }`, so one
 * helper can turn a failure into a thrown ApiError carrying the message the
 * user should read and the per-field errors a form needs.
 */

export class ApiError extends Error {
  constructor(message, { status = 0, code = "", fields = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export async function api(path, { method = "GET", body, signal, headers } = {}) {
  let response;

  try {
    response = await fetch(path, {
      method,
      signal,
      credentials: "same-origin",
      headers: {
        ...(body instanceof FormData ? {} : body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("We could not reach the server. Check your connection.", { status: 0 });
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok || payload?.ok === false) {
    const error = payload?.error || {};
    throw new ApiError(error.message || `Request failed (${response.status}).`, {
      status: response.status,
      code: error.code,
      fields: error.fields,
    });
  }

  return payload ?? {};
}

export const get = (path, options) => api(path, { ...options, method: "GET" });
export const post = (path, body, options) => api(path, { ...options, method: "POST", body });
export const patch = (path, body, options) => api(path, { ...options, method: "PATCH", body });
export const del = (path, options) => api(path, { ...options, method: "DELETE" });
