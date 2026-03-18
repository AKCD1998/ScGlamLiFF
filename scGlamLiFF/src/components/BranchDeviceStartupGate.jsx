import { useEffect, useState } from "react";
import AppLayout from "./AppLayout";
import {
  BOOKING_BRANCH_OPTIONS,
  DEFAULT_BOOKING_BRANCH_ID,
  getBookingBranchLabel
} from "../services/branchCatalog";
import { useBranchDevice } from "../context/BranchDeviceContext";

function BranchDevicePanel({
  title,
  message,
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
  const { registration, refreshRegistration } = useBranchDevice();
  const branchLabel = getBookingBranchLabel(registration?.branch_id);

  return (
    <BranchDevicePanel
      title="อุปกรณ์ถูกปิดใช้งาน"
      message={`เครื่องนี้ผูกกับ ${branchLabel || "สาขาเดิม"} แต่สถานะยังไม่ active`}
    >
      <button type="button" onClick={() => void refreshRegistration()}>
        ตรวจสอบอีกครั้ง
      </button>
    </BranchDevicePanel>
  );
}

export default function BranchDeviceStartupGate({ children }) {
  const { status, errorMessage, refreshRegistration } = useBranchDevice();

  if (status === "ready") {
    return children;
  }

  if (status === "checking") {
    return (
      <BranchDevicePanel
        title="กำลังตรวจสอบอุปกรณ์"
        message="กำลังยืนยันว่าเครื่องนี้เป็นอุปกรณ์สาขาที่ลงทะเบียนไว้"
      />
    );
  }

  if (status === "registration_required") {
    return (
      <BranchDevicePanel
        title="ต้องลงทะเบียนอุปกรณ์"
        message="เครื่องนี้ยังไม่ได้ผูกกับสาขา กรุณาลงทะเบียนก่อนเริ่มใช้งาน"
      >
        <BranchDeviceRegistrationForm />
      </BranchDevicePanel>
    );
  }

  if (status === "inactive") {
    return <BranchDeviceInactivePanel />;
  }

  return (
    <BranchDevicePanel
      title="ตรวจสอบอุปกรณ์ไม่สำเร็จ"
      message={errorMessage || "ไม่สามารถยืนยัน LIFF device ได้"}
    >
      <button type="button" onClick={() => void refreshRegistration()}>
        ลองใหม่
      </button>
    </BranchDevicePanel>
  );
}
