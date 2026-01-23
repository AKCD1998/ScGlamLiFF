import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./ThemeContext";

if (typeof window !== "undefined") {
  if (!window.__SCGLAM_BOOT__) {
    window.__SCGLAM_BOOT__ = {};
  }
  window.__SCGLAM_BOOT__.jsStarted = true;
  const bootEl = document.getElementById("boot-status");
  if (bootEl) {
    bootEl.style.display = "none";
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HashRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </HashRouter>
  </StrictMode>
);
