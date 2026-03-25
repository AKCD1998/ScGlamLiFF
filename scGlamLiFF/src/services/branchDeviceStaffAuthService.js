import { apiUrl } from "../utils/apiBase";
import {
  getBranchDeviceGuardRuntimeConfig,
  logBranchDeviceGuardDebug
} from "../utils/branchDeviceGuardDebug";

const parseJsonSafely = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const trimText = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeStaffSessionPayload = (payload) => ({
  ...(payload || {}),
  ok:
    typeof payload?.ok === "boolean"
      ? payload.ok
      : typeof payload?.success === "boolean"
        ? payload.success
        : false,
  success:
    typeof payload?.success === "boolean"
      ? payload.success
      : typeof payload?.ok === "boolean"
        ? payload.ok
        : false,
  user:
    payload?.data && typeof payload.data === "object"
      ? payload.data
      : payload?.user && typeof payload.user === "object"
        ? payload.user
        : null,
  error: trimText(payload?.error),
  reason: trimText(payload?.reason)
});

const emitStaffAuthEvent = (onEvent, event) => {
  onEvent?.(event);
  logBranchDeviceGuardDebug(event.type, event);
};

export class BranchDeviceStaffAuthApiError extends Error {
  constructor(message, { status, payload } = {}) {
    super(message);
    this.name = "BranchDeviceStaffAuthApiError";
    this.status = status ?? 0;
    this.payload = payload ?? null;
    this.reason = payload?.reason || "";
    this.code = payload?.code || "";
  }
}

const buildStaffAuthApiError = ({ path, response, payload }) => {
  const inferredReason =
    trimText(payload?.reason) ||
    (path === "/api/auth/me" && response.status === 401
      ? "missing_staff_auth"
      : path === "/api/auth/login" && response.status === 401
        ? "login_failed"
        : response.status >= 500
          ? "server_error"
          : "bad_request");

  return new BranchDeviceStaffAuthApiError(
    payload?.error || `Request failed: ${response.status}`,
    {
      status: response.status,
      payload: {
        ...(payload || {}),
        reason: inferredReason
      }
    }
  );
};

const requestStaffAuthJson = async (
  path,
  { method = "GET", body, onEvent, operation } = {}
) => {
  const url = apiUrl(path);

  emitStaffAuthEvent(onEvent, {
    type: "staff_auth_request_start",
    operation,
    method,
    url,
    credentialsIncluded: true,
    ...getBranchDeviceGuardRuntimeConfig()
  });

  let response;

  try {
    response = await fetch(url, {
      method,
      cache: "no-store",
      credentials: "include",
      headers:
        body === undefined
          ? undefined
          : {
              "Content-Type": "application/json"
            },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch (error) {
    emitStaffAuthEvent(onEvent, {
      type: "staff_auth_request_error",
      operation,
      method,
      url,
      credentialsIncluded: true,
      errorMessage: error?.message || "request_failed",
      ...getBranchDeviceGuardRuntimeConfig()
    });
    throw error;
  }

  const payload = normalizeStaffSessionPayload(await parseJsonSafely(response));

  emitStaffAuthEvent(onEvent, {
    type: "staff_auth_response",
    operation,
    method,
    url,
    credentialsIncluded: true,
    status: response.status,
    ok: response.ok,
    body: {
      success: payload.success,
      reason: payload.reason || null,
      hasUser: Boolean(payload.user),
      error: payload.error || null,
      user:
        payload.user && typeof payload.user === "object" ? payload.user : null
    },
    ...getBranchDeviceGuardRuntimeConfig()
  });

  if (!response.ok) {
    throw buildStaffAuthApiError({ path, response, payload });
  }

  return payload;
};

export const getMyStaffSession = async ({ onEvent } = {}) =>
  requestStaffAuthJson("/api/auth/me", {
    method: "GET",
    onEvent,
    operation: "staff_session"
  });

export const loginStaffSession = async (
  { username, password } = {},
  { onEvent } = {}
) =>
  requestStaffAuthJson("/api/auth/login", {
    method: "POST",
    body: {
      username: trimText(username),
      password: typeof password === "string" ? password : ""
    },
    onEvent,
    operation: "staff_login"
  });
