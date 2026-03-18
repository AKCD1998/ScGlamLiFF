import { apiUrl } from "../utils/apiBase";
import {
  buildLiffIdentityHeaders,
  getLiffIdentityTokens
} from "../utils/liffIdentity";

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

const getLiffIdentityRequest = async () => {
  const tokens = (await getLiffIdentityTokens()) || {};

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

const requestJson = async (path, { method = "GET", body, headers } = {}) => {
  const response = await fetch(apiUrl(path), {
    method,
    credentials: "include",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(headers || {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    throw buildApiError(response, payload);
  }

  return payload;
};

export const getMyBranchDeviceRegistration = async () =>
  requestJson("/api/branch-device-registrations/me", {
    method: "GET",
    headers: (await getLiffIdentityRequest()).headers
  });

export const createBranchDeviceRegistration = async (payload = {}) => {
  const { headers, liffAppId } = await getLiffIdentityRequest();

  return requestJson("/api/branch-device-registrations", {
    method: "POST",
    headers,
    body: {
      branch_id: trimText(payload?.branch_id),
      ...(trimText(payload?.device_label)
        ? { device_label: trimText(payload.device_label) }
        : {}),
      ...(liffAppId ? { liff_app_id: liffAppId } : {})
    }
  });
};
