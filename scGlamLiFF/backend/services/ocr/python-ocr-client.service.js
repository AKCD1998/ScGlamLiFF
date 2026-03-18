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

export const OCR_SERVICE_ENABLED = parseBooleanEnv(process.env.OCR_SERVICE_ENABLED, false);

export const OCR_SERVICE_FALLBACK_TO_MOCK = parseBooleanEnv(
  process.env.OCR_SERVICE_FALLBACK_TO_MOCK,
  true
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

  const response = await fetch(buildOcrServiceUrl("/ocr/receipt"), {
    method: "POST",
    body: formData
  });
  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    const error = new Error(
      payload?.detail || payload?.error || `Python OCR service request failed: ${response.status}`
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload || {};
};
