import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TreatmentOption from "./TreatmentOption";
import myTreatmentMock from "./data/myTreatmentMock";
import { useAuth } from "./context/AuthContext";
import { apiUrl } from "./utils/apiBase";
import "./MyTreatmentsPage.css";
import smoothImage from "./assets/smooth.png";

function MyTreatmentsPage({ onSelectSmooth }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const lineUserId = user?.lineUserId;

  useEffect(() => {
    let isActive = true;

    const fetchTreatments = async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return response.json();
    };

    const loadTreatments = async () => {
      setIsLoading(true);
      setFetchError(null);

      const encodedUserId = encodeURIComponent(lineUserId);
      const requestUrl = apiUrl(
        `/api/me/treatments?line_user_id=${encodedUserId}`
      );

      try {
        const data = await fetchTreatments(requestUrl);

        if (!isActive) {
          return;
        }

        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (error) {
        if (!isActive) {
          return;
        }
        setFetchError(error);
        setItems([
          {
            code: "smooth",
            title_en: myTreatmentMock.course.name
          }
        ]);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    if (lineUserId) {
      loadTreatments();
    }

    return () => {
      isActive = false;
    };
  }, [lineUserId, location.key]);

  const handleOwnedTreatment = (code) => {
    if (code === "smooth") {
      if (onSelectSmooth) {
        onSelectSmooth();
      } else {
        navigate("/my-treatments/smooth");
      }
      return;
    }

    navigate(`/treatments/${code}`);
  };

  return (
    <div className="treatments-page">
      <header className="treatments-header">
        <span className="brand">SC GLAM</span>
        <h1 className="treatments-title">ทรีตเมนต์ของคุณ</h1>
      </header>
      {isLoading ? (
        <p className="treatments-status">Loading treatments...</p>
      ) : null}
      {fetchError ? (
        <p className="treatments-status">
          Failed to load treatments. Showing mock data.
        </p>
      ) : null}
      <main className="treatments-list">
        {!isLoading && items.length === 0 ? (
          <TreatmentOption
            title="Buy a treatment"
            imageSrc={smoothImage}
            isActive
            onClick={() => navigate("/treatments/top-picks")}
          />
        ) : null}
        {items.map((item) => {
          const title = item.title_en || item.title_th || item.code;
          return (
            <TreatmentOption
              key={item.code}
              title={title}
              imageSrc={smoothImage}
              isActive
              onClick={() => handleOwnedTreatment(item.code)}
            />
          );
        })}
        {!isLoading && items.length > 0 ? (
          <TreatmentOption
            title="Buy other course"
            imageSrc={smoothImage}
            isActive
            onClick={() => navigate("/treatments/top-picks")}
          />
        ) : null}
      </main>
    </div>
  );
}

export default MyTreatmentsPage;
