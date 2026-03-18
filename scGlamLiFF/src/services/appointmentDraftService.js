import { apiUrl } from "../utils/apiBase";

const JSON_HEADERS = {
  "Content-Type": "application/json"
};

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

export class AppointmentDraftApiError extends Error {
  constructor(message, { status, payload } = {}) {
    super(message);
    this.name = "AppointmentDraftApiError";
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

  return new AppointmentDraftApiError(message, {
    status: response.status,
    payload
  });
};

const requestJson = async (path, options = {}) => {
  const { headers, ...restOptions } = options;
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    ...restOptions,
    headers: {
      ...JSON_HEADERS,
      ...headers
    }
  });
  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    throw buildApiError(response, payload);
  }

  return payload;
};

export const createAppointmentDraft = async (payload) =>
  requestJson("/api/appointment-drafts", {
    method: "POST",
    body: JSON.stringify(payload || {})
  });

export const listAppointmentDrafts = async () => {
  const payload = await requestJson("/api/appointment-drafts", {
    method: "GET"
  });

  if (Array.isArray(payload?.drafts)) {
    return payload.drafts;
  }

  if (Array.isArray(payload?.rows)) {
    return payload.rows;
  }

  return [];
};

export const getAppointmentDraft = async (id) =>
  requestJson(`/api/appointment-drafts/${encodeURIComponent(id)}`, {
    method: "GET"
  });

export const updateAppointmentDraft = async (id, payload) =>
  requestJson(`/api/appointment-drafts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload || {})
  });

export const submitAppointmentDraft = async (id) =>
  requestJson(`/api/appointment-drafts/${encodeURIComponent(id)}/submit`, {
    method: "POST",
    body: JSON.stringify({})
  });
