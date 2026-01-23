import liff from "@line/liff";
import { apiUrl } from "./apiBase";

export const initializeLIFFAndGetUser = async (onStep) => {
  const liffId = (import.meta.env.VITE_LIFF_ID || "").trim();
  console.log("LIFF raw =", JSON.stringify(import.meta.env.VITE_LIFF_ID));
  console.log("LIFF trimmed =", JSON.stringify(liffId), "len=", liffId.length);
  if (!liffId) {
    throw new Error("Missing VITE_LIFF_ID");
  }

  onStep?.({
    step: "init_start",
    isInClient: liff.isInClient()
  });

  await liff.init({ liffId });

  onStep?.({
    step: "init_done",
    isInClient: liff.isInClient(),
    isLoggedIn: liff.isLoggedIn()
  });

  if (!liff.isInClient()) {
    onStep?.({
      step: "blocked_not_in_client",
      isInClient: false
    });
    throw new Error("LIFF_NOT_IN_CLIENT");
  }

  if (!liff.isLoggedIn()) {
    onStep?.({ step: "login_required" });
    liff.login();
    return null;
  }

  const idToken = liff.getIDToken();
  if (!idToken) {
    throw new Error("Missing LINE ID token");
  }

  onStep?.({ step: "token_ready", hasIdToken: Boolean(idToken) });

  const response = await fetch(apiUrl("/api/liff/session"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.error || "Failed to verify LINE session");
  }

  const data = await response.json();
  onStep?.({ step: "session_verified" });
  return {
    mode: "real",
    lineUserId: data.lineUserId,
    displayName: data.displayName || "LINE User"
  };
};
