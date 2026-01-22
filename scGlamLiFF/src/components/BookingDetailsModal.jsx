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
  isDev = false
}) {
  const barcodeRef = useRef(null);
  const qrCanvasRef = useRef(null);

  useEffect(() => {
    if (!open || !barcodeRef.current) {
      return;
    }

    JsBarcode(barcodeRef.current, redeemToken, {
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

    QRCode.toCanvas(
      qrCanvasRef.current,
      redeemToken,
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

  const addons = Array.isArray(appointment?.addons) ? appointment.addons : [];
  const addonsTotal =
    typeof appointment?.addonsTotalTHB === "number"
      ? appointment.addonsTotalTHB
      : null;

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
          <div className="booking-modal__section">
            <p className="booking-modal__label">วันและเวลานัดหมาย</p>
            <p className="booking-modal__value">
              {appointment?.dateText || "ยังไม่ระบุวันนัดหมาย"}
            </p>
          </div>

          <div className="booking-modal__section">
            <p className="booking-modal__instruction">
              ยื่น QR code ให้พนักงานสแกน (ยืนยันการเข้ารับบริการ ไม่ใช่การชำระเงิน)
            </p>
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
        </div>

        <div className="booking-modal__actions">
          <button type="button" className="secondary" onClick={onClose}>
            ปิด
          </button>
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
