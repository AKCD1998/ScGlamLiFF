import { apiBaseUrl, liffId } from "../config/env";
import { isDebugEnabled } from "./debug";

const LOG_PREFIX = "[LIFFGuardFrontend]";

const trimText = (value) => (typeof value === "string" ? value.trim() : "");

const maskLineUserId = (value) => {
  const normalized = trimText(value);

  if (!normalized) {
    return null;
  }

  if (normalized.length <= 8) {
    return `${normalized.slice(0, 2)}***${normalized.slice(-2)}`;
  }

  return `${normalized.slice(0, 4)}***${normalized.slice(-4)}`;
};

export const isBranchDeviceGuardDebugEnabled = () => isDebugEnabled();

export const getCurrentPageUrl = () =>
  typeof window !== "undefined" ? trimText(window.location?.href) || null : null;

export const summarizeToken = (value) => {
  const normalized = trimText(value);

  return {
    present: Boolean(normalized),
    length: normalized.length || 0
  };
};

export const summarizeLiffIdentityHeaders = (headers = {}) => ({
  authorizationAttached: Boolean(trimText(headers?.Authorization)),
  xLineIdTokenAttached: Boolean(trimText(headers?.["X-Line-Id-Token"])),
  xLineAccessTokenAttached: Boolean(trimText(headers?.["X-Line-Access-Token"])),
  xLiffAppIdAttached: Boolean(trimText(headers?.["X-Liff-App-Id"]))
});

export const summarizeBranchDevicePayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const lineIdentity = payload.lineIdentity || payload.line_identity || null;

  return {
    success:
      typeof payload.success === "boolean"
        ? payload.success
        : typeof payload.ok === "boolean"
          ? payload.ok
          : null,
    reason: trimText(payload.reason) || null,
    registered:
      typeof payload.registered === "boolean" ? payload.registered : null,
    active:
      typeof payload.active === "boolean" || payload.active === null
        ? payload.active
        : null,
    created: typeof payload.created === "boolean" ? payload.created : null,
    updated: typeof payload.updated === "boolean" ? payload.updated : null,
    branchId: trimText(payload.branchId || payload.branch_id) || null,
    registrationId:
      trimText(payload.registrationId || payload.registration?.id) || null,
    lineUserId: maskLineUserId(lineIdentity?.line_user_id),
    staffCookiePresent:
      typeof payload.staffCookiePresent === "boolean"
        ? payload.staffCookiePresent
        : typeof payload.staff_cookie_present === "boolean"
          ? payload.staff_cookie_present
          : null,
    staffAuthMethod:
      trimText(payload.staffAuthMethod || payload.staff_auth_method) || null,
    code: trimText(payload.code) || null,
    error: trimText(payload.error) || null
  };
};

export const logBranchDeviceGuardDebug = (event, payload = {}) => {
  if (!isBranchDeviceGuardDebugEnabled()) {
    return;
  }

  console.log(LOG_PREFIX, event, payload);
};

export const getBranchDeviceGuardRuntimeConfig = () => ({
  currentPageUrl: getCurrentPageUrl(),
  apiBaseUrl: apiBaseUrl || "(relative /api)",
  liffId: liffId || "",
  liffIdPresent: Boolean(liffId)
});
