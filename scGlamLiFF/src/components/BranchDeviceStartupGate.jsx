import { useEffect, useState } from "react";
import AppLayout from "./AppLayout";
import {
  BOOKING_BRANCH_OPTIONS,
  DEFAULT_BOOKING_BRANCH_ID,
  getBookingBranchLabel
} from "../services/branchCatalog";
import { useBranchDevice } from "../context/BranchDeviceContext";
import { isBranchDeviceGuardDebugEnabled } from "../utils/branchDeviceGuardDebug";

function BranchDeviceGuardDebugPanel({ debug, status, reasonCode }) {
  if (!isBranchDeviceGuardDebugEnabled()) {
    return null;
  }

  const text = JSON.stringify(
    {
      currentPageUrl: debug?.currentPageUrl || null,
      apiBaseUrl: debug?.apiBaseUrl || null,
      liffId: debug?.liffId || null,
      liffReady: debug?.liffReady ?? null,
      inClient: debug?.inClient ?? null,
      loggedIn: debug?.loggedIn ?? null,
      hasIdToken: debug?.hasIdToken ?? null,
      idTokenLength: debug?.idTokenLength ?? 0,
      hasAccessToken: debug?.hasAccessToken ?? null,
      accessTokenLength: debug?.accessTokenLength ?? 0,
      authorizationHeaderAttached:
        debug?.authorizationHeaderAttached ?? null,
      xLineIdTokenAttached: debug?.xLineIdTokenAttached ?? null,
      xLineAccessTokenAttached:
        debug?.xLineAccessTokenAttached ?? null,
      usesConfiguredApiBase: debug?.usesConfiguredApiBase ?? null,
      requestStarted: debug?.requestStarted ?? null,
      lastRequestUrl: debug?.lastRequestUrl ?? null,
      lastResponseStatus: debug?.lastResponseStatus ?? null,
      lastResponseBody: debug?.lastResponseBody ?? null,
      lastRegisterStarted: debug?.lastRegisterStarted ?? null,
      lastRegisterUrl: debug?.lastRegisterUrl ?? null,
      lastRegisterStatus: debug?.lastRegisterStatus ?? null,
      lastRegisterResponse: debug?.lastRegisterResponse ?? null,
      staffSessionStarted: debug?.staffSessionStarted ?? null,
      lastStaffSessionUrl: debug?.lastStaffSessionUrl ?? null,
      lastStaffSessionStatus: debug?.lastStaffSessionStatus ?? null,
      lastStaffSessionResponse: debug?.lastStaffSessionResponse ?? null,
      staffLoginStarted: debug?.staffLoginStarted ?? null,
      lastStaffLoginUrl: debug?.lastStaffLoginUrl ?? null,
      lastStaffLoginStatus: debug?.lastStaffLoginStatus ?? null,
      lastStaffLoginResponse: debug?.lastStaffLoginResponse ?? null,
      lastReason: debug?.lastReason ?? null,
      lastGuardState: status,
      lastReasonCode: reasonCode
    },
    null,
    2
  );

  return (
    <pre
      style={{
        marginTop: 16,
        padding: 12,
        borderRadius: 16,
        background: "rgba(48, 33, 23, 0.08)",
        overflowX: "auto",
        fontSize: 12
      }}
    >
      {text}
    </pre>
  );
}

function BranchDevicePanel({
  title,
  message,
  debug,
  status,
  reasonCode,
  children
}) {
  return (
    <AppLayout breadcrumbs={[{ label: "Home" }]}>
      <div className="page">
        <div
          style={{
            maxWidth: 560,
            margin: "0 auto",
            padding: 24,
            borderRadius: 24,
            border: "1px solid rgba(122, 81, 54, 0.18)",
            background: "#fffaf3",
            boxShadow: "0 18px 36px rgba(48, 33, 23, 0.08)"
          }}
        >
          <h1 style={{ marginTop: 0 }}>{title}</h1>
          <p>{message}</p>
          {children}
          <BranchDeviceGuardDebugPanel
            debug={debug}
            status={status}
            reasonCode={reasonCode}
          />
        </div>
      </div>
    </AppLayout>
  );
}

