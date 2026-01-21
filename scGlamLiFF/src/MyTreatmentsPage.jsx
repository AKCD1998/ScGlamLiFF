import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TreatmentOption from "./TreatmentOption";
import "./MyTreatmentsPage.css";
import smoothImage from "./assets/smooth.png";
import AppLayout from "./components/AppLayout";

function MyTreatmentsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadTreatments = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/me/treatments?line_user_id=U_TEST_001"
        );

        if (!response.ok) {
          throw new Error("Failed to load treatments");
        }

        const data = await response.json();
        if (isMounted) {
          setItems(Array.isArray(data.items) ? data.items : []);
        }
      } catch (err) {
        if (isMounted) {
          setError("ไม่สามารถโหลดข้อมูลทรีตเมนต์ได้");
          setItems([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTreatments();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "My Treatments" }
      ]}
    >
      <div className="treatments-page">
        <header className="treatments-header">
          <h1 className="treatments-title">ทรีตเมนต์ของคุณ</h1>
        </header>
        <main className="treatments-list">
          {isLoading ? (
            <p>กำลังโหลดข้อมูลทรีตเมนต์...</p>
          ) : null}
          {!isLoading && error ? <p>{error}</p> : null}
          {!isLoading && items.length > 0
            ? items.map((item) => (
                <TreatmentOption
                  key={item.code}
                  title={item.title_en || item.title_th}
                  imageSrc={smoothImage}
                  isActive
                  onClick={() => console.log(`/treatments/${item.code}`)}
                />
              ))
            : null}
          {!isLoading ? (
            <TreatmentOption
              title="ซื้อทรีตเมนต์เพิ่ม"
              imageSrc={smoothImage}
              isActive={false}
              onClick={() => navigate("/treatments/top-picks")}
            />
          ) : null}
        </main>
      </div>
    </AppLayout>
  );
}

export default MyTreatmentsPage;
