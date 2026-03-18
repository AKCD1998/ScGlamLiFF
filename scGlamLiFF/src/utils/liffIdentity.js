import liff from "@line/liff";
import { liffId } from "../config/env";
import { logBranchDeviceGuardDebug } from "./branchDeviceGuardDebug";

let liffInitPromise = null;

const emitLiffEvent = (onEvent, event) => {
  onEvent?.(event);
  logBranchDeviceGuardDebug(event.type, event);
};

const requireLiffId = () => {
  if (!liffId) {
    logBranchDeviceGuardDebug("liff_missing_id", {
      hasLiffId: false
    });
    throw new Error("Missing VITE_LIFF_ID");
  }
};

export const initializeLiff = async ({ onEvent } = {}) => {
  requireLiffId();
  emitLiffEvent(onEvent, {
    type: "liff_init_started"
  });

  if (!liffInitPromise) {
    liffInitPromise = liff.init({ liffId }).catch((error) => {
      liffInitPromise = null;
      emitLiffEvent(onEvent, {
        type: "request_error",
        operation: "lookup",
        errorMessage: error?.message || "liff_init_failed"
      });
      throw error;
    });
  }

  await liffInitPromise;
  emitLiffEvent(onEvent, {
    type: "liff_init_ready"
  });
  return liff;
};

export const ensureLiffReady = async ({ loginIfNeeded = false, onEvent } = {}) => {
  await initializeLiff({ onEvent });

  emitLiffEvent(onEvent, {
    type: "liff_ready_state",
    inClient: liff.isInClient(),
    isLoggedIn: liff.isLoggedIn()
  });

  if (!liff.isInClient()) {
    throw new Error("LIFF_NOT_IN_CLIENT");
  }

  if (!liff.isLoggedIn()) {
    if (loginIfNeeded) {
      liff.login();
      return null;
    }

    throw new Error("LIFF_LOGIN_REQUIRED");
  }

  return liff;
};

export const getLiffIdentityTokens = async ({
  loginIfNeeded = false,
  onEvent
} = {}) => {
  const liffClient = await ensureLiffReady({ loginIfNeeded, onEvent });

  if (!liffClient) {
    return null;
  }

  const tokens = {
    idToken:
      typeof liff.getIDToken === "function" ? String(liff.getIDToken() || "") : "",
    accessToken:
      typeof liff.getAccessToken === "function"
        ? String(liff.getAccessToken() || "")
        : "",
    liffAppId: liffId || ""
  };

  emitLiffEvent(onEvent, {
    type: "liff_token_state",
    hasIdToken: Boolean(tokens.idToken),
    hasAccessToken: Boolean(tokens.accessToken),
    liffAppIdPresent: Boolean(tokens.liffAppId)
  });

  return tokens;
};

export const buildLiffIdentityHeaders = ({
  idToken = "",
  accessToken = "",
  liffAppId = ""
} = {}) => {
  const headers = {};

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
    headers["X-Line-Access-Token"] = accessToken;
  }

  if (idToken) {
    headers["X-Line-Id-Token"] = idToken;
  }

  if (liffAppId) {
    headers["X-Liff-App-Id"] = liffAppId;
  }

  return headers;
};

export const getLiffIdentityHeaders = async ({
  loginIfNeeded = false,
  onEvent
} = {}) =>
  buildLiffIdentityHeaders(
    (await getLiffIdentityTokens({ loginIfNeeded, onEvent })) || {}
  );
