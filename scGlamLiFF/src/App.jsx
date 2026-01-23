import { Route, Routes, useNavigate } from "react-router-dom";
import "./App.css";
import MyTreatmentsPage from "./MyTreatmentsPage";
import TopPicksTreatmentsPage from "./TopPicksTreatmentsPage";
import TreatmentServiceDetailPage from "./TreatmentServiceDetailPage";
import MyTreatmentSmoothPage from "./pages/MyTreatmentSmoothPage";
import AppLayout from "./components/AppLayout";
import BookingFlowPage from "./pages/BookingFlowPage";
import StaffScanPage from "./pages/StaffScanPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import LoadingOverlay from "./components/LoadingOverlay";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import DebugOverlay from "./components/DebugOverlay";

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

function AuthGate({ children }) {
  const { status, mode, error } = useAuth();

  if (status === "blocked" && mode === "real") {
    return (
      <AppLayout breadcrumbs={[{ label: "Home" }]}>
        <div className="page">
          <p>กรุณาเปิดหน้านี้ผ่าน LINE</p>
          <p>หากต้องการทดสอบบนเบราว์เซอร์ ให้เปิดโหมด mock</p>
        </div>
      </AppLayout>
    );
  }

  if (status === "error") {
    return (
      <AppLayout breadcrumbs={[{ label: "Home" }]}>
        <div className="page">
          <p>ไม่สามารถเข้าสู่ระบบได้</p>
          <p>{error?.message || "โปรดลองอีกครั้งภายหลัง"}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <>
      {children}
      <LoadingOverlay
        open={status === "loading"}
        text="กำลังเข้าสู่ระบบ..."
      />
      <DebugOverlay />
    </>
  );
}

function AppRoutes() {
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
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsPage />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ErrorBoundary
        fallback={
          <AppLayout breadcrumbs={[{ label: "Home" }]}>
            <div className="page">
              <p>เกิดข้อผิดพลาดระหว่างโหลดหน้า</p>
              <p>โปรดลองใหม่อีกครั้ง</p>
            </div>
          </AppLayout>
        }
      >
        <AuthGate>
          <AppRoutes />
        </AuthGate>
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
