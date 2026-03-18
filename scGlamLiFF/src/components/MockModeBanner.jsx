import { useMock as mockEnabled } from "../config/env";

function MockModeBanner() {
  if (!mockEnabled) {
    return null;
  }

  return (
    <div className="mock-mode-banner" role="status" aria-live="polite">
      MOCK MODE
    </div>
  );
}

export default MockModeBanner;
