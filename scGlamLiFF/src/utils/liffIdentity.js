import liff from "@line/liff";
import { liffId } from "../config/env";

let liffInitPromise = null;

const requireLiffId = () => {
  if (!liffId) {
    throw new Error("Missing VITE_LIFF_ID");
  }
};

export const initializeLiff = async () => {
  requireLiffId();

  if (!liffInitPromise) {
    liffInitPromise = liff.init({ liffId }).catch((error) => {
      liffInitPromise = null;
      throw error;
    });
  }

  await liffInitPromise;
  return liff;
};

export const ensureLiffReady = async ({ loginIfNeeded = false } = {}) => {
  await initializeLiff();

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

export const getLiffIdentityTokens = async ({ loginIfNeeded = false } = {}) => {
  const liffClient = await ensureLiffReady({ loginIfNeeded });

  if (!liffClient) {
    return null;
  }

  return {
    idToken:
      typeof liff.getIDToken === "function" ? String(liff.getIDToken() || "") : "",
    accessToken:
      typeof liff.getAccessToken === "function"
        ? String(liff.getAccessToken() || "")
        : "",
    liffAppId: liffId || ""
  };
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

export const getLiffIdentityHeaders = async ({ loginIfNeeded = false } = {}) =>
  buildLiffIdentityHeaders(
    (await getLiffIdentityTokens({ loginIfNeeded })) || {}
  );
