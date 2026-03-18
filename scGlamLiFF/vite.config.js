import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  if (command === "build" && env.VITE_USE_MOCK === "true") {
    throw new Error("Production build cannot run with VITE_USE_MOCK=true");
  }

  return {
    base: "/ScGlamLiFF/",
    plugins: [react()],
    server: {
      proxy: {
        "/api": "http://localhost:3002"
      }
    }
  };
});
