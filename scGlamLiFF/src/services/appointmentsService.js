import { apiUrl } from "../utils/apiBase";
import { useMock } from "../config/env";
import { normalizeCanonicalBranch } from "./branchContract";
import { LIFF_RECEIPT_PROMO_BOOKING_CHANNEL } from "../config/liffReceiptPromoCampaign";
import {
  MockApiError,
  createMockAppointment,
  getMockAppointmentsQueue,
  getMockBookingOptions,
  getMockCalendarDays
} from "./billVerificationMockService";

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

export class AppointmentsApiError extends Error {
  constructor(message, { status, payload } = {}) {
    super(message);
    this.name = "AppointmentsApiError";
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

  return new AppointmentsApiError(message, {
    status: response.status,
    payload
  });
};

const buildMockApiError = (error) =>
  new AppointmentsApiError(error?.message || "Mock request failed", {
    status: error?.status ?? 0,
    payload: error?.payload ?? null
  });

const runMockRequest = async (callback) => {
  try {
    return await callback();
  } catch (error) {
    if (error instanceof AppointmentsApiError) {
      throw error;
    }

    if (error instanceof MockApiError) {
      throw buildMockApiError(error);
    }

    throw buildMockApiError(error);
  }
};

const buildQueryString = (params) => {
  const query = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    query.set(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
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

export const getBookingOptions = async ({
  channel = LIFF_RECEIPT_PROMO_BOOKING_CHANNEL
} = {}) => {
  if (useMock) {
    return runMockRequest(() => getMockBookingOptions({ channel }));
  }

  const payload = await requestJson(
    `/api/appointments/booking-options${buildQueryString({
      channel
    })}`,
    {
      method: "GET"
    }
  );

  return {
    options: Array.isArray(payload?.options) ? payload.options : [],
    meta: payload?.meta && typeof payload.meta === "object" ? payload.meta : null
  };
};

export const getCalendarDays = async ({ from, to, branchValue } = {}) => {
  if (useMock) {
    return runMockRequest(() =>
      getMockCalendarDays({
        from,
        to,
        branchValue
      })
    );
  }

  const normalizedBranch = normalizeCanonicalBranch(branchValue);
  const payload = await requestJson(
    `/api/appointments/calendar-days${buildQueryString({
      from,
      to,
      branch_id: normalizedBranch.availabilityBranchId
    })}`,
    {
      method: "GET"
    }
  );

  return Array.isArray(payload?.days) ? payload.days : [];
};

export const getAppointmentsQueue = async ({ date, branchValue, limit } = {}) => {
  if (useMock) {
    return runMockRequest(() =>
      getMockAppointmentsQueue({
        date,
        branchValue,
        limit
      })
    );
  }

  const normalizedBranch = normalizeCanonicalBranch(branchValue);
  const payload = await requestJson(
    `/api/appointments/queue${buildQueryString({
      date,
      branch_id: normalizedBranch.availabilityBranchId,
      limit
    })}`,
    {
      method: "GET"
    }
  );

  return Array.isArray(payload?.rows) ? payload.rows : [];
};

export const createAppointment = async (payload) =>
  useMock
    ? runMockRequest(() => createMockAppointment(payload))
    : requestJson("/api/appointments", {
        method: "POST",
        body: JSON.stringify(payload)
      });
