import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  BranchDeviceRegistrationApiError,
  createBranchDeviceRegistration,
  getMyBranchDeviceRegistration
} from "../services/branchDeviceRegistrationService";

const BranchDeviceContext = createContext({
  status: "checking",
  guardEnabled: false,
  branchId: "",
  registration: null,
  lineIdentity: null,
  errorMessage: "",
  submitStatus: "idle",
  submitError: "",
  refreshRegistration: async () => {},
  registerDevice: async () => {}
});

const createBypassedState = () => ({
  status: "ready",
  guardEnabled: false,
  branchId: "",
  registration: null,
  lineIdentity: null,
  errorMessage: "",
  submitStatus: "idle",
  submitError: ""
});

const createCheckingState = () => ({
  status: "checking",
  guardEnabled: true,
  branchId: "",
  registration: null,
  lineIdentity: null,
  errorMessage: "",
  submitStatus: "idle",
  submitError: ""
});

const buildStateFromSnapshot = (snapshot) => {
  const branchId =
    String(snapshot?.branch_id || snapshot?.registration?.branch_id || "").trim();

  if (snapshot?.registered && snapshot?.active) {
    return {
      status: "ready",
      guardEnabled: true,
      branchId,
      registration: snapshot?.registration || null,
      lineIdentity: snapshot?.line_identity || null,
      errorMessage: "",
      submitStatus: "idle",
      submitError: ""
    };
  }

  if (snapshot?.registered) {
    return {
      status: "inactive",
      guardEnabled: true,
      branchId,
      registration: snapshot?.registration || null,
      lineIdentity: snapshot?.line_identity || null,
      errorMessage: "",
      submitStatus: "idle",
      submitError: ""
    };
  }

  return {
    status: "registration_required",
    guardEnabled: true,
    branchId: "",
    registration: null,
    lineIdentity: snapshot?.line_identity || null,
    errorMessage: "",
    submitStatus: "idle",
    submitError: ""
  };
};

const getLookupErrorMessage = (error) => {
  if (error?.message === "LIFF_NOT_IN_CLIENT") {
    return "กรุณาเปิดผ่าน LINE";
  }

  if (error?.message === "LIFF_LOGIN_REQUIRED") {
    return "ไม่พบ LIFF session สำหรับตรวจสอบเครื่อง";
  }

  if (error instanceof BranchDeviceRegistrationApiError) {
    if (error.status === 400) {
      return "ไม่พบ LIFF token สำหรับยืนยันเครื่องนี้";
    }

    if (error.status === 401) {
      return "LIFF token ไม่ผ่านการยืนยัน";
    }

    return error.message || "ตรวจสอบอุปกรณ์ไม่สำเร็จ";
  }

  return error?.message || "ตรวจสอบอุปกรณ์ไม่สำเร็จ";
};

const getRegisterErrorMessage = (error) => {
  if (error instanceof BranchDeviceRegistrationApiError) {
    if (error.status === 401) {
      return "ยังไม่ได้เข้าสู่ระบบพนักงาน ไม่สามารถลงทะเบียนอุปกรณ์ได้";
    }

    if (error.status === 400) {
      return error.message || "ข้อมูลลงทะเบียนไม่ครบ";
    }

    if (error.status === 422) {
      return "ไม่สามารถยืนยัน LINE user ของอุปกรณ์นี้ได้";
    }

    return error.message || "ลงทะเบียนอุปกรณ์ไม่สำเร็จ";
  }

  return error?.message || "ลงทะเบียนอุปกรณ์ไม่สำเร็จ";
};

export function BranchDeviceProvider({ children }) {
  const { mode } = useAuth();
  const [state, setState] = useState(() =>
    mode === "real" ? createCheckingState() : createBypassedState()
  );

  useEffect(() => {
    let isActive = true;

    if (mode !== "real") {
      setState(createBypassedState());
      return () => {
        isActive = false;
      };
    }

    setState(createCheckingState());

    const run = async () => {
      try {
        const snapshot = await getMyBranchDeviceRegistration();

        if (!isActive) {
          return;
        }

        setState(buildStateFromSnapshot(snapshot));
      } catch (error) {
        if (!isActive) {
          return;
        }

        setState({
          ...createCheckingState(),
          status: "error",
          errorMessage: getLookupErrorMessage(error)
        });
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

    setState((current) => ({
      ...current,
      status: "checking",
      errorMessage: ""
    }));

    try {
      const snapshot = await getMyBranchDeviceRegistration();
      setState(buildStateFromSnapshot(snapshot));
      return snapshot;
    } catch (error) {
      setState({
        ...createCheckingState(),
        status: "error",
        errorMessage: getLookupErrorMessage(error)
      });
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
        device_label: deviceLabel
      });

      const snapshot = await getMyBranchDeviceRegistration();
      setState(buildStateFromSnapshot(snapshot));
      return snapshot;
    } catch (error) {
      setState((current) => ({
        ...current,
        submitStatus: "error",
        submitError: getRegisterErrorMessage(error)
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