function BranchDeviceRegistrationForm() {
  const {
    lineIdentity,
    loginStaff,
    registerDevice,
    staffLoginError,
    staffLoginStatus,
    staffSessionStatus,
    staffUser,
    submitError,
    submitStatus
  } = useBranchDevice();
  const [branchId, setBranchId] = useState(DEFAULT_BOOKING_BRANCH_ID);
  const [deviceLabel, setDeviceLabel] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!branchId) {
      setBranchId(DEFAULT_BOOKING_BRANCH_ID);
    }
  }, [branchId]);

  const isStaffAuthenticated = staffSessionStatus === "authenticated";
  const hasExplicitStaffCredentials = Boolean(username.trim() && password);
  const isLoggingIn = staffLoginStatus === "logging_in";
  const loginDisabled =
    isLoggingIn ||
    isStaffAuthenticated ||
    !username.trim() ||
    !password;
  const registerDisabled =
    !branchId ||
    submitStatus === "submitting" ||
    isLoggingIn ||
    (!isStaffAuthenticated && !hasExplicitStaffCredentials);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      await registerDevice({
        branchId,
        deviceLabel,
        staffUsername: username,
        staffPassword: password
      });
    } catch {
      // Error state is surfaced through context for the registration panel.
    }
  };

  const handleStaffLogin = async () => {
    try {
      await loginStaff({
        username,
        password
      });
      setPassword("");
    } catch {
      // Error state is surfaced through context for the registration panel.
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
      <label htmlFor="branch-device-branch">สาขา</label>
      <select
        id="branch-device-branch"
        value={branchId}
        onChange={(event) => setBranchId(event.target.value)}
      >
        {BOOKING_BRANCH_OPTIONS.map((branch) => (
          <option
            key={branch.id}
            value={branch.id}
            disabled={branch.disabled}
          >
            {branch.label}
          </option>
        ))}
      </select>

      <label htmlFor="branch-device-label">ชื่อเครื่อง (ไม่บังคับ)</label>
      <input
        id="branch-device-label"
        type="text"
        value={deviceLabel}
        onChange={(event) => setDeviceLabel(event.target.value)}
        placeholder="เช่น Front Desk iPhone"
      />

      {lineIdentity?.display_name ? (
        <p style={{ margin: 0, color: "rgba(57, 35, 24, 0.8)" }}>
          LINE: {lineIdentity.display_name}
        </p>
      ) : null}

      <div
        style={{
          display: "grid",
          gap: 12,
          padding: 16,
          borderRadius: 16,
          background: "rgba(122, 81, 54, 0.08)"
        }}
      >
        <strong>เข้าสู่ระบบพนักงานใน LIFF นี้</strong>

        {staffUser?.display_name || staffUser?.username ? (
          <p style={{ margin: 0, color: "#356f37" }}>
            พนักงาน: {staffUser.display_name || staffUser.username}
          </p>
        ) : null}

        {isStaffAuthenticated ? (
          <p style={{ margin: 0, color: "#356f37" }}>
            เข้าสู่ระบบพนักงานแล้ว พร้อมลงทะเบียนอุปกรณ์
          </p>
        ) : (
          <>
            <label htmlFor="branch-device-staff-username">ชื่อผู้ใช้พนักงาน</label>
            <input
              id="branch-device-staff-username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="เช่น staff003"
              autoComplete="username"
            />

            <label htmlFor="branch-device-staff-password">รหัสผ่านพนักงาน</label>
            <input
              id="branch-device-staff-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="รหัสผ่านพนักงาน"
              autoComplete="current-password"
            />

            <button
              type="button"
              onClick={() => void handleStaffLogin()}
              disabled={loginDisabled}
            >
              {isLoggingIn ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบพนักงาน"}
            </button>
          </>
        )}

        {staffSessionStatus === "missing_staff_auth" ? (
          <p style={{ margin: 0, color: "#9f2323" }}>
            LIFF session นี้ยังไม่พบ staff cookie แต่ยังลงทะเบียนได้ หากกรอกชื่อผู้ใช้และรหัสผ่านพนักงานด้านล่าง
          </p>
        ) : null}

        {staffSessionStatus === "error" ? (
          <p style={{ margin: 0, color: "#9f2323" }}>
            ตรวจสอบ session พนักงานไม่สำเร็จ ลองเข้าสู่ระบบอีกครั้ง
          </p>
        ) : null}

        {staffLoginStatus === "logging_in" ? (
          <p style={{ margin: 0, color: "rgba(57, 35, 24, 0.8)" }}>
            กำลังเข้าสู่ระบบพนักงาน...
          </p>
        ) : null}

        {staffLoginStatus === "login_failed" && staffLoginError ? (
          <p style={{ margin: 0, color: "#9f2323" }}>{staffLoginError}</p>
        ) : null}

        {staffLoginStatus === "login_success" && isStaffAuthenticated ? (
          <p style={{ margin: 0, color: "#356f37" }}>
            เข้าสู่ระบบพนักงานสำเร็จ ใช้ session นี้ลงทะเบียนอุปกรณ์ได้ทันที
          </p>
        ) : null}

        {!isStaffAuthenticated && hasExplicitStaffCredentials ? (
          <p style={{ margin: 0, color: "#7a5136" }}>
            หาก LIFF session ไม่มี staff cookie ระบบจะใช้ชื่อผู้ใช้และรหัสผ่านนี้เป็น fallback ตอนลงทะเบียนอุปกรณ์
          </p>
        ) : null}
      </div>

      {submitError ? (
        <p style={{ margin: 0, color: "#9f2323" }}>{submitError}</p>
      ) : null}

      <button
        type="submit"
        disabled={registerDisabled}
      >
        {submitStatus === "submitting" ? "กำลังลงทะเบียน..." : "ลงทะเบียนอุปกรณ์"}
      </button>
    </form>
  );
}

function BranchDeviceInactivePanel() {
  const { debug, reasonCode, registration, refreshRegistration, status } =
    useBranchDevice();
  const branchLabel = getBookingBranchLabel(registration?.branch_id);

  return (
    <BranchDevicePanel
      title="อุปกรณ์ถูกปิดใช้งาน"
      message={`เครื่องนี้ผูกกับ ${branchLabel || "สาขาเดิม"} แต่สถานะยังไม่ active`}
      debug={debug}
      status={status}
      reasonCode={reasonCode}
    >
      <button type="button" onClick={() => void refreshRegistration()}>
        ตรวจสอบอีกครั้ง
      </button>
    </BranchDevicePanel>
  );
}

export default function BranchDeviceStartupGate({ children }) {
  const { debug, errorMessage, reasonCode, refreshRegistration, status } =
    useBranchDevice();

  if (status === "active") {
    return children;
  }

  if (status === "loading") {
    return (
      <BranchDevicePanel
        title="กำลังตรวจสอบอุปกรณ์"
        message="กำลังยืนยันว่าเครื่องนี้เป็นอุปกรณ์สาขาที่ลงทะเบียนไว้"
        debug={debug}
        status={status}
        reasonCode={reasonCode}
      />
    );
  }

  if (status === "not_registered") {
    return (
      <BranchDevicePanel
        title="ต้องลงทะเบียนอุปกรณ์"
        message="เครื่องนี้ยังไม่ได้ผูกกับสาขา กรุณาลงทะเบียนก่อนเริ่มใช้งาน"
        debug={debug}
        status={status}
        reasonCode={reasonCode}
      >
        <BranchDeviceRegistrationForm />
      </BranchDevicePanel>
    );
  }

  if (status === "inactive") {
    return <BranchDeviceInactivePanel />;
  }

  if (status === "outside_line_client") {
    return (
      <BranchDevicePanel
        title="ยังไม่เริ่มตรวจสอบอุปกรณ์"
        message={errorMessage || "เปิดผ่าน LINE แล้วลองใหม่อีกครั้ง"}
        debug={debug}
        status={status}
        reasonCode={reasonCode}
      >
        <button type="button" onClick={() => void refreshRegistration()}>
          ลองใหม่
        </button>
      </BranchDevicePanel>
    );
  }

  if (status === "not_logged_in") {
    return (
      <BranchDevicePanel
        title="ต้องเข้าสู่ระบบ LINE"
        message={errorMessage || "กรุณาเข้าสู่ระบบ LINE แล้วลองใหม่อีกครั้ง"}
        debug={debug}
        status={status}
        reasonCode={reasonCode}
      >
        <button type="button" onClick={() => void refreshRegistration()}>
          ลองใหม่
        </button>
      </BranchDevicePanel>
    );
  }

  if (status === "liff_init_failed") {
    return (
      <BranchDevicePanel
        title="เริ่มต้น LIFF ไม่สำเร็จ"
        message={errorMessage || "ไม่สามารถเริ่มต้น LIFF ได้"}
        debug={debug}
        status={status}
        reasonCode={reasonCode}
      >
        <button type="button" onClick={() => void refreshRegistration()}>
          ลองใหม่
        </button>
      </BranchDevicePanel>
    );
  }

  return (
    <BranchDevicePanel
      title="ตรวจสอบอุปกรณ์ไม่สำเร็จ"
      message={errorMessage || "ไม่สามารถยืนยัน LIFF device ได้"}
      debug={debug}
      status={status}
      reasonCode={reasonCode}
    >
      <button type="button" onClick={() => void refreshRegistration()}>
        ลองใหม่
      </button>
    </BranchDevicePanel>
  );
}
