import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import smoothImage from "./assets/smooth.png";
import treatmentsMock from "./data/treatmentsMock";
import FiltersPanel from "./components/FiltersPanel";
import PromoCard from "./components/PromoCard";
import PurchaseModal from "./components/PurchaseModal";
import AppLayout from "./components/AppLayout";
import "./TopPicksTreatmentsPage.css";

function TopPicksTreatmentsPage() {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [sortValue, setSortValue] = useState("recommended");
  const [showRecommendedOnly, setShowRecommendedOnly] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    let items = treatmentsMock.filter((item) => {
      if (!normalizedSearch) {
        return true;
      }
      return item.name.toLowerCase().includes(normalizedSearch);
    });

    if (showRecommendedOnly) {
      items = items.filter((item) => item.isRecommended);
    }

    const sortedItems = [...items];
    sortedItems.sort((a, b) => {
      switch (sortValue) {
        case "price-desc":
          return b.promoPrice - a.promoPrice;
        case "price-asc":
          return a.promoPrice - b.promoPrice;
        case "rating-desc":
          return b.rating - a.rating;
        case "recommended":
        default: {
          if (a.isRecommended === b.isRecommended) {
            return a.promoPrice - b.promoPrice;
          }
          return a.isRecommended ? -1 : 1;
        }
      }
    });

    return sortedItems;
  }, [searchValue, showRecommendedOnly, sortValue]);

  const handlePurchase = (item) => {
    if (!item.isActive) {
      return;
    }
    setSelectedItem(item);
  };

  const handleConfirmPurchase = () => {
    setSelectedItem(null);
    window.alert("ยืนยันการซื้อคูปองสำเร็จ");
  };

  const handleCardClick = (item) => {
    navigate(`/treatments/${item.id}`);
  };

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Treatments", to: "/treatments/top-picks" },
        { label: "Top Picks" }
      ]}
      headerSearch={
        <div className="top-picks-search">
          <input
            type="search"
            placeholder="ค้นหาทรีตเมนต์"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
          <button
            className="filters-trigger"
            type="button"
            onClick={() => setIsFiltersOpen(true)}
          >
            ตัวกรอง
          </button>
        </div>
      }
    >
      <div className="top-picks-page">
        <header className="top-picks-header">
          <div>
            <h1 className="top-picks-title">TOP PICKS FOR YOU</h1>
            <p className="top-picks-subtitle">โปรโมชันแนะนำสำหรับคุณ</p>
          </div>
        </header>

        <div className="top-picks-content">
          {isFiltersOpen ? (
            <button
              className="filters-scrim"
              type="button"
              onClick={() => setIsFiltersOpen(false)}
              aria-label="ปิดตัวกรอง"
            />
          ) : null}
          <FiltersPanel
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            sortValue={sortValue}
            onSortChange={setSortValue}
            showRecommendedOnly={showRecommendedOnly}
            onToggleRecommended={setShowRecommendedOnly}
            isOpen={isFiltersOpen}
            onClose={() => setIsFiltersOpen(false)}
          />
          <section className="promo-list">
            {filteredItems.length === 0 ? (
              <div className="promo-empty">
                ไม่พบรายการที่ค้นหา ลองคำอื่นหรือปิดตัวกรองดูนะ
              </div>
            ) : (
              filteredItems.map((item) => (
                <PromoCard
                  key={item.id}
                  item={item}
                  imageSrc={smoothImage}
                  onPurchase={handlePurchase}
                  onCardClick={handleCardClick}
                />
              ))
            )}
          </section>
        </div>

        <PurchaseModal
          open={Boolean(selectedItem)}
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onConfirm={handleConfirmPurchase}
        />
      </div>
    </AppLayout>
  );
}

export default TopPicksTreatmentsPage;
