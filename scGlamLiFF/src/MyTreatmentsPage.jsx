import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TreatmentOption from "./TreatmentOption";
import myTreatmentMock from "./data/myTreatmentMock";
import { getMockUserId, storeMockUserIdFromQuery } from "./utils/mockAuth";
import "./MyTreatmentsPage.css";
import smoothImage from "./assets/smooth.png";

function MyTreatmentsPage({ onSelectSmooth }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [mockUserId, setMockUserId] = useState(getMockUserId());

  useEffect(() => {
    const queryUserId = storeMockUserIdFromQuery();
    setMockUserId(queryUserId || getMockUserId());
  }, [location.search]);

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

      const encodedUserId = encodeURIComponent(mockUserId);
      const proxyUrl = `/api/me/treatments?line_user_id=${encodedUserId}`;
      const fallbackUrl = `http://localhost:3002/api/me/treatments?line_user_id=${encodedUserId}`;

      try {
        let data;
        try {
          data = await fetchTreatments(proxyUrl);
        } catch (error) {
          data = await fetchTreatments(fallbackUrl);
        }

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

    if (mockUserId) {
      loadTreatments();
    }

    return () => {
      isActive = false;
    };
  }, [mockUserId, location.key]);

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
