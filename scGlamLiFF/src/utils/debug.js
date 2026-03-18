import { debugEnabled } from "../config/env";

export const isDebugEnabled = (search = "") => {
  if (debugEnabled) {
    return true;
  }
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(search || window.location.search);
  return params.get("debug") === "1";
};
