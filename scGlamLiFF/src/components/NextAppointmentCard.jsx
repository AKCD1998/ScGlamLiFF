import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BookingDetailsModal from "./BookingDetailsModal";
import { getMockUserId, storeMockUserIdFromQuery } from "../utils/mockAuth";
import { apiUrl } from "../utils/apiBase";

function NextAppointmentCard({ appointment, status = "idle", onEdit, onRetry }) {
  const navigate = useNavigate();
  const hasAppointment = Boolean(appointment);
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [mockUserId, setMockUserId] = useState(getMockUserId());

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
      return;
    }
    navigate("/my-treatments/smooth/booking");
  };

  useEffect(() => {
    const queryUserId = storeMockUserIdFromQuery();
    setMockUserId(queryUserId || getMockUserId());
  }, [location.search]);

  const isDevMode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("dev") === "1";
  }, [location.search]);

  const debugText = useMemo(() => {
    if (!isDevMode || !appointment?.scheduledAtRaw) {
      return null;
    }
    const raw = appointment.scheduledAtRaw;
    const iso = new Date(raw).toISOString();
    const th = new Date(raw).toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    return `RAW: ${raw} | ISO: ${iso} | TH: ${th}`;
  }, [appointment, isDevMode]);

  const redeemToken = useMemo(() => {
    if (!appointment) {
      return "";
    }
    const lineUserId = mockUserId || "U_TEST_001";
    const treatmentCode = appointment.treatmentCode || appointment.treatment_code || "smooth";
    const appointmentId =
      appointment.appointment_id || appointment.id || `${treatmentCode}-appointment`;
    const timestamp = Date.now();
    return `SCGLAM|${lineUserId}|${treatmentCode}|${appointmentId}|${timestamp}`;
  }, [appointment, mockUserId]);

  const handleRedeem = async () => {
    if (isRedeeming) {
      return;
    }
    if (!redeemToken) {
      window.alert("ยังไม่มีข้อมูลการจอง");
      return;
    }
    setIsRedeeming(true);
    try {
      const addons = Array.isArray(appointment?.addons) ? appointment.addons : [];
      const extraPriceThb = addons.reduce(
        (total, addon) => total + (Number(addon?.priceTHB) || 0),
        0
      );
      const findAddonValue = (label) => {
        const match = addons.find((addon) =>
          String(addon?.name || "")
            .toLowerCase()
            .includes(label)
        );
        if (!match?.name) {
          return null;
        }
        const parts = match.name.split(":");
        return parts[1] ? parts[1].trim() : match.name;
      };

      const details = {
        provider: appointment?.provider || null,
        scrub: appointment?.scrub || findAddonValue("scrub"),
        facial_mask: appointment?.facialMask || findAddonValue("mask"),
        misting: appointment?.misting || findAddonValue("misting"),
        extra_price_thb: extraPriceThb,
        note: appointment?.note || null
      };

      const requestRedeem = async (url) => {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: redeemToken, ...details })
        });
        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(errorPayload.error || "Failed to redeem");
        }
        return response.json();
      };

      const result = await requestRedeem(apiUrl("/api/appointments/redeem"));

      setIsModalOpen(false);

      if (result.remaining_sessions_after === 0) {
        window.alert("คุณใช้บริการคอร์สครบถ้วนแล้ว");
        navigate(`/my-treatments?mock_user_id=${encodeURIComponent(mockUserId)}&refresh=${Date.now()}`);
      } else {
        const remainingText =
          result.used_count && result.total_count
            ? `สแกนบริการครั้งที่ ${result.used_count} จากทั้งหมด ${result.total_count}`
            : `สแกนสำเร็จ เหลือ ${result.remaining_sessions_after} ครั้ง`;
        window.alert(remainingText);
        navigate(
          `/my-treatments/smooth?mock_user_id=${encodeURIComponent(mockUserId)}&refresh=${Date.now()}`
        );
      }
    } catch (error) {
      window.alert(error.message || "Failed to redeem");
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <section className="my-treatment-card next-appointment-card">
      <div className="next-appointment-card__header">
        นัดหมายครั้งถัดไป
      </div>
      <p className="next-appointment-card__policy">
        เปลี่ยนเวลาได้ 1 ครั้งเท่านั้น หากไม่มาตามนัดจะถือว่าใช้สิทธิ์แล้ว
      </p>
      <div className="next-appointment-card__body">
        {status === "loading" ? (
          <div className="next-appointment-card__details">
            <p className="next-appointment-card__date">กำลังโหลดนัดหมาย...</p>
          </div>
        ) : status === "error" ? (
          <>
            <div className="next-appointment-card__details">
              <p className="next-appointment-card__date">
                โหลดนัดหมายไม่สำเร็จ
              </p>
            </div>
            <div className="next-appointment-card__cta">
              <button type="button" onClick={onRetry || handleEdit}>
                ลองใหม่
              </button>
            </div>
          </>
        ) : status === "empty" ? (
          <>
            <div className="next-appointment-card__details">
              <p className="next-appointment-card__date">ยังไม่มีการจอง</p>
            </div>
            <div className="next-appointment-card__cta">
              <button type="button" onClick={handleEdit}>
                จองเลย
              </button>
            </div>
          </>
        ) : (
          <>
            {hasAppointment ? (
              <button type="button" onClick={handleEdit}>
                แก้ไข
              </button>
            ) : null}
            <div className="next-appointment-card__details">
              <p className="next-appointment-card__date">
                {appointment?.dateText || "ยังไม่มีการจอง"}
              </p>
              {debugText ? (
                <p className="next-appointment-card__debug">{debugText}</p>
              ) : null}
            </div>
            <div className="next-appointment-card__cta">
              {hasAppointment ? (
                <>
                  <p>เปิดข้อมูลที่คุณจองวันนี้ไว้สิ</p>
                  <button type="button" onClick={() => setIsModalOpen(true)}>
                    ดูข้อมูลการจอง
                  </button>
                </>
              ) : (
                <>
                  <p>ยังไม่มีการจองสำหรับคอร์สนี้</p>
                  <button type="button" onClick={handleEdit}>
                    ไปหน้าจอง
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
      <BookingDetailsModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        appointment={appointment}
        redeemToken={redeemToken}
        onRedeem={handleRedeem}
        isProcessing={isRedeeming}
        isDev={isDevMode}
      />
    </section>
  );
}

export default NextAppointmentCard;
