function FiltersPanel({
  searchValue,
  onSearchChange,
  sortValue,
  onSortChange,
  showRecommendedOnly,
  onToggleRecommended,
  isOpen,
  onClose
}) {
  return (
    <aside className={`filters-panel${isOpen ? " filters-panel--open" : ""}`}>
      <div className="filters-panel__header">
        <h2 className="filters-panel__title">ตัวกรอง</h2>
        <button
          className="filters-panel__close"
          type="button"
          onClick={onClose}
        >
          ปิด
        </button>
      </div>
      <div className="filters-panel__body">
        <label className="filters-panel__label" htmlFor="promo-search">
          ค้นหาทรีตเมนต์
        </label>
        <input
          id="promo-search"
          className="filters-panel__input"
          type="search"
          placeholder="พิมพ์ชื่อทรีตเมนต์"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
        />

        <label className="filters-panel__label" htmlFor="promo-sort">
          เรียงตาม
        </label>
        <select
          id="promo-sort"
          className="filters-panel__select"
          value={sortValue}
          onChange={(event) => onSortChange(event.target.value)}
        >
          <option value="recommended">แนะนำ</option>
          <option value="price-desc">ราคาสูงไปต่ำ</option>
          <option value="price-asc">ราคาต่ำไปสูง</option>
          <option value="rating-desc">เรทติ้งมากไปน้อย</option>
        </select>

        <label className="filters-panel__toggle">
          <input
            type="checkbox"
            checked={showRecommendedOnly}
            onChange={(event) => onToggleRecommended(event.target.checked)}
          />
          <span>โชว์เฉพาะโปรที่แนะนำ</span>
        </label>
      </div>
    </aside>
  );
}

export default FiltersPanel;
