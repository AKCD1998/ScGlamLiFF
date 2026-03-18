import { debugEnabled, isDev, useMock } from "../config/env";
import { apiUrl } from "../utils/apiBase";

const OCR_ENDPOINT = "/api/ocr/receipt";
const OCR_UPLOAD_FIELD = "receipt";
const OCR_DEBUG_PREFIX = "[ReceiptOCR]";

const normalizeLine = (line) => line.replace(/\s+/g, " ").trim();

const splitReceiptLines = (text) =>
  String(text || "")
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);

const normalizeAmountCandidate = (rawValue) => {
  const cleaned = String(rawValue || "").replace(/[^\d., ]/g, "").trim();

  if (!cleaned) {
    return null;
  }

  let normalizedNumber = "";
  const spacedMatch = cleaned.match(/^(\d[\d,]*)\s(\d{2})$/);

  if (spacedMatch) {
    normalizedNumber = `${spacedMatch[1].replace(/,/g, "")}.${spacedMatch[2]}`;
  } else if (/^\d[\d,]*[.,]\d{2}$/.test(cleaned)) {
    normalizedNumber = cleaned.replace(/,/g, "");
  } else if (/^\d[\d,]*$/.test(cleaned)) {
    normalizedNumber = `${cleaned.replace(/,/g, "")}.00`;
  } else {
    return null;
  }

  const numericValue = Number(normalizedNumber);

  if (Number.isNaN(numericValue)) {
    return null;
  }

  return {
    numericValue,
    display: `${normalizedNumber} THB`
  };
};

const collectAmountsFromLine = (line) => {
  const uniqueMatches = new Set([
    ...(line.match(/\d[\d,]*\s\d{2}\b/g) || []),
    ...(line.match(/\d[\d,]*[.,]\d{2}\b/g) || [])
  ]);

  return [...uniqueMatches]
    .map((item) => normalizeAmountCandidate(item))
    .filter(Boolean);
};

const isReceiptMetaLine = (line) =>
  /\bBNO[:\s]?[A-Z0-9-:/]+\b/i.test(line) ||
  /\b\d{2}[/-]\d{2}[/-]\d{4}\b.*\b\d{2}:\d{2}\b/.test(line);

const findReceiptLine = (lines) =>
  lines.find((line) =>
    /\b\d{2}[/-]\d{2}[/-]\d{4}\b.*\b\d{2}:\d{2}\b.*\bBNO[:\s]?[A-Z0-9-:/]+\b/i.test(
      line
    )
  ) || "";

const findTotalAmountCandidate = (lines) => {
  const anchorIndexes = lines.reduce((matches, line, index) => {
    if (/\b(total|amount|items)\b/i.test(line)) {
      matches.push(index);
    }
    return matches;
  }, []);

  const anchoredLines = anchorIndexes.flatMap((index) =>
    lines.slice(Math.max(0, index - 1), index + 3)
  );
  const fallbackLines = lines.slice(-6);
  const candidates = [...anchoredLines, ...fallbackLines]
    .filter((line) => !isReceiptMetaLine(line))
    .flatMap((line) => collectAmountsFromLine(line))
    .sort((left, right) => right.numericValue - left.numericValue);

  const meaningfulCandidates = candidates.filter(
    (candidate) => candidate.numericValue >= 10
  );

  return meaningfulCandidates[0] || candidates[0] || null;
};

const pickFirstText = (...values) =>
  values.find((value) => typeof value === "string" && value.trim())?.trim() || "";

const pickFirstNumber = (...values) =>
  values.find((value) => typeof value === "number" && Number.isFinite(value)) ?? null;

const pickFirstObject = (...values) =>
  values.find(
    (value) => value && typeof value === "object" && !Array.isArray(value)
  ) || null;

const collectRawText = (payload) => {
  const parts = [];

  const pushText = (value) => {
    if (typeof value === "string" && value.trim()) {
      parts.push(value.trim());
    }
  };

  if (!payload || typeof payload !== "object") {
    return "";
  }

  pushText(payload.rawText);
  pushText(payload.text);
  pushText(payload.ocrText);
  pushText(payload.result?.rawText);
  pushText(payload.result?.text);

  if (Array.isArray(payload.lines)) {
    parts.push(payload.lines.join("\n"));
  }

  if (Array.isArray(payload.blocks)) {
    payload.blocks.forEach((block) => {
      if (typeof block === "string") {
        pushText(block);
        return;
      }

      pushText(block?.text);

      if (Array.isArray(block?.lines)) {
        parts.push(
          block.lines
            .map((line) => (typeof line === "string" ? line : line?.text || ""))
            .filter(Boolean)
            .join("\n")
        );
      }
    });
  }

  return parts.join("\n");
};

