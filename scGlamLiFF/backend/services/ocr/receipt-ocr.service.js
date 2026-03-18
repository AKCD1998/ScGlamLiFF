import { parseReceiptText } from "./receipt-parser.service.js";
import {
  OCR_SERVICE_ENABLED,
  OCR_SERVICE_FALLBACK_TO_MOCK,
  requestPythonReceiptOcr
} from "./python-ocr-client.service.js";

const DEFAULT_MOCK_RECEIPT_TEXT = [
  "17/03/2026 08:36 BNO:S2603004002-0006510",
  "Total 1.00 Items",
  "324 00"
].join("\n");

const buildFileMetadata = (file) => ({
  originalName: file.originalname || "",
  mimeType: file.mimetype || "",
  size: Number(file.size) || 0
});

const buildReceiptOcrResponse = ({ mode, file, rawText, parsed }) => ({
  success: true,
  ocrStatus: "success",
  mode,
  file: buildFileMetadata(file),
  rawText,
  receiptLine: parsed.receiptLine,
  totalAmount: parsed.totalAmount,
  parsed
});

const buildParsedReceiptResult = ({ payload, rawText }) => {
  const fallbackParsed = parseReceiptText(rawText);

  return {
    receiptLine:
      payload?.parsed?.receiptLine ||
      payload?.receiptLine ||
      fallbackParsed.receiptLine ||
      "",
    totalAmount:
      payload?.parsed?.totalAmount ||
      payload?.totalAmount ||
      fallbackParsed.totalAmount ||
      ""
  };
};

const buildMockReceiptOcrResponse = ({ file, rawText, mode = "mock-upload" }) => {
  const parsed = parseReceiptText(rawText);

  return buildReceiptOcrResponse({
    mode,
    file,
    rawText,
    parsed
  });
};

const buildPythonReceiptOcrResponse = ({ file, payload }) => {
  const rawText = String(payload?.rawText || payload?.text || "").trim();
  const parsed = buildParsedReceiptResult({ payload, rawText });

  return {
    success: payload?.success !== false,
    ocrStatus: payload?.ocrStatus || "success",
    mode: payload?.mode || "python-service",
    file: buildFileMetadata(file),
    rawText,
    receiptLine: parsed.receiptLine,
    totalAmount: parsed.totalAmount,
    parsed
  };
};

export const processReceiptOcrRequest = async ({ file, rawTextOverride }) => {
  const normalizedOverride =
    typeof rawTextOverride === "string" && rawTextOverride.trim()
      ? rawTextOverride.trim()
      : "";

  if (!file) {
    const error = new Error("receipt image is required");
    error.status = 400;
    throw error;
  }

  if (!file.mimetype?.startsWith("image/")) {
    const error = new Error("receipt must be an image file");
    error.status = 400;
    throw error;
  }

  if (normalizedOverride) {
    return buildMockReceiptOcrResponse({
      file,
      rawText: normalizedOverride,
      mode: "mock-upload"
    });
  }

  if (!OCR_SERVICE_ENABLED) {
    return buildMockReceiptOcrResponse({
      file,
      rawText: DEFAULT_MOCK_RECEIPT_TEXT,
      mode: "mock-upload"
    });
  }

  try {
    const pythonPayload = await requestPythonReceiptOcr({ file });
    return buildPythonReceiptOcrResponse({
      file,
      payload: pythonPayload
    });
  } catch (error) {
    if (!OCR_SERVICE_FALLBACK_TO_MOCK) {
      const serviceError = new Error(
        error.message || "Python OCR service is unavailable"
      );
      serviceError.status = error.status || 502;
      throw serviceError;
    }

    console.warn("Python OCR service unavailable. Falling back to mock OCR.", {
      message: error.message,
      status: error.status
    });

    return buildMockReceiptOcrResponse({
      file,
      rawText: DEFAULT_MOCK_RECEIPT_TEXT,
      mode: "mock-fallback"
    });
  }
};

export default processReceiptOcrRequest;
