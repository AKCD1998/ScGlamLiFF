import { useEffect, useState } from "react";
import "./DebugOverlay.css";

function DebugOverlay() {
  const [error, setError] = useState(null);

  useEffect(() => {
    const handler = (event) => {
      const err = event?.error || event?.reason;
      if (!err) {
        return;
      }
      setError({
        message: err.message || String(err),
        stack: err.stack || ""
      });
    };

    window.addEventListener("error", handler);
    window.addEventListener("unhandledrejection", handler);

    if (window.__SCGLAM_LAST_ERROR__) {
      setError(window.__SCGLAM_LAST_ERROR__);
    }

    return () => {
      window.removeEventListener("error", handler);
      window.removeEventListener("unhandledrejection", handler);
    };
  }, []);

  if (!error) {
    return null;
  }

  return (
    <div className="debug-overlay">
      <div className="debug-overlay__card">
        <strong>Runtime error</strong>
        <p>{error.message}</p>
        {error.stack ? <pre>{error.stack}</pre> : null}
      </div>
    </div>
  );
}

export default DebugOverlay;