const safeJsonParse = (text) => {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const shouldLogOcrDebug = () => debugEnabled || isDev;

const logReceiptOcrDebug = (event, details = {}) => {
  if (!shouldLogOcrDebug()) {
    return;
  }

  console.info(OCR_DEBUG_PREFIX, {
    event,
    ...details
  });
};

const hasMeaningfulText = (value) =>
  typeof value === "string" && value.trim().length > 0;

const mapReceiptPayload = (payload, source) => {
  const rawText = collectRawText(payload);
  const lines = splitReceiptLines(rawText);
  const totalAmountCandidate = findTotalAmountCandidate(lines);
  const receiptLine =
    pickFirstText(
      payload?.receiptLine,
      payload?.receipt_line,
      payload?.receiptDateTimeOrIdLine,
      payload?.result?.receiptLine,
      payload?.result?.receipt_line
    ) || findReceiptLine(lines);
  const totalAmount =
    pickFirstText(
      payload?.totalAmount,
      payload?.total_amount,
      payload?.result?.totalAmount,
      payload?.result?.total_amount
    ) || totalAmountCandidate?.display || "";
  const totalAmountValue =
    pickFirstNumber(
      payload?.totalAmountTHB,
      payload?.total_amount_thb,
      payload?.result?.totalAmountTHB,
      payload?.result?.total_amount_thb
    ) ?? totalAmountCandidate?.numericValue ?? null;

  return {
    source,
    rawText,
    receiptLine,
    totalAmount,
    totalAmountValue,
    receiptNumber: pickFirstText(
      payload?.receiptNumber,
      payload?.receipt_number,
      payload?.result?.receiptNumber,
      payload?.result?.receipt_number
    ),
    receiptIdentifier: pickFirstText(
      payload?.receiptIdentifier,
      payload?.receipt_identifier,
      payload?.result?.receiptIdentifier,
      payload?.result?.receipt_identifier
    ),
    receiptImageRef: pickFirstText(
      payload?.receiptImageRef,
      payload?.receipt_image_ref,
      payload?.imageRef,
      payload?.image_ref,
      payload?.result?.receiptImageRef,
      payload?.result?.receipt_image_ref,
      payload?.result?.imageRef,
      payload?.result?.image_ref
    ),
    ocrStatus: pickFirstText(
      payload?.ocrStatus,
      payload?.ocr_status,
      payload?.status,
      payload?.result?.ocrStatus,
      payload?.result?.ocr_status,
      payload?.result?.status
    ),
    ocrMetadata: pickFirstObject(
      payload?.ocrMetadata,
      payload?.ocr_metadata,
      payload?.result?.ocrMetadata,
      payload?.result?.ocr_metadata
    ),
    statusNote: pickFirstText(
      payload?.statusNote,
      payload?.result?.statusNote
    )
  };
};

const hasMeaningfulReceiptResult = (result) =>
  Boolean(
    hasMeaningfulText(result?.rawText) ||
      hasMeaningfulText(result?.receiptLine) ||
      hasMeaningfulText(result?.totalAmount) ||
      hasMeaningfulText(result?.receiptNumber) ||
      hasMeaningfulText(result?.receiptIdentifier) ||
      hasMeaningfulText(result?.receiptImageRef) ||
      (typeof result?.totalAmountValue === "number" &&
        Number.isFinite(result.totalAmountValue)) ||
      (result?.ocrMetadata &&
        typeof result.ocrMetadata === "object" &&
        !Array.isArray(result.ocrMetadata) &&
        Object.keys(result.ocrMetadata).length > 0)
  );

const withReceiptDisplayFallbacks = (result) => ({
  ...result,
  receiptLine: result.receiptLine || "ไม่พบเลขที่ใบเสร็จ",
  totalAmount:
    result.totalAmount ||
    (typeof result.totalAmountValue === "number" &&
    Number.isFinite(result.totalAmountValue)
      ? `${result.totalAmountValue} THB`
      : "ไม่พบราคาสินค้า")
});

export class ReceiptOcrApiError extends Error {
  constructor(message, { status = 0, reason = "", payload = null, endpoint = "" } = {}) {
    super(message);
    this.name = "ReceiptOcrApiError";
    this.status = status;
    this.reason = reason;
    this.payload = payload;
    this.endpoint = endpoint;
  }
}

const preprocessReceiptImage = async (file) => {
  // Placeholder hook for optional browser-side cleanup before OCR.
  // A future iteration can insert lightweight OpenCV.js preprocessing here
  // (grayscale / threshold / contrast cleanup) before sending to the backend.
  return file;
};

const buildMockOcrResult = () => ({
  source: "mock",
  rawText: "",
  receiptLine: "ยังไม่ได้อ่านจากใบเสร็จจริง",
  totalAmount: "รอ OCR backend",
  totalAmountValue: null,
  receiptNumber: "",
  receiptIdentifier: "",
  receiptImageRef: "",
  ocrStatus: "",
  ocrMetadata: null,
  statusNote: "โหมด mock: แสดงข้อมูลตัวอย่างแทน OCR จริง"
});

const buildResponseError = (response, payload, endpoint) => {
  const status = response.status;
  const payloadMessage =
    pickFirstText(payload?.message, payload?.error, payload?.reason) ||
    `Receipt OCR request failed: ${status}`;

  if (status === 404) {
    return new ReceiptOcrApiError(
      "Backend SSOT ยังไม่มี POST /api/ocr/receipt สำหรับ OCR ใบเสร็จ",
      {
        status,
        reason: "missing_backend_endpoint",
        payload,
        endpoint
      }
    );
  }

  if (status === 400) {
    return new ReceiptOcrApiError(payloadMessage, {
      status,
      reason: "bad_request",
      payload,
      endpoint
    });
  }

  if (status === 401 || status === 403) {
    return new ReceiptOcrApiError("ยังไม่ได้เข้าสู่ระบบพนักงานสำหรับ OCR", {
      status,
      reason: "auth_required",
      payload,
      endpoint
    });
  }

  return new ReceiptOcrApiError(payloadMessage, {
    status,
    reason: "backend_error",
    payload,
    endpoint
  });
};

const requestReceiptOcr = async (file) => {
  const endpoint = apiUrl(OCR_ENDPOINT);
  const formData = new FormData();

  // Backend SSOT in scGlamLiff-reception currently does not expose a dedicated
  // OCR upload route. This keeps the intended endpoint explicit so a future
  // backend OCR contract can be wired here without reworking modal behavior.
  formData.append(OCR_UPLOAD_FIELD, file, file.name);

  logReceiptOcrDebug("request_started", {
    mockMode: false,
    endpoint,
    uploadField: OCR_UPLOAD_FIELD,
    fileName: file?.name || "",
    fileType: file?.type || "",
    fileSize: typeof file?.size === "number" ? file.size : null
  });

  let response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      credentials: "include",
      body: formData
    });
  } catch (error) {
    logReceiptOcrDebug("request_failed", {
      endpoint,
      reason: "network_error",
      errorMessage: error?.message || String(error)
    });

    throw new ReceiptOcrApiError("ไม่สามารถเชื่อมต่อ OCR backend ได้", {
      reason: "network_error",
      endpoint
    });
  }

  const responseText = await response.text();
  const payload = safeJsonParse(responseText);

  logReceiptOcrDebug("response_received", {
    endpoint,
    status: response.status,
    ok: response.ok,
    payloadKeys:
      payload && typeof payload === "object" ? Object.keys(payload) : []
  });

  if (!response.ok) {
    throw buildResponseError(response, payload, endpoint);
  }

  return payload;
};

