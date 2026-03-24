import { createContext, useContext, useEffect, useState } from "react";
import { apiBaseUrl, liffId } from "../config/env";
import { useAuth } from "./AuthContext";
import {
  BranchDeviceRegistrationApiError,
  createBranchDeviceRegistration,
  getMyBranchDeviceRegistration
} from "../services/branchDeviceRegistrationService";
import {
  BranchDeviceStaffAuthApiError,
  getMyStaffSession,
  loginStaffSession
} from "../services/branchDeviceStaffAuthService";
import {
  getBranchDeviceGuardRuntimeConfig,
  logBranchDeviceGuardDebug,
  summarizeBranchDevicePayload
} from "../utils/branchDeviceGuardDebug";

const LOOKUP_URL = "/api/branch-device-registrations/me";
const REGISTER_URL = "/api/branch-device-registrations";

export const BranchDeviceContext = createContext({
  status: "loading",
  reasonCode: "",
  guardEnabled: false,
  branchId: "",
  registration: null,
  lineIdentity: null,
  errorMessage: "",
  submitStatus: "idle",
  submitError: "",
  staffSessionStatus: "idle",
  staffLoginStatus: "idle",
  staffLoginError: "",
  staffUser: null,
  debug: null,
  refreshRegistration: async () => {},
  refreshStaffSession: async () => {},
  forceStaffLoginRecovery: () => {},
  registerDevice: async () => {},
  loginStaff: async () => {}
});

const trimText = (value) => (typeof value === "string" ? value.trim() : "");

const createDebugState = (overrides = {}) => {
  const runtimeConfig = getBranchDeviceGuardRuntimeConfig();

  return {
    currentPageUrl: runtimeConfig.currentPageUrl,
    apiBaseUrl: apiBaseUrl || "(relative /api)",
    liffId: runtimeConfig.liffId || "",
    liffIdPresent: Boolean(liffId),
    liffReady: null,
    inClient: null,
    loggedIn: null,
    hasIdToken: null,
    idTokenLength: 0,
    hasAccessToken: null,
    accessTokenLength: 0,
    authorizationHeaderAttached: false,
    xLineIdTokenAttached: false,
    xLineAccessTokenAttached: false,
    usesConfiguredApiBase: null,
    requestStarted: false,
    lastRequestUrl: LOOKUP_URL,
    lastResponseStatus: null,
    lastResponseBody: null,
    lastReason: "",
    lastRegisterStarted: false,
    lastRegisterUrl: REGISTER_URL,
    lastRegisterStatus: null,
    lastRegisterResponse: null,
    staffSessionStarted: false,
    lastStaffSessionUrl: "/api/auth/me",
    lastStaffSessionStatus: null,
    lastStaffSessionResponse: null,
    staffLoginStarted: false,
    lastStaffLoginUrl: "/api/auth/login",
    lastStaffLoginStatus: null,
    lastStaffLoginResponse: null,
    lastGuardState: "loading",
    lastReasonCode: "",
    ...overrides
  };
};

const createBaseState = ({
  status,
  reasonCode = "",
  guardEnabled,
  branchId = "",
  registration = null,
  lineIdentity = null,
  errorMessage = "",
  submitStatus = "idle",
  submitError = "",
  staffSessionStatus = "idle",
  staffLoginStatus = "idle",
  staffLoginError = "",
  staffUser = null,
  debug = createDebugState()
}) => ({
  status,
  reasonCode,
  guardEnabled,
  branchId,
  registration,
  lineIdentity,
  errorMessage,
  submitStatus,
  submitError,
  staffSessionStatus,
  staffLoginStatus,
  staffLoginError,
  staffUser,
  debug
});

const createBypassedState = () =>
  createBaseState({
    status: "active",
    reasonCode: "mock_mode_bypass",
    guardEnabled: false,
    debug: createDebugState({
      lastGuardState: "active",
      lastReasonCode: "mock_mode_bypass"
    })
  });

const createInitialRealState = () =>
  createBaseState({
    status: "loading",
    reasonCode: "",
    guardEnabled: true,
    debug: createDebugState()
  });

