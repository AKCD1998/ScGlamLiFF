import { useState } from "react";
import AppLayout from "../components/AppLayout";
import "./StaffScanPage.css";

function StaffScanPage() {
  const [token, setToken] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleRedeem = async () => {
    if (!token || isRedeeming) {
      return;
    }
    setIsRedeeming(true);
    setStatusMessage("");
    try {
      const requestRedeem = async (url) => {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token })
        });
        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(errorPayload.error || "Failed to redeem");
        }
        return response.json();
      };

      let result;
      try {
        result = await requestRedeem("/api/appointments/redeem");
      } catch (error) {
        result = await requestRedeem("http://localhost:3002/api/appointments/redeem");
      }

      const message =
        result.used_count && result.total_count
          ? `สแกนบริการครั้งที่ ${result.used_count} จากทั้งหมด ${result.total_count}`
          : `สแกนสำเร็จ เหลือ ${result.remaining_sessions_after} ครั้ง`;
      setStatusMessage(message);
      window.alert(message);
    } catch (error) {
      const message = error.message || "Failed to redeem";
      setStatusMessage(message);
      window.alert(message);
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <AppLayout breadcrumbs={[{ label: "Staff Scan" }]}>
      <div className="staff-scan-page">
        <h1>Staff Scan</h1>
        <p>วางโค้ดจากลูกค้าเพื่อยืนยันการเข้ารับบริการ</p>
        <label className="staff-scan-page__label" htmlFor="redeem-token">
          Redeem token
        </label>
        <textarea
          id="redeem-token"
          rows={4}
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="SCGLAM|U_TEST_001|smooth|appointment|timestamp"
        />
        <button type="button" onClick={handleRedeem} disabled={isRedeeming}>
          {isRedeeming ? "กำลังสแกน..." : "Redeem"}
        </button>
        {statusMessage ? (
          <p className="staff-scan-page__status">{statusMessage}</p>
        ) : null}
      </div>
    </AppLayout>
  );
}

export default StaffScanPage;
