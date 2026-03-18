import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import liff from "@line/liff";
import { useMock as mockEnabled } from "../config/env";
import { getMockUserId, storeMockUserIdFromQuery } from "../utils/mockAuth";
import { initializeLIFFAndGetUser } from "../utils/liffSession";

const AuthContext = createContext({
  status: "loading",
  mode: "mock",
  user: null,
  error: null,
  debug: null
});

const createDebugState = (overrides = {}) => ({
  useMock: mockEnabled,
  isInClient: null,
  isLoggedIn: null,
  hasIdToken: null,
  hasAccessToken: null,
  step: "init",
  ...overrides
});

const createMockUser = () => {
  const queryUserId = storeMockUserIdFromQuery();
  const userId = queryUserId || getMockUserId() || "mock-user-001";

  return {
    userId,
    lineUserId: userId,
    displayName: "Mock User",
    pictureUrl: "",
    statusMessage: "Mock mode"
  };
};

export function AuthProvider({ children }) {
  const location = useLocation();
  const [state, setState] = useState(() =>
    mockEnabled
      ? {
          status: "ready",
          mode: "mock",
          user: createMockUser(),
          error: null,
          debug: createDebugState({ step: "mock_ready" })
        }
      : {
          status: "loading",
          mode: "real",
          user: null,
          error: null,
          debug: createDebugState()
        }
  );

  useEffect(() => {
    if (!mockEnabled) {
      return;
    }

    setState({
      status: "ready",
      mode: "mock",
      user: createMockUser(),
      error: null,
      debug: createDebugState({ step: "mock_ready" })
    });
  }, [location.search]);

  useEffect(() => {
    if (mockEnabled) {
      return;
    }

    let isActive = true;
    setState((prev) => ({
      ...prev,
      status: "loading",
      error: null,
      debug: createDebugState({ step: "loading" })
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
            userId: session.lineUserId,
            lineUserId: session.lineUserId,
            displayName: session.displayName,
            pictureUrl: session.pictureUrl || "",
            statusMessage: session.statusMessage || ""
          },
          error: null,
          debug: createDebugState({
            isInClient: liff.isInClient(),
            isLoggedIn: liff.isLoggedIn(),
            hasIdToken: Boolean(liff.getIDToken()),
            hasAccessToken: Boolean(
              typeof liff.getAccessToken === "function" ? liff.getAccessToken() : ""
            ),
            step: "ready"
          })
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
            debug: createDebugState({
              isInClient: false,
              isLoggedIn: false,
              hasIdToken: false,
              hasAccessToken: false,
              step: "blocked_not_in_client"
            })
          });
          return;
        }

        const message = error?.message || String(error);
        setState({
          status: "error",
          mode: "real",
          user: null,
          error: { message },
          debug: createDebugState({ step: "error" })
        });
      }
    };

    run();

    return () => {
      isActive = false;
    };
  }, []);

  const value = useMemo(() => state, [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
