const toBoolean = (value) => value === "true";
const trim = (value) => (typeof value === "string" ? value.trim() : "");

const env = {
  isProd: import.meta.env.PROD,
  isDev: import.meta.env.DEV,
  useMock: toBoolean(import.meta.env.VITE_USE_MOCK),
  apiBaseUrl: trim(import.meta.env.VITE_API_BASE_URL).replace(/\/+$/, ""),
  ocrApiBaseUrl: trim(import.meta.env.VITE_OCR_API_BASE_URL).replace(/\/+$/, ""),
  liffId: trim(import.meta.env.VITE_LIFF_ID),
  omisePublicKey: trim(import.meta.env.VITE_OMISE_PUBLIC_KEY),
  debugEnabled: toBoolean(import.meta.env.VITE_ENABLE_DEBUG)
};

if (env.isProd && env.useMock) {
  throw new Error("Production build cannot run with VITE_USE_MOCK=true");
}

export const {
  apiBaseUrl,
  debugEnabled,
  isDev,
  isProd,
  liffId,
  ocrApiBaseUrl,
  omisePublicKey,
  useMock
} = env;

export default env;
