import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./ThemeContext";

if (typeof window !== "undefined") {
  const clearTokenHash = () => {
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    const tokenPattern = /access_token=|id_token=|context_token=/i;
    if (!tokenPattern.test(hash) && !tokenPattern.test(search)) {
      return;
    }
    const cleanUrl = `${window.location.pathname}${window.location.search}#/`;
    if (window.history?.replaceState) {
      window.history.replaceState(null, "", cleanUrl);
    } else {
      window.location.hash = "#/";
    }
  };

  clearTokenHash();
  window.addEventListener("hashchange", clearTokenHash);
  setTimeout(() => {
    window.removeEventListener("hashchange", clearTokenHash);
  }, 4000);
  if (!window.__SCGLAM_BOOT__) {
    window.__SCGLAM_BOOT__ = {};
  }
  window.__SCGLAM_BOOT__.jsStarted = true;
  const bootEl = document.getElementById("boot-status");
  if (bootEl) {
    bootEl.textContent = "JS started. Rendering app...";
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
