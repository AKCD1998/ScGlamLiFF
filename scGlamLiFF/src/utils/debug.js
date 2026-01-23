export const isDebugEnabled = (search = "") => {
  if (import.meta.env.VITE_ENABLE_DEBUG === "true") {
    return true;
  }
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(search || window.location.search);
  return params.get("debug") === "1";
};
