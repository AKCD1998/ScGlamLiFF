import liff from "@line/liff";
import { liffId } from "../config/env";
import {
  getBranchDeviceGuardRuntimeConfig,
  logBranchDeviceGuardDebug,
  summarizeToken
} from "./branchDeviceGuardDebug";

let liffInitPromise = null;

const emitLiffEvent = (onEvent, event) => {
  onEvent?.(event);
  logBranchDeviceGuardDebug(event.type, event);
};

const createLiffRuntimeError = (message, code, details = null) => {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
};

const requireLiffId = () => {
  if (!liffId) {
    logBranchDeviceGuardDebug("liff_missing_id", {
      ...getBranchDeviceGuardRuntimeConfig(),
      hasLiffId: false
    });
    throw new Error("Missing VITE_LIFF_ID");
  }
};

export const initializeLiff = async ({ onEvent } = {}) => {
  requireLiffId();
  emitLiffEvent(onEvent, {
    type: "liff_init_started",
    ...getBranchDeviceGuardRuntimeConfig()
  });

  if (!liffInitPromise) {
    liffInitPromise = liff.init({ liffId }).catch((error) => {
      liffInitPromise = null;
      const wrappedError = createLiffRuntimeError(
        error?.message || "LIFF init failed",
        "LIFF_INIT_FAILED",
        error
      );
      emitLiffEvent(onEvent, {
        type: "liff_init_failed",
        errorMessage: wrappedError.message,
        ...getBranchDeviceGuardRuntimeConfig()
      });
      throw wrappedError;
    });
  }

  await liffInitPromise;
  emitLiffEvent(onEvent, {
    type: "liff_init_ready",
    ...getBranchDeviceGuardRuntimeConfig()
  });
  return liff;
};

export const ensureLiffReady = async ({ loginIfNeeded = false, onEvent } = {}) => {
  await initializeLiff({ onEvent });

  emitLiffEvent(onEvent, {
    type: "liff_ready_state",
    inClient: liff.isInClient(),
    isLoggedIn: liff.isLoggedIn(),
    ...getBranchDeviceGuardRuntimeConfig()
  });

  if (!liff.isInClient()) {
    throw createLiffRuntimeError(
      "LIFF_NOT_IN_CLIENT",
      "LIFF_OUTSIDE_LINE_CLIENT"
    );
  }

  if (!liff.isLoggedIn()) {
    if (loginIfNeeded) {
      liff.login();
      return null;
    }

    throw createLiffRuntimeError(
      "LIFF_LOGIN_REQUIRED",
      "LIFF_NOT_LOGGED_IN"
    );
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
    idTokenLength: summarizeToken(tokens.idToken).length,
    hasAccessToken: Boolean(tokens.accessToken),
    accessTokenLength: summarizeToken(tokens.accessToken).length,
    liffAppIdPresent: Boolean(tokens.liffAppId),
    ...getBranchDeviceGuardRuntimeConfig()
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
