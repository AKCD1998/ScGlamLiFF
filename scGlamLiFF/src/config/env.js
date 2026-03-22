const toBoolean = (value) => value === "true";
const trim = (value) => (typeof value === "string" ? value.trim() : "");
const toPositiveInteger = (value, fallbackValue) => {
  const parsedValue = Number.parseInt(String(value || ""), 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallbackValue;
  }

  return parsedValue;
};

const env = {
  isProd: import.meta.env.PROD,
  isDev: import.meta.env.DEV,
  useMock: toBoolean(import.meta.env.VITE_USE_MOCK),
  apiBaseUrl: trim(import.meta.env.VITE_API_BASE_URL).replace(/\/+$/, ""),
  ocrApiBaseUrl: trim(import.meta.env.VITE_OCR_API_BASE_URL).replace(/\/+$/, ""),
  ocrRequestTimeoutMs: toPositiveInteger(
    import.meta.env.VITE_OCR_REQUEST_TIMEOUT_MS,
    15000
  ),
  liffId: trim(import.meta.env.VITE_LIFF_ID),
  omisePublicKey: trim(import.meta.env.VITE_OMISE_PUBLIC_KEY),
  debugEnabled: toBoolean(import.meta.env.VITE_ENABLE_DEBUG),
  buildVersion:
    trim(import.meta.env.VITE_BUILD_VERSION) ||
    (import.meta.env.DEV ? "dev-local" : "unversioned"),
  buildTimeUtc: trim(import.meta.env.VITE_BUILD_TIME_UTC)
};

if (env.isProd && env.useMock) {
  throw new Error("Production build cannot run with VITE_USE_MOCK=true");
}

export const {
  apiBaseUrl,
  buildTimeUtc,
  buildVersion,
  debugEnabled,
  isDev,
  isProd,
  liffId,
  ocrApiBaseUrl,
  ocrRequestTimeoutMs,
  omisePublicKey,
  useMock
} = env;

export default env;
