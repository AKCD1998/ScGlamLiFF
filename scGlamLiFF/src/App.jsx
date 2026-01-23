import { useEffect } from "react";
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
import AuthStatusPanel from "./components/AuthStatusPanel";
import DebugPanel from "./components/DebugPanel";

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
  const { status, mode, error, debug } = useAuth();
  const debugStep = debug?.step || "unknown";

  const debugPayload = {
    status,
    mode,
    step: debugStep,
    isInClient: debug?.isInClient ?? null,
    isLoggedIn: debug?.isLoggedIn ?? null,
    hasIdToken: debug?.hasIdToken ?? null,
    error: error?.message || null
  };
  const debugText = JSON.stringify(debugPayload, null, 2);

  const handleCopyDebug = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(debugText);
      } else {
        window.prompt("Copy debug JSON:", debugText);
      }
    } catch (copyError) {
      console.error("Failed to copy debug payload", copyError);
    }
  };

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const bootEl = document.getElementById("boot-status");
    if (bootEl) {
      bootEl.style.display = "none";
    }
  }, []);

  if (status === "loading") {
    return (
      <>
        <AppLayout breadcrumbs={[{ label: "Home" }]}>
          <div className="page">
            <p>กำลังโหลด LIFF...</p>
            <p>ขั้นตอน: {debugStep}</p>
          </div>
        </AppLayout>
        <DebugPanel />
      </>
    );
  }

  if (status === "blocked" && mode === "real") {
    return (
      <>
        <AppLayout breadcrumbs={[{ label: "Home" }]}>
          <div className="page">
            <p>กรุณาเปิดหน้านี้ผ่าน LINE</p>
            <p>ขั้นตอน: {debugStep}</p>
            <p>หากต้องการทดสอบบนเบราว์เซอร์ ให้เปิดโหมด mock</p>
          </div>
        </AppLayout>
        <DebugPanel />
      </>
    );
  }

  if (status === "error") {
    return (
      <>
        <AppLayout breadcrumbs={[{ label: "Home" }]}>
          <div className="page">
            <p>ไม่สามารถเข้าสู่ระบบได้</p>
            <p>{error?.message || "โปรดลองอีกครั้งภายหลัง"}</p>
            <p>ขั้นตอน: {debugStep}</p>
            <button type="button" onClick={handleCopyDebug}>
              Copy debug
            </button>
          </div>
        </AppLayout>
        <DebugPanel />
      </>
    );
  }

  return (
    <>
      {children}
      <LoadingOverlay open={status === "loading"} text="กำลังเข้าสู่ระบบ..." />
      <DebugOverlay />
      <AuthStatusPanel />
      <DebugPanel />
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
