import {
  apiBaseUrl,
  debugEnabled,
  isDev,
  ocrApiBaseUrl,
  useMock
} from "../config/env";
import { buildApiUrl } from "../utils/apiBase";

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

const pickFirstArray = (...values) =>
  values.find((value) => Array.isArray(value) && value.length > 0) || [];

const getOcrEndpoint = () => buildApiUrl(ocrApiBaseUrl || apiBaseUrl, OCR_ENDPOINT);

const getPayloadMode = (payload) =>
  pickFirstText(payload?.mode, payload?.result?.mode).toLowerCase();

const getPayloadCode = (payload) =>
  pickFirstText(
    payload?.errorCode,
    payload?.code,
    payload?.error?.code,
    payload?.result?.errorCode,
    payload?.result?.code
  );

const getPayloadMessage = (payload) =>
  pickFirstText(
    payload?.errorMessage,
    payload?.message,
    payload?.error?.message,
    payload?.error,
    payload?.reason,
    payload?.result?.errorMessage,
    payload?.result?.message
  );

const isLegacyMockPayload = (payload) => {
  const mode = getPayloadMode(payload);
  const code = getPayloadCode(payload);
  const ocrStatus = pickFirstText(
    payload?.ocrStatus,
    payload?.ocr_status,
    payload?.result?.ocrStatus,
    payload?.result?.ocr_status
  ).toLowerCase();

  return (
    mode.startsWith("mock") ||
    code === "OCR_LEGACY_MOCK_RESULT" ||
    ocrStatus === "mock"
  );
};

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
  pushText(payload.ocrText);
  pushText(payload.text);
  pushText(payload.ocrText);
  pushText(payload.result?.rawText);
  pushText(payload.result?.ocrText);
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

