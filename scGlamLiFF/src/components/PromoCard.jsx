function PromoCard({ item, imageSrc, onPurchase, onCardClick }) {
  const isInactive = !item.isActive;
  const isClickable = item.isActive && onCardClick;

  const handleCardKeyDown = (event) => {
    if (!isClickable) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onCardClick(item);
    }
  };

  return (
    <article
      className={`promo-card${isInactive ? " promo-card--inactive" : ""}${
        isClickable ? " promo-card--clickable" : ""
      }`}
      onClick={isClickable ? () => onCardClick(item) : undefined}
      onKeyDown={handleCardKeyDown}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="promo-card__media">
        <img src={imageSrc} alt={item.name} />
        <span className="promo-card__badge">{item.tag}</span>
      </div>
      <div className="promo-card__content">
        <div className="promo-card__header">
          <h3>{item.name}</h3>
          <span className="promo-card__rating">★ {item.rating}</span>
        </div>
        <p className="promo-card__desc">{item.shortDesc}</p>
        <div className="promo-card__meta">
          <span>{item.durationMins} นาที</span>
          <span>คูปองใช้ได้ 30 วัน</span>
        </div>
        <div className="promo-card__price">
          <span className="promo-card__promo">฿{item.promoPrice}</span>
          <span className="promo-card__original">฿{item.originalPrice}</span>
        </div>
        <button
          className="promo-card__cta"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPurchase(item);
          }}
          disabled={isInactive}
        >
          {isInactive ? "ยังไม่เปิดให้จอง" : "ซื้อคูปอง"}
        </button>
      </div>
    </article>
  );
}

export default PromoCard;
