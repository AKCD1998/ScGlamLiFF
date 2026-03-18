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
  const { submitStatus, submitError, lineIdentity, registerDevice } = useBranchDevice();
  const [branchId, setBranchId] = useState(DEFAULT_BOOKING_BRANCH_ID);
  const [deviceLabel, setDeviceLabel] = useState("");

  useEffect(() => {
    if (!branchId) {
      setBranchId(DEFAULT_BOOKING_BRANCH_ID);
    }
  }, [branchId]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      await registerDevice({
        branchId,
        deviceLabel
      });
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

      {submitError ? (
        <p style={{ margin: 0, color: "#9f2323" }}>{submitError}</p>
      ) : null}

      <button
        type="submit"
        disabled={!branchId || submitStatus === "submitting"}
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
