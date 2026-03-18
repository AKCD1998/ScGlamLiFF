import { apiUrl } from "../utils/apiBase";
import { useMock } from "../config/env";

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
    ) ||
    findReceiptLine(lines) ||
    "ไม่พบเลขที่ใบเสร็จ";
  const totalAmount =
    pickFirstText(
      payload?.totalAmount,
      payload?.total_amount,
      payload?.result?.totalAmount,
      payload?.result?.total_amount
    ) ||
    totalAmountCandidate?.display ||
    "ไม่พบราคาสินค้า";
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

const preprocessReceiptImage = async (file) => {
  // Placeholder hook for optional browser-side cleanup before OCR.
  // A future iteration can insert lightweight OpenCV.js preprocessing here
  // (grayscale / threshold / contrast cleanup) before sending to the backend.
  return file;
};

const requestReceiptOcr = async (file) => {
  const formData = new FormData();
  formData.append("receipt", file, file.name);

  const response = await fetch(apiUrl("/api/ocr/receipt"), {
    method: "POST",
    credentials: "include",
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Receipt OCR request failed: ${response.status}`);
  }

  return response.json();
};

const buildUnavailableOcrResult = (message, source) => ({
  source,
  rawText: "",
  receiptLine: "ยังไม่ได้อ่านจากใบเสร็จจริง",
  totalAmount: "รอ OCR backend",
  totalAmountValue: null,
  receiptNumber: "",
  receiptIdentifier: "",
  receiptImageRef: "",
  ocrStatus: "",
  ocrMetadata: null,
  statusNote: message
});

export const processReceiptImage = async (file) => {
  const preparedFile = await preprocessReceiptImage(file);

  if (useMock) {
    return buildUnavailableOcrResult(
      "โหมด mock: ยังไม่ได้เชื่อม OCR จริงกับรูปใบเสร็จนี้",
      "mock"
    );
  }

  try {
    const payload = await requestReceiptOcr(preparedFile);
    return mapReceiptPayload(payload, "api");
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }

    return buildUnavailableOcrResult(
      "OCR backend ยังไม่พร้อมหรือ endpoint ยังไม่ถูกเชื่อมต่อ",
      "fallback"
    );
  }
};
