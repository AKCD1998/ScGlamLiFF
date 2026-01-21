function PurchaseModal({ open, item, onClose, onConfirm }) {
  if (!open || !item) {
    return null;
  }

  return (
    <div className="purchase-modal__backdrop" role="dialog" aria-modal="true">
      <div className="purchase-modal__panel">
        <div className="purchase-modal__header">
          <h3>ยืนยันการซื้อคูปอง</h3>
          <button type="button" onClick={onClose}>
            ปิด
          </button>
        </div>
        <div className="purchase-modal__content">
          <p className="purchase-modal__name">{item.name}</p>
          <p className="purchase-modal__desc">{item.shortDesc}</p>
          <div className="purchase-modal__summary">
            <span>{item.durationMins} นาที</span>
            <span className="purchase-modal__price">฿{item.promoPrice}</span>
          </div>
        </div>
        <div className="purchase-modal__actions">
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

export default PurchaseModal;
