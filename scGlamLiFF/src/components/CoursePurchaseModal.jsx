import { useEffect, useState } from "react";

const paymentOptions = [
  { id: "promptpay", label: "PromptPay QR" },
  { id: "card", label: "Credit/Debit Card" },
  { id: "shopee", label: "ShopeePay / SPayLater" },
  { id: "gpay", label: "Google Pay" }
];

function CoursePurchaseModal({
  open,
  serviceName,
  selectedPackage,
  onClose,
  onConfirm
}) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("promptpay");
  const [showMockNote, setShowMockNote] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedPaymentMethod("promptpay");
      setShowMockNote(false);
    }
  }, [open, selectedPackage]);

  if (!open || !selectedPackage) {
    return null;
  }

  const selectedPaymentLabel =
    paymentOptions.find((option) => option.id === selectedPaymentMethod)?.label ||
    "";

  const handleConfirm = () => {
    // TODO: After real payment confirmation, upsert line_users and user_treatments.
    onConfirm();
  };

  return (
    <div className="course-modal__backdrop" role="dialog" aria-modal="true">
      <div className="course-modal__panel">
        <div className="course-modal__header">
          <h3>ยืนยันการซื้อคอร์ส</h3>
          <button type="button" onClick={onClose}>
            ปิด
          </button>
        </div>
        <div className="course-modal__layout">
          <div className="course-modal__details">
            <div className="course-modal__content">
              <p className="course-modal__name">{serviceName}</p>
              <p className="course-modal__package">{selectedPackage.title}</p>
              <p className="course-modal__price">฿{selectedPackage.price}</p>
              {selectedPackage.promos.length ? (
                <ul className="course-modal__promos">
                  {selectedPackage.promos.map((promo) => (
                    <li key={promo}>{promo}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
          <div className="course-modal__payment">
            <h4 className="course-modal__payment-title">วิธีการชำระเงิน</h4>
            <div className="course-modal__payment-options">
              {paymentOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`course-modal__payment-option${
                    selectedPaymentMethod === option.id ? " is-selected" : ""
                  }`}
                  onClick={() => setSelectedPaymentMethod(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="course-modal__summary">
              <div className="course-modal__summary-row">
                <span>ราคาคอร์ส</span>
                <span>฿{selectedPackage.price}</span>
              </div>
              <div className="course-modal__summary-row">
                <span>จำนวนครั้ง</span>
                <span>{selectedPackage.title}</span>
              </div>
              <div className="course-modal__summary-row total">
                <span>รวมทั้งสิ้น</span>
                <span>฿{selectedPackage.price}</span>
              </div>
              <div className="course-modal__summary-row">
                <span>วิธีชำระเงิน</span>
                <span>{selectedPaymentLabel}</span>
              </div>
            </div>
            <button
              type="button"
              className="course-modal__proceed"
              onClick={() => setShowMockNote(true)}
            >
              ดำเนินการชำระเงิน
            </button>
            {showMockNote ? (
              <p className="course-modal__note-inline">
                (ระบบจำลอง ยังไม่ตัดเงินจริง)
              </p>
            ) : null}
          </div>
        </div>
        <div className="course-modal__actions">
          <button type="button" className="secondary" onClick={onClose}>
            ยกเลิก
          </button>
          <button type="button" onClick={handleConfirm}>
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}

export default CoursePurchaseModal;
