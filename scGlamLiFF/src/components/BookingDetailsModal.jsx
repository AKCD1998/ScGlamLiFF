import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import "./BookingDetailsModal.css";

function BookingDetailsModal({
  open,
  onClose,
  appointment,
  redeemToken,
  onRedeem,
  isProcessing = false,
  isDev = false,
  bookingDetails = null,
  showPaymentPlaceholder = false,
  showAcknowledge = false,
  onAcknowledge,
  submitError
}) {
  const barcodeRef = useRef(null);
  const qrCanvasRef = useRef(null);

  useEffect(() => {
    if (!open || !barcodeRef.current) {
      return;
    }

    const tokenValue = redeemToken || "SCGLAM|BOOKING|PREVIEW";

    JsBarcode(barcodeRef.current, tokenValue, {
      format: "CODE128",
      width: 1.6,
      height: 60,
      displayValue: false,
      lineColor: "#243314",
      background: "transparent",
      margin: 0
    });
  }, [open, redeemToken]);

  useEffect(() => {
    if (!open || !qrCanvasRef.current) {
      return;
    }

    const tokenValue = redeemToken || "SCGLAM|BOOKING|PREVIEW";

    QRCode.toCanvas(
      qrCanvasRef.current,
      tokenValue,
      {
        width: 160,
        margin: 1,
        color: {
          dark: "#243314",
          light: "#00000000"
        }
      },
      (error) => {
        if (error) {
          console.error("Failed to render QR code", error);
        }
      }
    );
  }, [open, redeemToken]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    if (open) {
      document.body.classList.add("modal-open");
      return () => {
        document.body.classList.remove("modal-open");
      };
    }

    document.body.classList.remove("modal-open");
    return undefined;
  }, [open]);

  if (!open) {
    return null;
  }

  const isBookingMode = Boolean(bookingDetails);
  const addons = isBookingMode
    ? bookingDetails?.toppings || []
    : Array.isArray(appointment?.addons)
      ? appointment.addons
      : [];
  const addonsTotal = isBookingMode
    ? typeof bookingDetails?.addonsTotal === "number"
      ? bookingDetails.addonsTotal
      : null
    : typeof appointment?.addonsTotalTHB === "number"
      ? appointment.addonsTotalTHB
      : null;
  const displayDate = isBookingMode
    ? bookingDetails?.dateText
    : appointment?.dateText;
  const displayTime = isBookingMode ? bookingDetails?.timeText : null;
  const displayBranch = isBookingMode ? bookingDetails?.branchLabel : null;

  const modalBody = (
    <div className="booking-modal__backdrop" role="dialog" aria-modal="true">
      <div className="booking-modal__panel">
        <header className="booking-modal__header">
          <button type="button" onClick={onClose}>
            ย้อนกลับ
          </button>
          <h3>ข้อมูลการจอง</h3>
          <span className="booking-modal__header-spacer" />
        </header>

        <div className="booking-modal__content">
          {displayBranch ? (
            <div className="booking-modal__section">
              <p className="booking-modal__label">สาขา</p>
              <p className="booking-modal__value">{displayBranch}</p>
            </div>
          ) : null}
          <div className="booking-modal__section">
            <p className="booking-modal__label">วันและเวลานัดหมาย</p>
            <p className="booking-modal__value">
              {displayDate || "ยังไม่ระบุวันนัดหมาย"}{" "}
              {displayTime || ""}
            </p>
          </div>

          <div className="booking-modal__section">
            {isBookingMode ? (
              <p className="booking-modal__instruction">
                ค่าคอร์สได้ชำระเรียบร้อยแล้ว ค่าใช้จ่ายเพิ่มเติมจะชำระเมื่อรับบริการ
              </p>
            ) : (
              <p className="booking-modal__instruction">
                ยื่น QR code ให้พนักงานสแกน (ยืนยันการเข้ารับบริการ ไม่ใช่การชำระเงิน)
              </p>
            )}
          </div>

          <div className="booking-modal__redeem-card">
            <div className="booking-modal__barcode-wrap">
              <svg ref={barcodeRef} className="booking-modal__barcode" />
              <span className="booking-modal__code-label">Barcode</span>
            </div>
            <div className="booking-modal__qr-wrap">
              <canvas ref={qrCanvasRef} className="booking-modal__qrcode" />
              <span className="booking-modal__code-label">QR code</span>
            </div>
          </div>

          <div className="booking-modal__section">
            <p className="booking-modal__label">บริการเสริม</p>
            {addons.length ? (
              <ul className="booking-modal__list">
                {addons.map((item, index) => (
                  <li key={`${item.name || "addon"}-${index}`}>
                    <span>{item.name || "บริการเสริม"}</span>
                    <span>
                      {typeof item.priceTHB === "number"
                        ? `฿${item.priceTHB}`
                        : "-"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="booking-modal__placeholder">ยังไม่มีบริการเสริม</p>
            )}
          </div>

          <div className="booking-modal__section booking-modal__total">
            <span>ตรวจสอบราคาการบริการเพิ่มเติม</span>
            <span>{addonsTotal !== null ? `฿${addonsTotal}` : "-"}</span>
          </div>

          {showPaymentPlaceholder ? (
            <div className="booking-modal__section booking-modal__payment-note">
              <p className="booking-modal__label">โหมดจำลอง (DEV)</p>
              <p className="booking-modal__instruction">
                QR/Barcode นี้ใช้สำหรับยืนยันการรับบริการ และใช้ชำระค่าใช้จ่ายเพิ่มเติมในอนาคต
              </p>
              <p className="booking-modal__instruction">ยังไม่ตัดเงินจริง</p>
            </div>
          ) : null}
        </div>

        <div className="booking-modal__actions">
          <button type="button" className="secondary" onClick={onClose}>
            ปิด
          </button>
          {submitError ? (
            <span className="booking-modal__error">{submitError}</span>
          ) : null}
          {showAcknowledge ? (
            <button
              type="button"
              className="primary"
              onClick={onAcknowledge || onClose}
              disabled={isProcessing}
            >
              รับทราบ
            </button>
          ) : null}
          {isDev ? (
            <button
              type="button"
              className="primary"
              onClick={onRedeem}
              disabled={isProcessing}
            >
              {isProcessing ? "กำลังสแกน..." : "จำลองการสแกน (DEV)"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return modalBody;
  }

  return createPortal(modalBody, document.body);
}

export default BookingDetailsModal;