const applyDebugEvent = (debugState, event = {}) => {
  const nextDebug = {
    ...(debugState || createDebugState())
  };

  nextDebug.currentPageUrl =
    trimText(event.currentPageUrl) || nextDebug.currentPageUrl || null;
  nextDebug.apiBaseUrl = trimText(event.apiBaseUrl) || nextDebug.apiBaseUrl;
  nextDebug.liffId = trimText(event.liffId) || nextDebug.liffId || "";
  nextDebug.liffIdPresent =
    typeof event.liffIdPresent === "boolean"
      ? event.liffIdPresent
      : nextDebug.liffIdPresent;

  switch (event.type) {
    case "liff_init_started":
      nextDebug.liffReady = false;
      break;
    case "liff_init_ready":
      nextDebug.liffReady = true;
      break;
    case "liff_init_failed":
      nextDebug.liffReady = false;
      nextDebug.lastReason = "liff_init_failed";
      break;
    case "liff_ready_state":
      nextDebug.inClient =
        typeof event.inClient === "boolean" ? event.inClient : nextDebug.inClient;
      nextDebug.loggedIn =
        typeof event.isLoggedIn === "boolean"
          ? event.isLoggedIn
          : nextDebug.loggedIn;
      break;
    case "liff_token_state":
      nextDebug.hasIdToken =
        typeof event.hasIdToken === "boolean"
          ? event.hasIdToken
          : nextDebug.hasIdToken;
      nextDebug.idTokenLength =
        typeof event.idTokenLength === "number"
          ? event.idTokenLength
          : nextDebug.idTokenLength;
      nextDebug.hasAccessToken =
        typeof event.hasAccessToken === "boolean"
          ? event.hasAccessToken
          : nextDebug.hasAccessToken;
      nextDebug.accessTokenLength =
        typeof event.accessTokenLength === "number"
          ? event.accessTokenLength
          : nextDebug.accessTokenLength;
      break;
    case "liff_identity_headers":
    case "missing_token":
      nextDebug.authorizationHeaderAttached =
        typeof event.authorizationAttached === "boolean"
          ? event.authorizationAttached
          : nextDebug.authorizationHeaderAttached;
      nextDebug.xLineIdTokenAttached =
        typeof event.xLineIdTokenAttached === "boolean"
          ? event.xLineIdTokenAttached
          : nextDebug.xLineIdTokenAttached;
      nextDebug.xLineAccessTokenAttached =
        typeof event.xLineAccessTokenAttached === "boolean"
          ? event.xLineAccessTokenAttached
          : nextDebug.xLineAccessTokenAttached;
      nextDebug.hasIdToken =
        typeof event.hasIdToken === "boolean"
          ? event.hasIdToken
          : nextDebug.hasIdToken;
      nextDebug.idTokenLength =
        typeof event.idTokenLength === "number"
          ? event.idTokenLength
          : nextDebug.idTokenLength;
      nextDebug.hasAccessToken =
        typeof event.hasAccessToken === "boolean"
          ? event.hasAccessToken
          : nextDebug.hasAccessToken;
      nextDebug.accessTokenLength =
        typeof event.accessTokenLength === "number"
          ? event.accessTokenLength
          : nextDebug.accessTokenLength;
      if (event.type === "missing_token") {
        nextDebug.lastReason = "missing_token";
      }
      break;
    case "request_start":
      if (event.operation === "lookup") {
        nextDebug.requestStarted = true;
        nextDebug.lastRequestUrl = event.url || nextDebug.lastRequestUrl;
        nextDebug.lastResponseStatus = null;
        nextDebug.lastResponseBody = null;
        nextDebug.authorizationHeaderAttached =
          typeof event.authorizationAttached === "boolean"
            ? event.authorizationAttached
            : nextDebug.authorizationHeaderAttached;
        nextDebug.xLineIdTokenAttached =
          typeof event.xLineIdTokenAttached === "boolean"
            ? event.xLineIdTokenAttached
            : nextDebug.xLineIdTokenAttached;
        nextDebug.xLineAccessTokenAttached =
          typeof event.xLineAccessTokenAttached === "boolean"
            ? event.xLineAccessTokenAttached
            : nextDebug.xLineAccessTokenAttached;
        nextDebug.usesConfiguredApiBase =
          typeof event.usesConfiguredApiBase === "boolean"
            ? event.usesConfiguredApiBase
            : nextDebug.usesConfiguredApiBase;
      }
      if (event.operation === "register") {
        nextDebug.lastRegisterStarted = true;
        nextDebug.lastRegisterUrl = event.url || nextDebug.lastRegisterUrl;
        nextDebug.lastRegisterStatus = null;
        nextDebug.lastRegisterResponse = null;
      }
      break;
    case "response":
      if (event.operation === "lookup") {
        nextDebug.lastResponseStatus = event.status ?? null;
        nextDebug.lastResponseBody = summarizeBranchDevicePayload(event.body);
        nextDebug.lastReason = trimText(event.body?.reason) || nextDebug.lastReason;
      }
      if (event.operation === "register") {
        nextDebug.lastRegisterStatus = event.status ?? null;
        nextDebug.lastRegisterResponse = summarizeBranchDevicePayload(event.body);
      }
      break;
    case "request_error":
      if (event.operation === "lookup") {
        nextDebug.lastResponseStatus = event.status ?? null;
        nextDebug.lastResponseBody = {
          error: trimText(event.errorMessage) || "request_failed"
        };
        nextDebug.lastReason =
          trimText(event.reason) ||
          trimText(event.errorMessage) ||
          nextDebug.lastReason;
      }
      if (event.operation === "register") {
        nextDebug.lastRegisterStatus = event.status ?? null;
        nextDebug.lastRegisterResponse = {
          error: trimText(event.errorMessage) || "request_failed"
        };
      }
      break;
    case "staff_auth_request_start":
      if (event.operation === "staff_session") {
        nextDebug.staffSessionStarted = true;
        nextDebug.lastStaffSessionUrl =
          trimText(event.url) || nextDebug.lastStaffSessionUrl;
        nextDebug.lastStaffSessionStatus = null;
        nextDebug.lastStaffSessionResponse = null;
      }
      if (event.operation === "staff_login") {
        nextDebug.staffLoginStarted = true;
        nextDebug.lastStaffLoginUrl =
          trimText(event.url) || nextDebug.lastStaffLoginUrl;
        nextDebug.lastStaffLoginStatus = null;
        nextDebug.lastStaffLoginResponse = null;
      }
      break;
    case "staff_auth_response":
      if (event.operation === "staff_session") {
        nextDebug.lastStaffSessionStatus = event.status ?? null;
        nextDebug.lastStaffSessionResponse = event.body || null;
      }
      if (event.operation === "staff_login") {
        nextDebug.lastStaffLoginStatus = event.status ?? null;
        nextDebug.lastStaffLoginResponse = event.body || null;
      }
      break;
    case "staff_auth_request_error":
      if (event.operation === "staff_session") {
        nextDebug.lastStaffSessionStatus = event.status ?? null;
        nextDebug.lastStaffSessionResponse = {
          error: trimText(event.errorMessage) || "request_failed"
        };
      }
      if (event.operation === "staff_login") {
        nextDebug.lastStaffLoginStatus = event.status ?? null;
        nextDebug.lastStaffLoginResponse = {
          error: trimText(event.errorMessage) || "request_failed"
        };
      }
      break;
    default:
      break;
  }

  return nextDebug;
};

