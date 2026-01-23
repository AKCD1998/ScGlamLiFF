import { createPortal } from "react-dom";
import "./LoadingOverlay.css";

function LoadingOverlay({ open, text = "กำลังโหลด..." }) {
  if (!open) {
    return null;
  }

  const content = (
    <div className="loading-overlay" role="alert" aria-live="polite">
      <div className="loading-overlay__card">
        <div className="loading-overlay__spinner" aria-hidden="true" />
        <p>{text}</p>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return content;
  }

  return createPortal(content, document.body);
}

export default LoadingOverlay;
