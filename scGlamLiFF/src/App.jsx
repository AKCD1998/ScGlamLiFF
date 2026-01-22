import { useEffect } from "react";
import liff from "@line/liff";
import { Route, Routes, useNavigate } from "react-router-dom";
import "./App.css";
import MyTreatmentsPage from "./MyTreatmentsPage";
import TopPicksTreatmentsPage from "./TopPicksTreatmentsPage";
import TreatmentServiceDetailPage from "./TreatmentServiceDetailPage";
import MyTreatmentSmoothPage from "./pages/MyTreatmentSmoothPage";
import AppLayout from "./components/AppLayout";
import BookingFlowPage from "./pages/BookingFlowPage";
import StaffScanPage from "./pages/StaffScanPage";

function ActionButton({ title, subtitle, onClick }) {
  return (
    <button className="action-button" type="button" onClick={onClick}>
      <span className="action-title">{title}</span>
      {subtitle ? <span className="action-subtitle">{subtitle}</span> : null}
    </button>
  );
}

function HomePage() {
  const navigate = useNavigate();

  return (
    <AppLayout breadcrumbs={[{ label: "Home" }]}>
      <div className="page">
        <main className="action-area">
          <ActionButton
            title="จองทรีตเมนต์"
            subtitle="Treatment reservation"
            onClick={() => navigate("/my-treatments")}
          />
          <ActionButton
            title="ทรีตเมนต์ของฉัน"
            subtitle="My treatments"
            onClick={() => navigate("/my-treatments")}
          />
          <ActionButton
            title="สำหรับร้านค้า"
            subtitle="For shop"
            onClick={() => navigate("/my-treatments")}
          />
        </main>
      </div>
    </AppLayout>
  );
}

function App() {
  useEffect(() => {
    liff
      .init({
        liffId: import.meta.env.VITE_LIFF_ID
      })
      .then(() => {
        console.log("LIFF init succeeded.");
      })
      .catch((e) => {
        console.log("LIFF init failed.");
        console.error(e);
      });
  }, []);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/my-treatments" element={<MyTreatmentsPage />} />
      <Route path="/my-treatments/smooth" element={<MyTreatmentSmoothPage />} />
      <Route
        path="/my-treatments/smooth/booking"
        element={<BookingFlowPage />}
      />
      <Route
        path="/treatments/top-picks"
        element={<TopPicksTreatmentsPage />}
      />
      <Route path="/treatments/:slug" element={<TreatmentServiceDetailPage />} />
      <Route path="/staff/scan" element={<StaffScanPage />} />
    </Routes>
  );
}

export default App;
