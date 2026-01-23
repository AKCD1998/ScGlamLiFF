import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AuthStatusPanel.css";

function AuthStatusPanel() {
  const { status, mode, user, error, debug } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const enabled = params.get("debug") === "1";

  if (!enabled) {
    return null;
  }

  const snapshot = {
    status,
    mode,
    user,
    error: error ? { message: error.message } : null,
    debug
  };

  return (
    <div className="auth-status-panel">
      <pre>{JSON.stringify(snapshot, null, 2)}</pre>
    </div>
  );
}

export default AuthStatusPanel;