const createLoadingState = (currentState) =>
  createBaseState({
    ...currentState,
    status: "loading",
    reasonCode: "",
    errorMessage: "",
    submitStatus: currentState?.submitStatus || "idle",
    submitError: currentState?.submitError || "",
    debug: {
      ...(currentState?.debug || createDebugState()),
      lastGuardState: "loading",
      lastReasonCode: ""
    }
  });

const isMissingStaffAuthReason = (value) =>
  trimText(value) === "missing_staff_auth";

const getLookupStaffCookiePresent = (snapshot) => {
  if (typeof snapshot?.staffCookiePresent === "boolean") {
    return snapshot.staffCookiePresent;
  }

  if (typeof snapshot?.staff_cookie_present === "boolean") {
    return snapshot.staff_cookie_present;
  }

  return null;
};

const getStaffSessionStatusFromError = (error) =>
  isMissingStaffAuthReason(error?.reason || error?.payload?.reason) ||
  error?.status === 401
    ? "missing_staff_auth"
    : "error";

const createUiStateFromLookupSnapshot = (snapshot, currentState) => {
  const reasonCode =
    trimText(snapshot?.reason) ||
    (!snapshot?.registered ? "not_registered" : snapshot?.active ? "active" : "inactive");
  const branchId = trimText(snapshot?.branchId || snapshot?.branch_id);
  const staffCookiePresent = getLookupStaffCookiePresent(snapshot);
  const shouldKeepMissingStaffAuth =
    reasonCode === "active" &&
    currentState?.staffSessionStatus === "missing_staff_auth" &&
    staffCookiePresent !== true;
  const shouldForceMissingStaffAuth =
    reasonCode === "active" &&
    (staffCookiePresent === false || shouldKeepMissingStaffAuth);
  const shouldRecheckStaffSession =
    reasonCode === "active" &&
    !shouldForceMissingStaffAuth &&
    currentState?.staffSessionStatus !== "authenticated";

  const nextState = createBaseState({
    ...currentState,
    status:
      reasonCode === "active"
        ? "active"
        : reasonCode === "inactive"
          ? "inactive"
          : "not_registered",
    reasonCode,
    guardEnabled: true,
    branchId: reasonCode === "not_registered" ? "" : branchId,
    registration: snapshot?.registration || null,
    lineIdentity: snapshot?.lineIdentity || snapshot?.line_identity || null,
    errorMessage: "",
    submitStatus: "idle",
    submitError: "",
    staffSessionStatus: shouldForceMissingStaffAuth
      ? "missing_staff_auth"
      : shouldRecheckStaffSession
        ? "idle"
        : currentState?.staffSessionStatus || "idle",
    staffLoginStatus: shouldRecheckStaffSession || shouldForceMissingStaffAuth
      ? "idle"
      : currentState?.staffLoginStatus || "idle",
    staffLoginError: shouldRecheckStaffSession || shouldForceMissingStaffAuth
      ? ""
      : currentState?.staffLoginError || "",
    staffUser:
      shouldRecheckStaffSession || shouldForceMissingStaffAuth
        ? null
        : currentState?.staffUser || null,
    debug: {
      ...(currentState?.debug || createDebugState()),
      lastGuardState:
        reasonCode === "active"
          ? "active"
          : reasonCode === "inactive"
            ? "inactive"
            : "not_registered",
      lastReasonCode: reasonCode,
      lastReason: reasonCode
    }
  });

  logBranchDeviceGuardDebug("ui_status_mapped", {
    status: nextState.status,
    reasonCode,
    branchId: nextState.branchId || null
  });
  logBranchDeviceGuardDebug("device_registration_resolved", {
    status: nextState.status,
    reasonCode,
    branchId: nextState.branchId || null,
    staffCookiePresent
  });
  logBranchDeviceGuardDebug("staff_session_transition", {
    source: "lookup_snapshot",
    status: nextState.status,
    reasonCode,
    staffSessionStatus: nextState.staffSessionStatus,
    staffCookiePresent
  });

  return nextState;
};