const collectReceiptLines = (payload, rawText) => {
  const payloadLines = pickFirstArray(
    payload?.receiptLines,
    payload?.receipt_lines,
    payload?.parsed?.receiptLines,
    payload?.parsed?.receipt_lines,
    payload?.result?.receiptLines,
    payload?.result?.receipt_lines
  )
    .map((line) => normalizeLine(String(line || "")))
    .filter(Boolean);

  return payloadLines.length ? payloadLines : splitReceiptLines(rawText);
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

const mapReceiptPayload = (payload) => {
  const rawText = collectRawText(payload);
  const lines = collectReceiptLines(payload, rawText);
  const totalAmountCandidate = findTotalAmountCandidate(lines);
  const source = isLegacyMockPayload(payload) ? "mock" : "api";
  const payloadMessage = getPayloadMessage(payload);
  const payloadCode = getPayloadCode(payload);
  const receiptLine =
    pickFirstText(
      payload?.receiptLine,
      payload?.receipt_line,
      payload?.receiptDateTimeOrIdLine,
      payload?.parsed?.receiptLine,
      payload?.result?.receiptLine,
      payload?.result?.receipt_line
    ) || findReceiptLine(lines);
  const totalAmountValue =
    pickFirstNumber(
      payload?.totalAmountTHB,
      payload?.total_amount_thb,
      payload?.parsed?.totalAmountValue,
      payload?.parsed?.total_amount_value,
      payload?.result?.totalAmountTHB,
      payload?.result?.total_amount_thb
    ) ?? totalAmountCandidate?.numericValue ?? null;
  const totalAmount =
    pickFirstText(
      payload?.totalAmount,
      payload?.total_amount,
      payload?.parsed?.totalAmount,
      payload?.parsed?.total_amount,
      payload?.result?.totalAmount,
      payload?.result?.total_amount
    ) ||
    (typeof totalAmountValue === "number" && Number.isFinite(totalAmountValue)
      ? `${totalAmountValue} THB`
      : totalAmountCandidate?.display || "");

  return {
    source,
    rawText,
    ocrText: rawText,
    receiptLine,
    receiptLines: lines,
    totalAmount,
    totalAmountValue,
    receiptDate: pickFirstText(
      payload?.receiptDate,
      payload?.receipt_date,
      payload?.parsed?.receiptDate,
      payload?.parsed?.receipt_date,
      payload?.result?.receiptDate,
      payload?.result?.receipt_date
    ),
    receiptTime: pickFirstText(
      payload?.receiptTime,
      payload?.receipt_time,
      payload?.parsed?.receiptTime,
      payload?.parsed?.receipt_time,
      payload?.result?.receiptTime,
      payload?.result?.receipt_time
    ),
    merchantName: pickFirstText(
      payload?.merchant,
      payload?.merchantName,
      payload?.merchant_name,
      payload?.parsed?.merchant,
      payload?.parsed?.merchantName,
      payload?.parsed?.merchant_name,
      payload?.result?.merchant,
      payload?.result?.merchantName,
      payload?.result?.merchant_name
    ),
    merchant: pickFirstText(
      payload?.merchant,
      payload?.merchantName,
      payload?.merchant_name,
      payload?.parsed?.merchant,
      payload?.parsed?.merchantName,
      payload?.parsed?.merchant_name,
      payload?.result?.merchant,
      payload?.result?.merchantName,
      payload?.result?.merchant_name
    ),
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
    ocrCode: payloadCode,
    ocrMessage: payloadMessage,
    errorCode: source === "mock" ? "" : payloadCode,
    errorMessage: source === "mock" ? "" : payloadMessage,
    statusNote: pickFirstText(
      payload?.statusNote,
      payload?.result?.statusNote,
      source === "mock"
        ? payloadMessage ||
            "ผลลัพธ์นี้มาจาก legacy mock OCR และจะไม่ถูกแนบเป็น receipt evidence จริง"
        : ""
    )
  };
};

const hasMeaningfulReceiptResult = (result) =>
  Boolean(
    hasMeaningfulText(result?.rawText) ||
      hasMeaningfulText(result?.receiptLine) ||
      (Array.isArray(result?.receiptLines) && result.receiptLines.length > 0) ||
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
  constructor(
    message,
    { status = 0, reason = "", payload = null, endpoint = "", code = "" } = {}
  ) {
    super(message);
    this.name = "ReceiptOcrApiError";
    this.status = status;
    this.reason = reason;
    this.payload = payload;
    this.endpoint = endpoint;
    this.code = code;
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
  ocrText: "",
  receiptLine: "ยังไม่ได้อ่านจากใบเสร็จจริง",
  receiptLines: [],
  totalAmount: "รอ OCR backend",
  totalAmountValue: null,
  receiptDate: "",
  receiptTime: "",
  merchant: "",
  merchantName: "",
  receiptNumber: "",
  receiptIdentifier: "",
  receiptImageRef: "",
  ocrStatus: "",
  ocrMetadata: null,
  ocrCode: "",
  ocrMessage: "",
  errorCode: "",
  errorMessage: "",
  statusNote: "โหมด mock: แสดงข้อมูลตัวอย่างแทน OCR จริง"
});

const buildResponseError = (response, payload, endpoint) => {
  const status = response.status;
  const payloadCode = getPayloadCode(payload);
  const payloadMessage =
    getPayloadMessage(payload) || `Receipt OCR request failed: ${status}`;

  if (status === 404) {
    return new ReceiptOcrApiError("ไม่พบ OCR route ที่ backend นี้", {
      status,
      reason: "route_not_found",
      payload,
      endpoint,
      code: payloadCode || "OCR_ROUTE_NOT_FOUND"
    });
  }

  if (status === 400) {
    return new ReceiptOcrApiError(payloadMessage, {
      status,
      reason: "bad_request",
      payload,
      endpoint,
      code: payloadCode
    });
  }

  if (status === 401 || status === 403) {
    return new ReceiptOcrApiError("ยังไม่ได้เข้าสู่ระบบพนักงานสำหรับ OCR", {
      status,
      reason: "auth_required",
      payload,
      endpoint,
      code: payloadCode
    });
  }

  if (
    status === 502 ||
    status === 503 ||
    payloadCode === "OCR_SERVICE_UNAVAILABLE" ||
    payloadCode === "OCR_SERVICE_DISABLED"
  ) {
    return new ReceiptOcrApiError(payloadMessage, {
      status,
      reason: "service_unavailable",
      payload,
      endpoint,
      code: payloadCode || "OCR_SERVICE_UNAVAILABLE"
    });
  }

  if (payloadCode === "OCR_RESPONSE_INVALID") {
    return new ReceiptOcrApiError(payloadMessage, {
      status,
      reason: "malformed_response",
      payload,
      endpoint,
      code: payloadCode
    });
  }

  return new ReceiptOcrApiError(payloadMessage, {
    status,
    reason: "backend_error",
    payload,
    endpoint,
    code: payloadCode
  });
};

const requestReceiptOcr = async (file) => {
  const endpoint = getOcrEndpoint();
  const formData = new FormData();
  formData.append(OCR_UPLOAD_FIELD, file, file.name);

  logReceiptOcrDebug("request_started", {
    mockMode: false,
    endpoint,
    usesDedicatedOcrBaseUrl: Boolean(ocrApiBaseUrl),
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
      endpoint,
      code: "OCR_NETWORK_ERROR"
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
  const endpoint = getOcrEndpoint();

  if (useMock) {
    logReceiptOcrDebug("mock_result_used", {
      mockMode: true,
      endpoint
    });
    return buildMockOcrResult();
  }

  const payload = await requestReceiptOcr(preparedFile);
  const mappedResult = mapReceiptPayload(payload);

  if (!hasMeaningfulReceiptResult(mappedResult)) {
    logReceiptOcrDebug("response_invalid", {
      endpoint,
      reason: "malformed_response"
    });

    throw new ReceiptOcrApiError("OCR backend ตอบกลับมา แต่ไม่มีข้อมูล OCR ที่ใช้งานได้", {
      reason: "malformed_response",
      payload,
      endpoint,
      code: getPayloadCode(payload) || "OCR_RESPONSE_INVALID"
    });
  }

  const finalResult = withReceiptDisplayFallbacks(mappedResult);

  logReceiptOcrDebug("request_succeeded", {
    endpoint,
    source: finalResult.source,
    code: finalResult.ocrCode || null,
    mode: getPayloadMode(payload) || null,
    hasRawText: hasMeaningfulText(finalResult.rawText),
    hasReceiptLine: hasMeaningfulText(finalResult.receiptLine),
    hasAmount:
      typeof finalResult.totalAmountValue === "number" ||
      hasMeaningfulText(finalResult.totalAmount)
  });

  return finalResult;
};
