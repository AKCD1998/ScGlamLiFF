import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./DebugPanel.css";

function buildPayload({ status, mode, debug, error }) {
  return {
    status,
    mode,
    step: debug?.step ?? null,
    isInClient: debug?.isInClient ?? null,
    isLoggedIn: debug?.isLoggedIn ?? null,
    hasIdToken: debug?.hasIdToken ?? null,
    error: error?.message || null
  };
}

export default function DebugPanel() {
  const { status, mode, debug, error } = useAuth();
  const [copied, setCopied] = useState(false);

  const payload = useMemo(
    () => buildPayload({ status, mode, debug, error }),
    [status, mode, debug, error]
  );
  const text = useMemo(() => JSON.stringify(payload, null, 2), [payload]);

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        window.prompt("Copy debug JSON:", text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (copyError) {
      console.error("Failed to copy debug payload", copyError);
      setCopied(false);
    }
  };

  return (
    <div className="debug-panel" role="region" aria-label="Debug Panel">
      <div className="debug-panel__bar">
        <strong>Debug</strong>
        <button type="button" onClick={handleCopy}>
          Copy
        </button>
        {copied ? <span className="debug-panel__copied">Copied</span> : null}
      </div>
      <pre className="debug-panel__pre">{text}</pre>
    </div>
  );
}
