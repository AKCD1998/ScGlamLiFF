import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./ThemeContext";

export const mountApp = () => {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <HashRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </HashRouter>
    </StrictMode>
  );
};
