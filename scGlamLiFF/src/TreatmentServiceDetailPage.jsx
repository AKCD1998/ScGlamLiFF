import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import treatmentsDetailMock from "./data/treatmentsDetailMock";
import CoursePurchaseModal from "./components/CoursePurchaseModal";
import smoothImage from "./assets/smooth.png";
import AppLayout from "./components/AppLayout";
import { useAuth } from "./context/AuthContext";
import { apiUrl } from "./utils/apiBase";
import "./TreatmentServiceDetailPage.css";

const tabs = [
  { id: "overview", label: "ภาพรวม" },
  { id: "packages", label: "บริการ" },
  { id: "reviews", label: "รีวิว" }
];

function renderStars(score) {
  const fullStars = Math.round(score);
  return Array.from({ length: 5 }).map((_, index) =>
    index < fullStars ? "★" : "☆"
  );
}

function TreatmentServiceDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const detail = useMemo(
    () => treatmentsDetailMock.find((item) => item.slug === slug),
    [slug]
  );
  const [activeTab, setActiveTab] = useState("packages");
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState(null);
  const { user } = useAuth();
  const lineUserId = user?.lineUserId;

  if (!detail) {
    return (
      <AppLayout breadcrumbs={[{ label: "Home", to: "/" }, { label: "Not found" }]}>
        <div className="service-detail-page service-detail-page--empty">
          <p>ไม่พบข้อมูลบริการที่คุณค้นหา</p>
          <Link to="/treatments/top-picks" className="service-back-link">
            กลับไปหน้าทรีตเมนต์
          </Link>
        </div>
      </AppLayout>
    );
  }

  const isActiveService = detail.slug === "smooth";

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    const section = document.getElementById(tabId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const resolveSessionsBought = (pkg) => {
    if (!pkg) {
      return 1;
    }
    if (typeof pkg.sessions === "number") {
      return pkg.sessions;
    }
    const idMap = {
      "smooth-1x": 1,
      "smooth-3x": 3,
      "smooth-10x": 10
    };
    if (idMap[pkg.id]) {
      return idMap[pkg.id];
    }
    const match = pkg.title.match(/\d+/);
    return match ? Number(match[0]) : 1;
  };

  const handleConfirmPurchase = async () => {
    if (!selectedPackage || isPurchasing) {
      return;
    }
    if (!lineUserId) {
      setPurchaseError("ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่");
      return;
    }

    setIsPurchasing(true);
    setPurchaseError(null);

    const sessionsBought = resolveSessionsBought(selectedPackage);
    const payload = {
      line_user_id: lineUserId,
      treatment_code: slug,
      sessions_bought: sessionsBought,
      price_thb: selectedPackage?.price ?? null
    };

    try {
      const requestPurchase = async (url) => {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(errorPayload.error || "Failed to create purchase");
        }
        return response.json().catch(() => ({}));
      };

      await requestPurchase(apiUrl("/api/purchases/mock-buy"));

      setSelectedPackage(null);
      navigate(`/my-treatments`);
    } catch (error) {
      setPurchaseError(error.message || "Failed to create purchase");
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Treatments", to: "/treatments/top-picks" },
        { label: detail.name }
      ]}
    >
      <div className="service-detail-page">
        <main className="service-main">
          <section className="service-primary">
            <div className="service-hero" id="overview">
              <img src={detail.heroImage} alt={detail.name} />
              <div className="service-hero__info">
                <h1>{detail.name}</h1>
                <p>{detail.shortDesc}</p>
              </div>
            </div>

            <div className="service-tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`service-tab${
                    activeTab === tab.id ? " service-tab--active" : ""
                  }`}
                  onClick={() => handleTabClick(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <section className="service-packages" id="packages">
              <h2>Course options</h2>
              {purchaseError ? (
                <p className="service-package-card__error">{purchaseError}</p>
              ) : null}
              <div className="service-package-list">
                {detail.packages.map((option) => (
                  <article key={option.id} className="service-package-card">
                    <div className="service-package-card__info">
                      <div>
                        <h3>{option.title}</h3>
                        <span className="service-package-card__sub">
                          Smooth service
                        </span>
                      </div>
                      <span className="service-package-card__price">
                        ฿{option.price}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="service-package-card__cta"
                      disabled={!isActiveService}
                      onClick={() => setSelectedPackage(option)}
                    >
                      ซื้อคอร์ส
                    </button>
                    {option.promos.length ? (
                      <ul className="service-package-card__promos">
                        {option.promos.map((promo) => (
                          <li key={promo}>{promo}</li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          </section>

          <aside className="service-sidebar">
            <div className="service-rating-card">
              <div className="service-rating-card__summary">
                <span className="service-rating-card__score">
                  {detail.ratingSummary}
                </span>
                <span className="service-rating-card__stars">
                  {renderStars(detail.ratingSummary).join("")}
                </span>
              </div>
              <div className="service-rating-card__details">
                {detail.subScores.map((score) => (
                  <div key={score.label} className="service-rating-row">
                    <span>{score.label}</span>
                    <span>{renderStars(score.score).join("")}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="service-location-card">
              <h3>สถานที่ให้บริการ</h3>
              <div className="service-location-card__branches">
                {detail.branches.map((branch) => (
                  <div key={branch.name} className="service-branch">
                    <strong>{branch.name}</strong>
                    <span>{branch.hours}</span>
                    <iframe
                      title={`${branch.name} map`}
                      src={branch.mapEmbedUrl}
                      loading="lazy"
                      allowFullScreen
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="service-favorite"
              onClick={() => window.alert("coming soon")}
            >
              ♡ เพิ่มเป็นบริการโปรดของคุณ
            </button>

            <div className="service-recommended">
              <h3>คอร์สแนะนำ</h3>
              <div className="service-recommended__list">
                {detail.recommended.map((item) => (
                  <div key={item.id} className="service-recommended__card">
                    <img src={smoothImage} alt={item.name} />
                    <div>
                      <p>{item.name}</p>
                      <span>{renderStars(item.rating).join("")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </main>

        <section className="service-reviews" id="reviews">
          <div className="service-reviews__header">
            <div>
              <h2>รีวิว</h2>
              <p>เขียนโดยลูกค้าที่มาใช้บริการ</p>
            </div>
            <button type="button" disabled>
              เขียนรีวิว
            </button>
          </div>
          <div className="service-reviews__list">
            {detail.reviews.map((review) => (
              <article key={review.id} className="service-review">
                <div className="service-review__avatar">
                  {review.name.charAt(0)}
                </div>
                <div className="service-review__content">
                  <div className="service-review__header">
                    <h4>{review.name}</h4>
                    <span>{renderStars(review.rating).join("")}</span>
                  </div>
                  <p>{review.comment}</p>
                  <span className="service-review__meta">
                    รีวิวที่ได้รับการตรวจสอบแล้ว · โพสต์ {review.daysAgo} วันที่ผ่านมา
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <CoursePurchaseModal
          open={Boolean(selectedPackage)}
          serviceName={detail.name}
          selectedPackage={selectedPackage}
          onClose={() => setSelectedPackage(null)}
          onConfirm={handleConfirmPurchase}
          isProcessing={isPurchasing}
        />
      </div>
    </AppLayout>
  );
}

export default TreatmentServiceDetailPage;