export const processReceiptImage = async (file) => {
  const preparedFile = await preprocessReceiptImage(file);

  if (useMock) {
    logReceiptOcrDebug("mock_result_used", {
      mockMode: true,
      endpoint: apiUrl(OCR_ENDPOINT)
    });
    return buildMockOcrResult();
  }

  const payload = await requestReceiptOcr(preparedFile);
  const mappedResult = mapReceiptPayload(payload, "api");

  if (!hasMeaningfulReceiptResult(mappedResult)) {
    logReceiptOcrDebug("response_invalid", {
      endpoint: apiUrl(OCR_ENDPOINT),
      reason: "malformed_response"
    });

    throw new ReceiptOcrApiError("OCR backend ตอบกลับมา แต่ไม่มีข้อมูล OCR ที่ใช้งานได้", {
      reason: "malformed_response",
      payload,
      endpoint: apiUrl(OCR_ENDPOINT)
    });
  }

  const finalResult = withReceiptDisplayFallbacks(mappedResult);

  logReceiptOcrDebug("request_succeeded", {
    endpoint: apiUrl(OCR_ENDPOINT),
    source: finalResult.source,
    hasRawText: hasMeaningfulText(finalResult.rawText),
    hasReceiptLine: hasMeaningfulText(finalResult.receiptLine),
    hasAmount:
      typeof finalResult.totalAmountValue === "number" ||
      hasMeaningfulText(finalResult.totalAmount)
  });

  return finalResult;
};