const mapLookupErrorToState = (error, currentState) => {
  let status = "backend_error";
  let reasonCode = "backend_error";
  let errorMessage = error?.message || "ตรวจสอบอุปกรณ์ไม่สำเร็จ";

  if (error?.code === "LIFF_INIT_FAILED") {
    status = "liff_init_failed";
    reasonCode = "liff_init_failed";
    errorMessage = "เริ่มต้น LIFF ไม่สำเร็จ";
  } else if (
    error?.code === "LIFF_OUTSIDE_LINE_CLIENT" ||
    error?.message === "LIFF_NOT_IN_CLIENT"
  ) {
    status = "outside_line_client";
    reasonCode = "outside_line_client";
    errorMessage = "กรุณาเปิดผ่าน LINE";
  } else if (
    error?.code === "LIFF_NOT_LOGGED_IN" ||
    error?.message === "LIFF_LOGIN_REQUIRED"
  ) {
    status = "not_logged_in";
    reasonCode = "not_logged_in";
    errorMessage = "ไม่พบ LIFF session สำหรับตรวจสอบเครื่อง";
  } else if (error?.message === "Missing VITE_LIFF_ID") {
    status = "backend_error";
    reasonCode = "missing_liff_id";
    errorMessage = "ยังไม่ได้ตั้งค่า LIFF ID";
  } else if (error instanceof BranchDeviceRegistrationApiError) {
    const apiReason = trimText(error.reason || error.payload?.reason);

    if (error.status === 400 && apiReason === "missing_token") {
      status = "missing_token";
      reasonCode = "missing_token";
      errorMessage = "ไม่พบ LIFF token สำหรับยืนยันเครื่องนี้";
    } else if (error.status === 401) {
      status = "invalid_token";
      reasonCode = apiReason || "invalid_token";
      errorMessage = "LIFF token ไม่ผ่านการยืนยัน";
    } else {
      status = "backend_error";
      reasonCode = apiReason || "backend_error";
      errorMessage = error.message || "ตรวจสอบอุปกรณ์ไม่สำเร็จ";
    }
  }

  const nextState = createBaseState({
    ...currentState,
    status,
    reasonCode,
    guardEnabled: true,
    branchId: "",
    registration: null,
    errorMessage,
    submitStatus: "idle",
    submitError: "",
    debug: {
      ...(currentState?.debug || createDebugState()),
      lastGuardState: status,
      lastReasonCode: reasonCode,
      lastReason: reasonCode
    }
  });

  logBranchDeviceGuardDebug("ui_status_mapped", {
    status,
    reasonCode,
    errorMessage
  });

  return nextState;
};

