import liff from "@line/liff";
import { apiUrl } from "./apiBase";

export const initializeLIFFAndGetUser = async () => {
  const liffId = import.meta.env.VITE_LIFF_ID;
  if (!liffId) {
    throw new Error("Missing VITE_LIFF_ID");
  }

  await liff.init({ liffId });

  if (!liff.isLoggedIn()) {
    liff.login();
    return null;
  }

  const idToken = liff.getIDToken();
  if (!idToken) {
    throw new Error("Missing LINE ID token");
  }

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
  return {
    mode: "real",
    lineUserId: data.lineUserId,
    displayName: data.displayName || "LINE User"
  };
};
