import { apiUrl } from "../utils/apiBase";
import {
  buildLiffIdentityHeaders,
  getLiffIdentityTokens
} from "../utils/liffIdentity";
import {
  logBranchDeviceGuardDebug,
  summarizeBranchDevicePayload
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

const normalizeLookupPayload = (payload) => ({
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
  registered:
    typeof payload?.registered === "boolean" ? payload.registered : false,
  active:
    typeof payload?.active === "boolean" || payload?.active === null
      ? payload.active
      : null,
  reason: trimText(payload?.reason),
  branchId: trimText(payload?.branchId || payload?.branch_id) || null,
  registrationId:
    trimText(payload?.registrationId || payload?.registration?.id) || null,
  registration:
    payload?.registration && typeof payload.registration === "object"
      ? payload.registration
      : null,
  lineIdentity:
    (payload?.lineIdentity && typeof payload.lineIdentity === "object"
      ? payload.lineIdentity
      : null) ||
    (payload?.line_identity && typeof payload.line_identity === "object"
      ? payload.line_identity
      : null),
  error: trimText(payload?.error),
  code: trimText(payload?.code)
});

const normalizeMutationPayload = (payload) => ({
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
  created: Boolean(payload?.created),
  updated: Boolean(payload?.updated),
  active:
    typeof payload?.active === "boolean" || payload?.active === null
      ? payload.active
      : null,
  reason: trimText(payload?.reason),
  branchId: trimText(payload?.branchId || payload?.branch_id) || null,
  registrationId:
    trimText(payload?.registrationId || payload?.registration?.id) || null,
  registration:
    payload?.registration && typeof payload.registration === "object"
      ? payload.registration
      : null,
  lineIdentity:
    (payload?.lineIdentity && typeof payload.lineIdentity === "object"
      ? payload.lineIdentity
      : null) ||
    (payload?.line_identity && typeof payload.line_identity === "object"
      ? payload.line_identity
      : null),
  error: trimText(payload?.error),
  code: trimText(payload?.code)
});

const emitRequestEvent = (onEvent, event) => {
  onEvent?.(event);
  if (event.type === "response") {
    logBranchDeviceGuardDebug(event.type, {
      ...event,
      body: summarizeBranchDevicePayload(event.body)
    });
    return;
  }

  logBranchDeviceGuardDebug(event.type, event);
};

const getLiffIdentityRequest = async ({ onEvent } = {}) => {
  const tokens = (await getLiffIdentityTokens({ onEvent })) || {};

  return {
    headers: buildLiffIdentityHeaders(tokens),
    liffAppId: trimText(tokens?.liffAppId)
  };
};

export class BranchDeviceRegistrationApiError extends Error {
  constructor(message, { status, payload } = {}) {
    super(message);
    this.name = "BranchDeviceRegistrationApiError";
    this.status = status ?? 0;
    this.payload = payload ?? null;
    this.code = payload?.code || "";
    this.reason = payload?.reason || "";
    this.details = payload?.details || null;
  }
}

const buildApiError = (response, payload) => {
  const message =
    payload?.message ||
    payload?.error ||
    `Request failed: ${response.status}`;

  return new BranchDeviceRegistrationApiError(message, {
    status: response.status,
    payload
  });
};

const requestJson = async (
  path,
  {
    method = "GET",
    body,
    headers,
    onEvent,
    operation,
    normalizePayload = (payload) => payload
  } = {}
) => {
  const url = apiUrl(path);

  emitRequestEvent(onEvent, {
    type: "request_start",
    operation,
    method,
    url
  });

  let response;

  try {
    response = await fetch(url, {
      method,
      credentials: "include",
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(headers || {})
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch (error) {
    emitRequestEvent(onEvent, {
      type: "request_error",
      operation,
      method,
      url,
      errorMessage: error?.message || "request_failed"
    });
    throw error;
  }

  const payload = normalizePayload(await parseJsonSafely(response));

  emitRequestEvent(onEvent, {
    type: "response",
    operation,
    method,
    url,
    status: response.status,
    ok: response.ok,
    body: payload
  });

  if (!response.ok) {
    throw buildApiError(response, payload);
  }

  return payload;
};

export const getMyBranchDeviceRegistration = async ({ onEvent } = {}) =>
  requestJson("/api/branch-device-registrations/me", {
    method: "GET",
    headers: (await getLiffIdentityRequest({ onEvent })).headers,
    onEvent,
    operation: "lookup",
    normalizePayload: normalizeLookupPayload
  });

export const createBranchDeviceRegistration = async (payload = {}) => {
  const { onEvent } = payload;
  const { headers, liffAppId } = await getLiffIdentityRequest({ onEvent });

  return requestJson("/api/branch-device-registrations", {
    method: "POST",
    headers,
    onEvent,
    operation: "register",
    normalizePayload: normalizeMutationPayload,
    body: {
      branch_id: trimText(payload?.branch_id),
      ...(trimText(payload?.device_label)
        ? { device_label: trimText(payload.device_label) }
        : {}),
      ...(liffAppId ? { liff_app_id: liffAppId } : {})
    }
  });
};
