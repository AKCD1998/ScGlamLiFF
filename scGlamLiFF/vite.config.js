import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const DEFAULT_PRODUCTION_BASE_PATH = "/liff/";

const normalizeBasePath = (value) => {
  const trimmedValue = String(value || "").trim();

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue === "/") {
    return "/";
  }

  return `/${trimmedValue.replace(/^\/+|\/+$/g, "")}/`;
};

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const productionBasePath =
    normalizeBasePath(env.VITE_PUBLIC_BASE_PATH) || DEFAULT_PRODUCTION_BASE_PATH;

  if (command === "build" && env.VITE_USE_MOCK === "true") {
    throw new Error("Production build cannot run with VITE_USE_MOCK=true");
  }

  return {
    // Local dev should stay at `/` so the Vite dev server behavior does not
    // change. Production builds default to `/liff/`, while deployments like
    // GitHub Pages can override via `VITE_PUBLIC_BASE_PATH`.
    base: command === "serve" ? "/" : productionBasePath,
    plugins: [react()],
    server: {
      proxy: {
        "/api": "http://localhost:5050"
      }
    }
  };
});
