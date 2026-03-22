import { parseReceiptText } from "./receipt-parser.service.js";
import {
  OCR_SERVICE_BASE_URL,
  OCR_SERVICE_ENABLED,
  OCR_SERVICE_FALLBACK_TO_MOCK,
  requestPythonReceiptOcr
} from "./python-ocr-client.service.js";

const DEFAULT_MOCK_RECEIPT_TEXT = [
  "17/03/2026 08:36 BNO:S2603004002-0006510",
  "Total 1.00 Items",
  "324 00"
].join("\n");

const EMPTY_PARSED_RESULT = Object.freeze({
  receiptLine: "",
  totalAmount: "",
  totalAmountValue: null,
  receiptDate: "",
  receiptTime: "",
  merchantName: ""
});

const trimText = (value) => (typeof value === "string" ? value.trim() : "");

const pickFirstObject = (...values) =>
  values.find(
    (value) => value && typeof value === "object" && !Array.isArray(value)
  ) || null;

const buildFileMetadata = (file) => ({
  originalName: file.originalname || "",
  mimeType: file.mimetype || "",
  size: Number(file.size) || 0
});

const normalizeAmountCandidate = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return {
      numericValue: value,
      display: value.toFixed(2)
    };
  }

  const cleaned = String(value || "").replace(/[^\d., ]/g, "").trim();

  if (!cleaned) {
    return null;
  }

  let normalized = "";
  const spacedMatch = cleaned.match(/^(\d[\d,]*)\s(\d{2})$/);

  if (spacedMatch) {
    normalized = `${spacedMatch[1].replace(/,/g, "")}.${spacedMatch[2]}`;
  } else if (/^\d[\d,]*[.,]\d{2}$/.test(cleaned)) {
    normalized = cleaned.replace(/,/g, "");
  } else if (/^\d[\d,]*$/.test(cleaned)) {
    normalized = `${cleaned.replace(/,/g, "")}.00`;
  } else {
    return null;
  }

  const numericValue = Number(normalized);

  if (Number.isNaN(numericValue)) {
    return null;
  }

  return {
    numericValue,
    display: numericValue.toFixed(2)
  };
};

const normalizeParsedReceipt = (parsed, rawText) => {
  const fallbackParsed = parseReceiptText(rawText);
  const parsedPayload = pickFirstObject(parsed) || {};
  const amountCandidate =
    normalizeAmountCandidate(parsedPayload.totalAmountValue) ||
    normalizeAmountCandidate(parsedPayload.totalAmount) ||
    normalizeAmountCandidate(fallbackParsed.totalAmountValue) ||
    normalizeAmountCandidate(fallbackParsed.totalAmount);
  const totalAmountText =
    amountCandidate
      ? `${amountCandidate.display} THB`
      : trimText(parsedPayload.totalAmount || fallbackParsed.totalAmount);

  return {
    receiptLine: trimText(
      parsedPayload.receiptLine || fallbackParsed.receiptLine
    ),
    totalAmount: totalAmountText,
    totalAmountValue: amountCandidate?.numericValue ?? null,
    receiptDate: trimText(
      parsedPayload.receiptDate || fallbackParsed.receiptDate
    ),
    receiptTime: trimText(
      parsedPayload.receiptTime || fallbackParsed.receiptTime
    ),
    merchantName: trimText(
      parsedPayload.merchantName || fallbackParsed.merchantName
    )
  };
};

const hasUsableParsedResult = (parsed) =>
  Boolean(
    trimText(parsed?.receiptLine) ||
      trimText(parsed?.totalAmount) ||
      (typeof parsed?.totalAmountValue === "number" &&
        Number.isFinite(parsed.totalAmountValue))
  );

export const buildReceiptOcrErrorPayload = ({
  code = "OCR_PROCESSING_FAILED",
  message = "Failed to process receipt OCR",
  mode = "node-receipt-ocr",
  details = null
} = {}) => ({
  success: false,
  code,
  message,
  ocrStatus: "error",
  mode,
  rawText: "",
  parsed: {
    ...EMPTY_PARSED_RESULT
  },
  receiptLine: "",
  totalAmount: "",
  totalAmountTHB: null,
  total_amount_thb: null,
  receiptDate: "",
  receiptTime: "",
  merchantName: "",
  ocrMetadata: {},
  ocr_metadata: {},
  error: {
    code,
    message,
    ...(details ? { details } : {})
  }
});

const buildReceiptOcrSuccessResponse = ({
  code = "OCR_OK",
  message = "Receipt OCR completed",
  ocrStatus = "success",
  mode,
  file,
  rawText,
  parsed,
  ocrMetadata = {},
  statusNote = ""
}) => {
  const normalizedParsed = normalizeParsedReceipt(parsed, rawText);

  return {
    success: true,
    code,
    message,
    ocrStatus,
    mode,
    file: buildFileMetadata(file),
    rawText: trimText(rawText),
    parsed: normalizedParsed,
    receiptLine: normalizedParsed.receiptLine,
    totalAmount: normalizedParsed.totalAmount,
    totalAmountTHB: normalizedParsed.totalAmountValue,
    total_amount_thb: normalizedParsed.totalAmountValue,
    receiptDate: normalizedParsed.receiptDate,
    receiptTime: normalizedParsed.receiptTime,
    merchantName: normalizedParsed.merchantName,
    ocrMetadata,
    ocr_metadata: ocrMetadata,
    statusNote,
    error: null
  };
};