const getRegisterErrorMessage = (error) => {
  if (error instanceof BranchDeviceRegistrationApiError) {
    const reasonCode = trimText(error.reason || error.payload?.reason);

    if (reasonCode === "missing_staff_auth") {
      return "ไม่พบ staff cookie และยังไม่ได้ส่งชื่อผู้ใช้/รหัสผ่านพนักงานสำหรับลงทะเบียนอุปกรณ์";
    }

    if (reasonCode === "invalid_staff_credentials") {
      return "ชื่อผู้ใช้หรือรหัสผ่านพนักงานไม่ถูกต้อง";
    }

    if (reasonCode === "invalid_token") {
      return "LIFF token ไม่ผ่านการยืนยัน จึงลงทะเบียนอุปกรณ์ไม่ได้";
    }

    if (reasonCode === "missing_token") {
      return "ไม่พบ LIFF token สำหรับยืนยันเครื่องนี้";
    }

    if (reasonCode === "missing_branch_id" || error.status === 400) {
      return error.message || "ข้อมูลลงทะเบียนไม่ครบ";
    }

    if (error.status === 401) {
      return "ยังไม่ได้เข้าสู่ระบบพนักงาน ไม่สามารถลงทะเบียนอุปกรณ์ได้";
    }

    return error.message || "ลงทะเบียนอุปกรณ์ไม่สำเร็จ";
  }

  return error?.message || "ลงทะเบียนอุปกรณ์ไม่สำเร็จ";
};

const getStaffLoginErrorMessage = (error, { confirmedSession = false } = {}) => {
  if (confirmedSession) {
    return "เข้าสู่ระบบแล้ว แต่ LIFF session นี้ยังไม่พบ cookie พนักงาน ระบบจะใช้ชื่อผู้ใช้/รหัสผ่านนี้เป็น fallback ตอนลงทะเบียน";
  }

  if (error instanceof BranchDeviceStaffAuthApiError) {
    const reasonCode = trimText(error.reason || error.payload?.reason);

    if (reasonCode === "login_failed" || error.status === 401) {
      return error.message || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
    }

    if (reasonCode === "bad_request" || error.status === 400) {
      return error.message || "กรอกชื่อผู้ใช้และรหัสผ่านให้ครบ";
    }

    return error.message || "เข้าสู่ระบบพนักงานไม่สำเร็จ";
  }

  return error?.message || "เข้าสู่ระบบพนักงานไม่สำเร็จ";
};

