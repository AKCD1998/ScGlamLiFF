const parseBooleanEnv = (value, fallbackValue = false) => {
  if (typeof value !== "string") {
    return fallbackValue;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallbackValue;
};

const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

export const OCR_SERVICE_BASE_URL =
  trimTrailingSlash(process.env.OCR_SERVICE_BASE_URL) || "http://127.0.0.1:8001";

export const OCR_SERVICE_ENABLED = parseBooleanEnv(process.env.OCR_SERVICE_ENABLED, true);

export const OCR_SERVICE_FALLBACK_TO_MOCK = parseBooleanEnv(
  process.env.OCR_SERVICE_FALLBACK_TO_MOCK,
  false
);

const buildOcrServiceUrl = (path) => `${OCR_SERVICE_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

const parseJsonSafely = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
};

export const requestPythonReceiptOcr = async ({ file }) => {
  const formData = new FormData();
  const blob = new Blob([file.buffer], {
    type: file.mimetype || "application/octet-stream"
  });

  formData.append("receipt", blob, file.originalname || "receipt-image");

  const endpoint = buildOcrServiceUrl("/ocr/receipt");
  let response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      body: formData
    });
  } catch (networkError) {
    const error = new Error(
      networkError?.message || "Python OCR service is unavailable"
    );
    error.status = 503;
    error.code = "OCR_SERVICE_UNAVAILABLE";
    error.payload = null;
    throw error;
  }

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    const detail =
      payload?.detail && typeof payload.detail === "object"
        ? payload.detail
        : null;
    const error = new Error(
      detail?.message ||
        payload?.message ||
        payload?.error?.message ||
        payload?.error ||
        `Python OCR service request failed: ${response.status}`
    );
    error.status = response.status;
    error.code =
      detail?.code ||
      payload?.code ||
      payload?.error?.code ||
      "OCR_SERVICE_UNAVAILABLE";
    error.payload = payload;
    throw error;
  }

  return payload || {};
};
