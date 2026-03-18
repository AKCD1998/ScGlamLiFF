import { createContext, useContext, useEffect, useState } from "react";
import { apiBaseUrl, liffId } from "../config/env";
import { useAuth } from "./AuthContext";
import {
  BranchDeviceRegistrationApiError,
  createBranchDeviceRegistration,
  getMyBranchDeviceRegistration
} from "../services/branchDeviceRegistrationService";
import {
  logBranchDeviceGuardDebug,
  summarizeBranchDevicePayload
} from "../utils/branchDeviceGuardDebug";

const LOOKUP_URL = "/api/branch-device-registrations/me";
const REGISTER_URL = "/api/branch-device-registrations";

const BranchDeviceContext = createContext({
  status: "request_never_started",
  reasonCode: "",
  guardEnabled: false,
  branchId: "",
  registration: null,
  lineIdentity: null,
  errorMessage: "",
  submitStatus: "idle",
  submitError: "",
  debug: null,
  refreshRegistration: async () => {},
  registerDevice: async () => {}
});

const trimText = (value) => (typeof value === "string" ? value.trim() : "");

const createDebugState = (overrides = {}) => ({
  apiBaseUrl: apiBaseUrl || "(relative /api)",
  liffIdPresent: Boolean(liffId),
  liffReady: null,
  inClient: null,
  isLoggedIn: null,
  hasIdToken: null,
  hasAccessToken: null,
  lastLookupStarted: false,
  lastLookupUrl: LOOKUP_URL,
  lastLookupStatus: null,
  lastLookupResponse: null,
  lastRegisterStarted: false,
  lastRegisterUrl: REGISTER_URL,
  lastRegisterStatus: null,
  lastRegisterResponse: null,
  lastGuardState: "request_never_started",
  lastReasonCode: "",
  ...overrides
});

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
    status: "request_never_started",
    reasonCode: "",
    guardEnabled: true,
    debug: createDebugState()
  });

const applyDebugEvent = (debugState, event = {}) => {
  const nextDebug = {
    ...(debugState || createDebugState())
  };

  switch (event.type) {
    case "liff_init_started":
      nextDebug.liffReady = false;
      break;
    case "liff_init_ready":
      nextDebug.liffReady = true;
      break;
    case "liff_ready_state":
      nextDebug.inClient =
        typeof event.inClient === "boolean" ? event.inClient : nextDebug.inClient;
      nextDebug.isLoggedIn =
        typeof event.isLoggedIn === "boolean"
          ? event.isLoggedIn
          : nextDebug.isLoggedIn;
      break;
    case "liff_token_state":
      nextDebug.hasIdToken =
        typeof event.hasIdToken === "boolean"
          ? event.hasIdToken
          : nextDebug.hasIdToken;
      nextDebug.hasAccessToken =
        typeof event.hasAccessToken === "boolean"
          ? event.hasAccessToken
          : nextDebug.hasAccessToken;
      break;
    case "request_start":
      if (event.operation === "lookup") {
        nextDebug.lastLookupStarted = true;
        nextDebug.lastLookupUrl = event.url || nextDebug.lastLookupUrl;
        nextDebug.lastLookupStatus = null;
        nextDebug.lastLookupResponse = null;
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
        nextDebug.lastLookupStatus = event.status ?? null;
        nextDebug.lastLookupResponse = summarizeBranchDevicePayload(event.body);
      }
      if (event.operation === "register") {
        nextDebug.lastRegisterStatus = event.status ?? null;
        nextDebug.lastRegisterResponse = summarizeBranchDevicePayload(event.body);
      }
      break;
    case "request_error":
      if (event.operation === "lookup") {
        nextDebug.lastLookupStatus = event.status ?? null;
        nextDebug.lastLookupResponse = {
          error: trimText(event.errorMessage) || "request_failed"
        };
      }
      if (event.operation === "register") {
        nextDebug.lastRegisterStatus = event.status ?? null;
        nextDebug.lastRegisterResponse = {
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

const createUiStateFromLookupSnapshot = (snapshot, currentState) => {
  const reasonCode =
    trimText(snapshot?.reason) ||
    (!snapshot?.registered ? "not_registered" : snapshot?.active ? "active" : "inactive");
  const branchId = trimText(snapshot?.branchId || snapshot?.branch_id);

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
    debug: {
      ...(currentState?.debug || createDebugState()),
      lastGuardState:
        reasonCode === "active"
          ? "active"
          : reasonCode === "inactive"
            ? "inactive"
            : "not_registered",
      lastReasonCode: reasonCode
    }
  });

  logBranchDeviceGuardDebug("ui_status_mapped", {
    status: nextState.status,
    reasonCode,
    branchId: nextState.branchId || null
  });

  return nextState;
};

const mapLookupErrorToState = (error, currentState) => {
  let status = "backend_error";
  let reasonCode = "backend_error";
  let errorMessage = error?.message || "ตรวจสอบอุปกรณ์ไม่สำเร็จ";

  if (error?.message === "LIFF_NOT_IN_CLIENT") {
    status = "request_never_started";
    reasonCode = "outside_line";
    errorMessage = "กรุณาเปิดผ่าน LINE";
  } else if (error?.message === "LIFF_LOGIN_REQUIRED") {
    status = "request_never_started";
    reasonCode = "login_required";
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
      lastReasonCode: reasonCode
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
      return "ยังไม่ได้เข้าสู่ระบบพนักงาน ไม่สามารถลงทะเบียนอุปกรณ์ได้";
    }

    if (reasonCode === "invalid_token") {
      return "LIFF token ไม่ผ่านการยืนยัน จึงลงทะเบียนอุปกรณ์ไม่ได้";
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

  const registerDevice = async ({ branchId, deviceLabel }) => {
    setState((current) => ({
      ...current,
      submitStatus: "submitting",
      submitError: ""
    }));

    try {
      await createBranchDeviceRegistration({
        branch_id: branchId,
        device_label: deviceLabel,
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
      setState((current) => ({
        ...(current || createInitialRealState()),
        submitStatus: "error",
        submitError: getRegisterErrorMessage(error),
        debug: {
          ...((current && current.debug) || createDebugState()),
          lastGuardState: current?.status || "request_never_started",
          lastReasonCode: current?.reasonCode || ""
        }
      }));
      throw error;
    }
  };

  return (
    <BranchDeviceContext.Provider
      value={{
        ...state,
        refreshRegistration,
        registerDevice
      }}
    >
      {children}
    </BranchDeviceContext.Provider>
  );
}

export const useBranchDevice = () => useContext(BranchDeviceContext);