export function BranchDeviceProvider({ children }) {
  const { mode } = useAuth();
  const [state, setState] = useState(() =>
    mode === "real" ? createInitialRealState() : createBypassedState()
  );

  const handleLookupEvent = (event) => {
    setState((current) => ({
      ...current,
      debug: applyDebugEvent(current.debug, event)
    }));
  };

  const handleRegisterEvent = (event) => {
    setState((current) => ({
      ...current,
      debug: applyDebugEvent(current.debug, event)
    }));
  };

  const handleStaffAuthEvent = (event) => {
    setState((current) => {
      const baseState = current || createInitialRealState();
      const nextState = {
        ...baseState,
        debug: applyDebugEvent(baseState.debug, event)
      };
      const isStaffSessionRequestStart =
        event?.operation === "staff_session" &&
        event?.type === "staff_auth_request_start";
      const isStaffSessionSuccess =
        event?.operation === "staff_session" &&
        event?.type === "staff_auth_response" &&
        event?.status === 200;
      const isStaffSession401 =
        event?.operation === "staff_session" &&
        event?.type === "staff_auth_response" &&
        (event?.status === 401 || isMissingStaffAuthReason(event?.body?.reason));
      const isStaffLoginRequestStart =
        event?.operation === "staff_login" &&
        event?.type === "staff_auth_request_start";
      const isStaffLoginSuccess =
        event?.operation === "staff_login" &&
        event?.type === "staff_auth_response" &&
        event?.status === 200;
      const isStaffLogin401 =
        event?.operation === "staff_login" &&
        event?.type === "staff_auth_response" &&
        (event?.status === 401 ||
          trimText(event?.body?.reason) === "login_failed");

      if (isStaffLoginRequestStart) {
        logBranchDeviceGuardDebug("staff_login_started", {
          status: baseState.status,
          reasonCode: baseState.reasonCode,
          staffSessionStatus: baseState.staffSessionStatus,
          staffLoginStatus: baseState.staffLoginStatus
        });
      }

      if (isStaffLoginSuccess) {
        logBranchDeviceGuardDebug("staff_login_200", {
          status: event?.status ?? 200,
          reasonCode: trimText(event?.body?.reason) || null
        });
      }

      if (isStaffLogin401) {
        logBranchDeviceGuardDebug("staff_login_401", {
          status: event?.status ?? 401,
          reasonCode: trimText(event?.body?.reason) || "login_failed"
        });
      }

      if (isStaffSessionRequestStart) {
        logBranchDeviceGuardDebug("auth_me_started", {
          status: baseState.status,
          reasonCode: baseState.reasonCode,
          staffSessionStatus: baseState.staffSessionStatus
        });
      }

      if (isStaffSessionSuccess) {
        logBranchDeviceGuardDebug("auth_me_200", {
          status: event?.status ?? 200,
          reasonCode: trimText(event?.body?.reason) || null,
          hasUser: Boolean(event?.body?.hasUser)
        });
      }

      if (isStaffSession401) {
        nextState.staffSessionStatus = "missing_staff_auth";
        nextState.staffUser = null;
        logBranchDeviceGuardDebug("auth_me_401", {
          status: event?.status ?? 401,
          reasonCode: trimText(event?.body?.reason) || "missing_staff_auth",
          hasUser: Boolean(event?.body?.hasUser)
        });
        logBranchDeviceGuardDebug("staff_session_transition", {
          source: "staff_auth_response",
          status: event?.status ?? null,
          reasonCode: trimText(event?.body?.reason) || "missing_staff_auth",
          staffSessionStatus: "missing_staff_auth"
        });
      }

      return nextState;
    });
  };

  useEffect(() => {
    let isActive = true;

    if (mode !== "real") {
      setState(createBypassedState());
      return () => {
        isActive = false;
      };
    }

    setState((current) => createLoadingState(current || createInitialRealState()));

    const run = async () => {
      try {
        const snapshot = await getMyBranchDeviceRegistration({
          onEvent: handleLookupEvent
        });

        if (!isActive) {
          return;
        }

        setState((current) =>
          createUiStateFromLookupSnapshot(snapshot, current || createInitialRealState())
        );
      } catch (error) {
        if (!isActive) {
          return;
        }

        setState((current) =>
          mapLookupErrorToState(error, current || createInitialRealState())
        );
      }
    };

    run();

    return () => {
      isActive = false;
    };
  }, [mode]);

  useEffect(() => {
    let isActive = true;

    const shouldCheckStaffSession =
      mode === "real" &&
      (state.status === "not_registered" || state.status === "active");

    if (!shouldCheckStaffSession) {
      return () => {
        isActive = false;
      };
    }

    if (state.staffSessionStatus !== "idle") {
      return () => {
        isActive = false;
      };
    }

    setState((current) => ({
      ...(current || createInitialRealState()),
      staffSessionStatus: "checking"
    }));
    logBranchDeviceGuardDebug("staff_session_transition", {
      source: "startup_effect_started",
      status: state.status,
      reasonCode: state.reasonCode,
      staffSessionStatus: "checking"
    });

    const run = async () => {
      try {
        const payload = await getMyStaffSession({
          onEvent: handleStaffAuthEvent
        });

        if (!isActive) {
          return;
        }

        setState((current) => ({
          ...(current || createInitialRealState()),
          staffSessionStatus: "authenticated",
          staffLoginError: "",
          staffUser:
            payload?.user && typeof payload.user === "object"
              ? payload.user
              : current?.staffUser || null
        }));
        logBranchDeviceGuardDebug("staff_session_transition", {
          source: "startup_effect_success",
          status: state.status,
          reasonCode: state.reasonCode,
          staffSessionStatus: "authenticated"
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        const nextStaffSessionStatus = getStaffSessionStatusFromError(error);

        setState((current) => ({
          ...(current || createInitialRealState()),
          staffSessionStatus: nextStaffSessionStatus,
          staffUser:
            nextStaffSessionStatus === "missing_staff_auth"
              ? null
              : current?.staffUser || null
        }));
        logBranchDeviceGuardDebug("staff_session_transition", {
          source: "startup_effect_error",
          status: state.status,
          reasonCode: trimText(error?.reason || error?.payload?.reason) || null,
          staffSessionStatus: nextStaffSessionStatus
        });
      }
    };

    run();

    return () => {
      isActive = false;
    };
  }, [mode, state.staffSessionStatus, state.status]);

  const refreshRegistration = async () => {
    if (mode !== "real") {
      setState(createBypassedState());
      return null;
    }

    setState((current) => createLoadingState(current || createInitialRealState()));

    try {
      const snapshot = await getMyBranchDeviceRegistration({
        onEvent: handleLookupEvent
      });
      setState((current) =>
        createUiStateFromLookupSnapshot(snapshot, current || createInitialRealState())
      );
      return snapshot;
    } catch (error) {
      setState((current) =>
        mapLookupErrorToState(error, current || createInitialRealState())
      );
      throw error;
    }
  };

  const refreshStaffSession = async () => {
    if (mode !== "real") {
      return null;
    }

    setState((current) => ({
      ...(current || createInitialRealState()),
      staffSessionStatus: "checking"
    }));
    logBranchDeviceGuardDebug("staff_session_transition", {
      source: "manual_refresh_started",
      status: state.status,
      reasonCode: state.reasonCode,
      staffSessionStatus: "checking"
    });

    try {
      const payload = await getMyStaffSession({
        onEvent: handleStaffAuthEvent
      });

      setState((current) => ({
        ...(current || createInitialRealState()),
        staffSessionStatus: "authenticated",
        staffLoginError: "",
        staffUser:
          payload?.user && typeof payload.user === "object"
            ? payload.user
            : current?.staffUser || null
      }));
      logBranchDeviceGuardDebug("staff_session_transition", {
        source: "manual_refresh_success",
        status: state.status,
        reasonCode: state.reasonCode,
        staffSessionStatus: "authenticated"
      });

      return payload;
    } catch (error) {
      const nextStaffSessionStatus = getStaffSessionStatusFromError(error);

      setState((current) => ({
        ...(current || createInitialRealState()),
        staffSessionStatus: nextStaffSessionStatus,
        staffUser:
          nextStaffSessionStatus === "missing_staff_auth"
            ? null
            : current?.staffUser || null
      }));
      logBranchDeviceGuardDebug("staff_session_transition", {
        source: "manual_refresh_error",
        status: state.status,
        reasonCode: trimText(error?.reason || error?.payload?.reason) || null,
        staffSessionStatus: nextStaffSessionStatus
      });
      throw error;
    }
  };

  const forceStaffLoginRecovery = ({
    source = "manual_safety_fallback",
    reason = "missing_staff_auth"
  } = {}) => {
    setState((current) => ({
      ...(current || createInitialRealState()),
      staffSessionStatus: "missing_staff_auth",
      staffLoginStatus:
        current?.staffLoginStatus === "logging_in"
          ? "idle"
          : current?.staffLoginStatus || "idle",
      staffUser: null
    }));
    logBranchDeviceGuardDebug("forced_transition_to_login", {
      source,
      status: state.status,
      reasonCode: state.reasonCode,
      staffSessionStatus: state.staffSessionStatus,
      forceReason: reason
    });
  };

  const registerDevice = async ({
    branchId,
    deviceLabel,
    staffUsername = "",
    staffPassword = ""
  }) => {
    setState((current) => ({
      ...current,
      submitStatus: "submitting",
      submitError: ""
    }));

    try {
      const normalizedStaffUsername = trimText(staffUsername);
      const providedStaffPassword =
        typeof staffPassword === "string" ? staffPassword : "";
      const authPath =
        state.staffSessionStatus === "authenticated"
          ? "cookie"
          : normalizedStaffUsername && providedStaffPassword
            ? "explicit_credentials"
            : "cookie";

      await createBranchDeviceRegistration({
        branch_id: branchId,
        device_label: deviceLabel,
        ...(authPath === "explicit_credentials"
          ? {
              staff_username: normalizedStaffUsername,
              staff_password: providedStaffPassword
            }
          : {}),
        authPath,
        onEvent: handleRegisterEvent
      });

      const snapshot = await getMyBranchDeviceRegistration({
        onEvent: handleLookupEvent
      });

      setState((current) =>
        createUiStateFromLookupSnapshot(snapshot, {
          ...(current || createInitialRealState()),
          submitStatus: "idle",
          submitError: ""
        })
      );
      return snapshot;
    } catch (error) {
      const isMissingStaffAuth =
        error instanceof BranchDeviceRegistrationApiError &&
        trimText(error.reason || error.payload?.reason) === "missing_staff_auth";

      setState((current) => ({
        ...(current || createInitialRealState()),
        submitStatus: "error",
        submitError: getRegisterErrorMessage(error),
        staffSessionStatus: isMissingStaffAuth
          ? "missing_staff_auth"
          : current?.staffSessionStatus || "idle",
        debug: {
          ...((current && current.debug) || createDebugState()),
          lastGuardState: current?.status || "loading",
          lastReasonCode: current?.reasonCode || ""
        }
      }));
      throw error;
    }
  };

  const loginStaff = async ({ username, password }) => {
      setState((current) => ({
        ...(current || createInitialRealState()),
        staffLoginStatus: "logging_in",
        staffLoginError: "",
        submitError: ""
    }));

    try {
      await loginStaffSession(
        {
          username,
          password
        },
        {
          onEvent: handleStaffAuthEvent
        }
      );

      let sessionPayload;

      try {
        sessionPayload = await getMyStaffSession({
          onEvent: handleStaffAuthEvent
        });
      } catch (error) {
        error.__staffSessionConfirmationFailed = true;
        setState((current) => ({
          ...(current || createInitialRealState()),
          staffSessionStatus: "missing_staff_auth",
          staffLoginStatus: "login_failed",
          staffLoginError: getStaffLoginErrorMessage(error, {
            confirmedSession: true
          }),
          staffUser: null
        }));
        logBranchDeviceGuardDebug("staff_session_transition", {
          source: "staff_login_confirm_failed",
          status: state.status,
          reasonCode: trimText(error?.reason || error?.payload?.reason) || null,
          staffSessionStatus: "missing_staff_auth",
          staffLoginStatus: "login_failed",
          confirmedSession: false
        });
        throw error;
      }

      setState((current) => ({
        ...(current || createInitialRealState()),
        staffSessionStatus: "authenticated",
        staffLoginStatus: "login_success",
        staffLoginError: "",
        submitError: "",
        staffUser:
          sessionPayload?.user && typeof sessionPayload.user === "object"
            ? sessionPayload.user
            : current?.staffUser || null
      }));
      logBranchDeviceGuardDebug("staff_session_transition", {
        source: "staff_login_confirmed",
        status: state.status,
        reasonCode: state.reasonCode,
        staffSessionStatus: "authenticated",
        staffLoginStatus: "login_success",
        confirmedSession: true
      });

      return sessionPayload;
    } catch (error) {
      setState((current) => ({
        ...(current || createInitialRealState()),
        staffSessionStatus:
          current?.staffSessionStatus === "authenticated"
            ? "authenticated"
            : "missing_staff_auth",
        staffLoginStatus: "login_failed",
        staffLoginError: getStaffLoginErrorMessage(error, {
          confirmedSession: Boolean(error?.__staffSessionConfirmationFailed)
        }),
        staffUser:
          current?.staffSessionStatus === "authenticated" ? current?.staffUser : null
      }));
      if (!error?.__staffSessionConfirmationFailed) {
        logBranchDeviceGuardDebug("staff_session_transition", {
          source: "staff_login_failed",
          status: state.status,
          reasonCode: trimText(error?.reason || error?.payload?.reason) || null,
          staffSessionStatus:
            state.staffSessionStatus === "authenticated"
              ? "authenticated"
              : "missing_staff_auth",
          staffLoginStatus: "login_failed",
          confirmedSession: false
        });
      }
      throw error;
    }
  };

  return (
    <BranchDeviceContext.Provider
      value={{
        ...state,
        refreshRegistration,
        refreshStaffSession,
        forceStaffLoginRecovery,
        registerDevice,
        loginStaff
      }}
    >
      {children}
    </BranchDeviceContext.Provider>
  );
}

export const useBranchDevice = () => useContext(BranchDeviceContext);
