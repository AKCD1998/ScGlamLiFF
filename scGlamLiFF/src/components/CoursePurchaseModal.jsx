function CoursePurchaseModal({ open, serviceName, selectedPackage, onClose, onConfirm }) {
  if (!open || !selectedPackage) {
    return null;
  }

  return (
    <div className="course-modal__backdrop" role="dialog" aria-modal="true">
      <div className="course-modal__panel">
        <div className="course-modal__header">
          <h3>ยืนยันการซื้อคอร์ส</h3>
          <button type="button" onClick={onClose}>
            ปิด
          </button>
        </div>
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
        <div className="course-modal__actions">
          <button type="button" className="secondary" onClick={onClose}>
            ยกเลิก
          </button>
          <button type="button" onClick={onConfirm}>
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}

export default CoursePurchaseModal;