export class ReceiptOcrProcessingError extends Error {
  constructor(
    message,
    { status = 500, code = "OCR_PROCESSING_FAILED", details = null, mode } = {}
  ) {
    super(message);
    this.name = "ReceiptOcrProcessingError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.mode = mode || "node-receipt-ocr";
    this.payload = buildReceiptOcrErrorPayload({
      code,
      message,
      mode: this.mode,
      details
    });
  }
}

const buildMockReceiptOcrResponse = ({
  file,
  rawText,
  mode = "mock-upload",
  statusNote = ""
}) => {
  const parsed = parseReceiptText(rawText);

  return buildReceiptOcrSuccessResponse({
    code: "OCR_LEGACY_MOCK_RESULT",
    message: "Legacy mock OCR result returned",
    ocrStatus: "mock",
    mode,
    file,
    rawText,
    parsed,
    ocrMetadata: {
      engine: "legacy-mock",
      activePath: false
    },
    statusNote
  });
};

const buildPythonReceiptOcrResponse = ({ file, payload }) => {
  const rawText = trimText(payload?.rawText || payload?.text);
  const parsed = normalizeParsedReceipt(payload?.parsed, rawText);

  if (!trimText(rawText) && !hasUsableParsedResult(parsed)) {
    throw new ReceiptOcrProcessingError(
      "Python OCR service returned no usable OCR data",
      {
        status: 502,
        code: "OCR_RESPONSE_INVALID",
        mode: trimText(payload?.mode) || "python-paddleocr"
      }
    );
  }

  return buildReceiptOcrSuccessResponse({
    code: trimText(payload?.code) || "OCR_OK",
    message: trimText(payload?.message) || "Receipt OCR completed",
    ocrStatus: trimText(payload?.ocrStatus) || "success",
    mode: trimText(payload?.mode) || "python-paddleocr",
    file,
    rawText,
    parsed,
    ocrMetadata:
      pickFirstObject(payload?.ocrMetadata, payload?.meta) || {}
  });
};

export const processReceiptOcrRequest = async ({ file, rawTextOverride }) => {
  const normalizedOverride =
    typeof rawTextOverride === "string" && rawTextOverride.trim()
      ? rawTextOverride.trim()
      : "";

  if (!file) {
    throw new ReceiptOcrProcessingError("receipt image is required", {
      status: 400,
      code: "OCR_IMAGE_REQUIRED"
    });
  }

  if (!file.mimetype?.startsWith("image/")) {
    throw new ReceiptOcrProcessingError("receipt must be an image file", {
      status: 400,
      code: "OCR_INVALID_FILE_TYPE"
    });
  }

  if (normalizedOverride) {
    return buildMockReceiptOcrResponse({
      file,
      rawText: normalizedOverride,
      mode: "mock-upload",
      statusNote:
        "Legacy mock OCR path was used from rawText override and should not be treated as real receipt OCR."
    });
  }

  if (!OCR_SERVICE_ENABLED) {
    if (!OCR_SERVICE_FALLBACK_TO_MOCK) {
      throw new ReceiptOcrProcessingError("Python OCR service is disabled", {
        status: 503,
        code: "OCR_SERVICE_DISABLED",
        details: {
          ocrServiceBaseUrl: OCR_SERVICE_BASE_URL
        }
      });
    }

    return buildMockReceiptOcrResponse({
      file,
      rawText: DEFAULT_MOCK_RECEIPT_TEXT,
      mode: "mock-upload",
      statusNote:
        "Legacy mock OCR fallback was used because OCR_SERVICE_ENABLED=false."
    });
  }

  try {
    const pythonPayload = await requestPythonReceiptOcr({ file });

    if (pythonPayload?.success === false) {
      throw new ReceiptOcrProcessingError(
        trimText(pythonPayload?.message) || "Python OCR service reported failure",
        {
          status: 502,
          code: trimText(pythonPayload?.code) || "OCR_SERVICE_UNAVAILABLE",
          details: pickFirstObject(
            pythonPayload?.error?.details,
            pythonPayload?.error,
            pythonPayload
          ),
          mode: trimText(pythonPayload?.mode) || "python-paddleocr"
        }
      );
    }

    return buildPythonReceiptOcrResponse({
      file,
      payload: pythonPayload
    });
  } catch (error) {
    if (!OCR_SERVICE_FALLBACK_TO_MOCK) {
      throw new ReceiptOcrProcessingError(
        error?.message || "Python OCR service is unavailable",
        {
          status: error?.status || 503,
          code: error?.code || "OCR_SERVICE_UNAVAILABLE",
          details: {
            ocrServiceBaseUrl: OCR_SERVICE_BASE_URL,
            upstreamPayload: error?.payload || null
          },
          mode: "python-paddleocr"
        }
      );
    }

    console.warn("[ReceiptOCRRoute] Python OCR unavailable; using legacy mock fallback", {
      message: error?.message || "unknown_error",
      status: error?.status || null,
      code: error?.code || null
    });

    return buildMockReceiptOcrResponse({
      file,
      rawText: DEFAULT_MOCK_RECEIPT_TEXT,
      mode: "mock-fallback",
      statusNote:
        "Legacy mock OCR fallback was used because the Python OCR service was unavailable."
    });
  }
};

export default processReceiptOcrRequest;
