import liff from "@line/liff";
import {
  getLiffIdentityTokens,
  initializeLiff
} from "./liffIdentity";
import {
  getBranchDeviceGuardRuntimeConfig,
  logBranchDeviceGuardDebug,
  summarizeToken
} from "./branchDeviceGuardDebug";

const trimText = (value) => (typeof value === "string" ? value.trim() : "");

const getDecodedIdToken = () =>
  typeof liff.getDecodedIDToken === "function" ? liff.getDecodedIDToken() || null : null;

const getProfileSafely = async () => {
  if (typeof liff.getProfile !== "function") {
    return null;
  }

  try {
    return await liff.getProfile();
  } catch (error) {
    logBranchDeviceGuardDebug("auth_profile_lookup_failed", {
      ...getBranchDeviceGuardRuntimeConfig(),
      errorMessage: error?.message || "profile_lookup_failed"
    });
    return null;
  }
};

export const initializeLIFFAndGetUser = async (onStep) => {
  onStep?.({
    step: "init_start"
  });
  logBranchDeviceGuardDebug("auth_session_bootstrap_started", {
    ...getBranchDeviceGuardRuntimeConfig()
  });

  await initializeLiff();

  const sanitizeLiffTokens = (label) => {
    if (typeof window === "undefined") {
      return false;
    }
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    const tokenPattern = /access_token=|id_token=|context_token=/i;
    const hasTokens = tokenPattern.test(hash) || tokenPattern.test(search);
    if (!hasTokens) {
      return false;
    }
    const cleanUrl = `${window.location.pathname}${window.location.search}#/`;
    if (window.history?.replaceState) {
      window.history.replaceState(null, "", cleanUrl);
      if (typeof HashChangeEvent !== "undefined") {
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
    } else {
      window.location.hash = "#/";
    }
    onStep?.({ step: "hash_cleared", hashCleared: true, label });
    return true;
  };

  sanitizeLiffTokens("after_init");
  setTimeout(() => sanitizeLiffTokens("after_init_t1"), 200);
  setTimeout(() => sanitizeLiffTokens("after_init_t2"), 800);

  onStep?.({
    step: "init_done",
    isInClient: liff.isInClient(),
    isLoggedIn: liff.isLoggedIn()
  });

  if (!liff.isInClient()) {
    onStep?.({
      step: "blocked_not_in_client",
      isInClient: false
    });
    throw new Error("LIFF_NOT_IN_CLIENT");
  }

  if (!liff.isLoggedIn()) {
    onStep?.({ step: "login_required" });
    liff.login();
    return null;
  }

  const identityTokens = await getLiffIdentityTokens();
  const idToken = trimText(identityTokens?.idToken);
  const accessToken = trimText(identityTokens?.accessToken);

  onStep?.({
    step: "token_ready",
    hasIdToken: Boolean(idToken),
    hasAccessToken: Boolean(accessToken)
  });
  logBranchDeviceGuardDebug("auth_token_state", {
    ...getBranchDeviceGuardRuntimeConfig(),
    hasIdToken: Boolean(idToken),
    idTokenLength: summarizeToken(idToken).length,
    hasAccessToken: Boolean(accessToken),
    accessTokenLength: summarizeToken(accessToken).length
  });

  if (!idToken && !accessToken) {
    throw new Error("Missing LINE LIFF token");
  }

  const decodedIdToken = getDecodedIdToken();
  const profile = await getProfileSafely();
  const lineUserId =
    trimText(decodedIdToken?.sub || decodedIdToken?.userId) ||
    trimText(profile?.userId);
  const displayName =
    trimText(decodedIdToken?.name) ||
    trimText(profile?.displayName) ||
    "LINE User";
  const pictureUrl =
    trimText(decodedIdToken?.picture) ||
    trimText(profile?.pictureUrl) ||
    "";

  if (!lineUserId) {
    throw new Error("Unable to resolve LINE user id from LIFF session");
  }

  onStep?.({
    step: "session_ready_local",
    hasIdToken: Boolean(idToken),
    hasAccessToken: Boolean(accessToken),
    hasDecodedIdToken: Boolean(decodedIdToken),
    hasProfile: Boolean(profile)
  });
  logBranchDeviceGuardDebug("auth_session_local_identity", {
    ...getBranchDeviceGuardRuntimeConfig(),
    hasIdToken: Boolean(idToken),
    idTokenLength: summarizeToken(idToken).length,
    hasAccessToken: Boolean(accessToken),
    accessTokenLength: summarizeToken(accessToken).length,
    hasDecodedIdToken: Boolean(decodedIdToken),
    hasProfile: Boolean(profile),
    resolvedLineUserIdLength: lineUserId.length
  });

  return {
    mode: "real",
    lineUserId,
    displayName,
    pictureUrl,
    statusMessage: "LIFF session ready"
  };
};
