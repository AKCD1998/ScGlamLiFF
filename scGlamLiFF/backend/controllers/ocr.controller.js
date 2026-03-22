import {
  buildReceiptOcrErrorPayload,
  processReceiptOcrRequest
} from "../services/ocr/receipt-ocr.service.js";

const createRequestId = () =>
  `ocr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const postReceiptOcr = async (req, res) => {
  const requestId = createRequestId();
  const startedAt = Date.now();
  const hasRawTextOverride =
    typeof req.body?.rawText === "string" && req.body.rawText.trim().length > 0;

  console.info("[ReceiptOCRRoute]", {
    event: "request_started",
    requestId,
    fileName: req.file?.originalname || "",
    fileType: req.file?.mimetype || "",
    fileSize: Number(req.file?.size) || 0,
    hasRawTextOverride
  });

  try {
    const result = await processReceiptOcrRequest({
      file: req.file,
      rawTextOverride: req.body?.rawText
    });

    console.info("[ReceiptOCRRoute]", {
      event: "request_succeeded",
      requestId,
      durationMs: Date.now() - startedAt,
      code: result.code || null,
      mode: result.mode || null,
      ocrStatus: result.ocrStatus || null,
      success: result.success === true
    });

    res.json(result);
  } catch (error) {
    console.error("[ReceiptOCRRoute]", {
      event: "request_failed",
      requestId,
      durationMs: Date.now() - startedAt,
      status: error.status || 500,
      code: error.code || "OCR_PROCESSING_FAILED",
      message: error.message || "Failed to process receipt OCR"
    });

    res
      .status(error.status || 500)
      .json(
        error.payload ||
          buildReceiptOcrErrorPayload({
            code: error.code || "OCR_PROCESSING_FAILED",
            message: error.message || "Failed to process receipt OCR"
          })
      );
  }
};

export default postReceiptOcr;
