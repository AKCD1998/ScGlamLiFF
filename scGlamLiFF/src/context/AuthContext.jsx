import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import liff from "@line/liff";
import { getMockUserId, storeMockUserIdFromQuery } from "../utils/mockAuth";
import { initializeLIFFAndGetUser } from "../utils/liffSession";

const AuthContext = createContext({
  status: "loading",
  mode: "mock",
  user: null,
  error: null
});

export function AuthProvider({ children }) {
  const location = useLocation();
  const useMock = import.meta.env.VITE_USE_MOCK === "true";
  const [state, setState] = useState({
    status: "loading",
    mode: useMock ? "mock" : "real",
    user: null,
    error: null
  });

  useEffect(() => {
    if (!useMock) {
      return;
    }

    // Mock mode is opt-in via env flag; keep mock utilities for local testing.
    const queryUserId = storeMockUserIdFromQuery();
    const lineUserId = queryUserId || getMockUserId();

    setState({
      status: "ready",
      mode: "mock",
      user: {
        lineUserId,
        displayName: "Test User"
      },
      error: null
    });
  }, [useMock, location.search]);

  useEffect(() => {
    if (useMock) {
      return;
    }

    if (!liff.isInClient()) {
      setState({
        status: "blocked",
        mode: "real",
        user: null,
        error: null
      });
      return;
    }

    let isActive = true;
    setState((prev) => ({ ...prev, status: "loading", error: null }));

    const run = async () => {
      try {
        const session = await initializeLIFFAndGetUser();
        if (!isActive || !session) {
          return;
        }
        setState({
          status: "ready",
          mode: "real",
          user: {
            lineUserId: session.lineUserId,
            displayName: session.displayName
          },
          error: null
        });
      } catch (error) {
        if (!isActive) {
          return;
        }
        setState({
          status: "error",
          mode: "real",
          user: null,
          error
        });
      }
    };

    run();

    return () => {
      isActive = false;
    };
  }, [useMock]);

  const value = useMemo(() => state, [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
