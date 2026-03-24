const trim = (value) => (typeof value === "string" ? value.trim() : "");

const buildVersion =
  trim(import.meta.env.VITE_BUILD_VERSION) ||
  (import.meta.env.DEV ? "dev-local" : "unversioned");
const buildTimeUtc = trim(import.meta.env.VITE_BUILD_TIME_UTC);

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
  window.__SCGLAM_BOOT__.buildInfo = {
    buildVersion,
    buildTimeUtc
  };

  console.info("[scGlamLiFF] frontend_build", window.__SCGLAM_BOOT__.buildInfo);

  const bootEl = document.getElementById("boot-status");

  if (bootEl) {
    bootEl.textContent = `JS started. Loading app modules... (${buildVersion})`;
  }

  import("./renderApp.jsx")
    .then(({ mountApp }) => {
      if (bootEl) {
        bootEl.textContent = `JS started. Rendering app... (${buildVersion})`;
      }

      mountApp();
    })
    .catch((error) => {
      console.error("[scGlamLiFF] bootstrap_import_failed", error);

      if (bootEl) {
        bootEl.textContent = `Bootstrap error: ${error?.message || "unknown error"}`;
      }
    });
}
