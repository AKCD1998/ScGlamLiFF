import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import liff from "@line/liff";
import { getMockUserId, storeMockUserIdFromQuery } from "../utils/mockAuth";
import { initializeLIFFAndGetUser } from "../utils/liffSession";

const AuthContext = createContext({
  status: "loading",
  mode: "mock",
  user: null,
  error: null,
  debug: null
});

export function AuthProvider({ children }) {
  const location = useLocation();
  const useMock = import.meta.env.VITE_USE_MOCK === "true";
  const [state, setState] = useState({
    status: "loading",
    mode: useMock ? "mock" : "real",
    user: null,
    error: null,
    debug: {
      useMock,
      isInClient: liff.isInClient(),
      isLoggedIn: liff.isLoggedIn(),
      hasIdToken: false,
      step: "init"
    }
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
      error: null,
      debug: {
        useMock: true,
        isInClient: liff.isInClient(),
        isLoggedIn: liff.isLoggedIn(),
        hasIdToken: false,
        step: "mock_ready"
      }
    });
  }, [useMock, location.search]);

  useEffect(() => {
    if (useMock) {
      return;
    }

    let isActive = true;
    setState((prev) => ({
      ...prev,
      status: "loading",
      error: null,
      debug: {
        ...prev.debug,
        useMock: false,
        isInClient: true,
        isLoggedIn: liff.isLoggedIn(),
        step: "loading"
      }
    }));

    const run = async () => {
      try {
        const session = await initializeLIFFAndGetUser((info) => {
          if (!isActive) {
            return;
          }
          setState((prev) => ({
            ...prev,
            debug: {
              ...prev.debug,
              ...info
            }
          }));
        });
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
          error: null,
          debug: {
            useMock: false,
            isInClient: liff.isInClient(),
            isLoggedIn: liff.isLoggedIn(),
            hasIdToken: Boolean(liff.getIDToken()),
            step: "ready"
          }
        });
      } catch (error) {
        if (!isActive) {
          return;
        }
        if (error?.message === "LIFF_NOT_IN_CLIENT") {
          setState({
            status: "blocked",
            mode: "real",
            user: null,
            error: null,
            debug: {
              useMock: false,
              isInClient: false,
              isLoggedIn: false,
              hasIdToken: false,
              step: "blocked_not_in_client"
            }
          });
          return;
        }

        setState({
          status: "error",
          mode: "real",
          user: null,
          error,
          debug: {
            useMock: false,
            isInClient: liff.isInClient(),
            isLoggedIn: liff.isLoggedIn(),
            hasIdToken: Boolean(liff.getIDToken()),
            step: "error"
          }
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
