import { useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
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

function NotFoundPage() {
  const location = useLocation();
  return (
    <div style={{ padding: 16 }}>
      NOT FOUND: {location.pathname}
      {location.search ? `?${location.search.replace(/^\?/, "")}` : ""}
    </div>
  );
}

function AuthGate({ children }) {
  const { status, mode, error, debug } = useAuth();
  const location = useLocation();
  const [showReadyBanner, setShowReadyBanner] = useState(true);
  const debugStep = debug?.step || "unknown";
  const readyBannerText = `READY | path: ${location.pathname} | search: ${location.search || ""}`;

  useEffect(() => {
    if (status === "ready") {
      setShowReadyBanner(true);
    }
  }, [status]);

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
      {status === "ready" && showReadyBanner ? (
        <div
          style={{
            position: "fixed",
            bottom: 12,
            right: 12,
            zIndex: 9998,
            background: "rgba(255, 243, 176, 0.95)",
            color: "#1f1f1f",
            fontSize: 12,
            padding: "8px 12px",
            borderRadius: 12,
            boxShadow: "0 10px 20px rgba(0,0,0,0.15)"
          }}
        >
          <div style={{ marginBottom: 6 }}>{readyBannerText}</div>
          <button
            type="button"
            onClick={() => setShowReadyBanner(false)}
            style={{
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid rgba(0,0,0,0.2)",
              background: "#fff",
              cursor: "pointer"
            }}
          >
            Hide banner
          </button>
        </div>
      ) : null}
      {status === "ready" && !showReadyBanner ? (
        <button
          type="button"
          onClick={() => setShowReadyBanner(true)}
          style={{
            position: "fixed",
            bottom: 12,
            right: 12,
            zIndex: 9998,
            background: "rgba(0,0,0,0.7)",
            color: "#fff",
            fontSize: 12,
            padding: "6px 10px",
            borderRadius: 999,
            border: "none",
            cursor: "pointer"
          }}
        >
          Show READY
        </button>
      ) : null}
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
      <Route path="*" element={<NotFoundPage />} />
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
