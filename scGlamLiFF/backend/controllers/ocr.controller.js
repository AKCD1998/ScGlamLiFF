import { processReceiptOcrRequest } from "../services/ocr/receipt-ocr.service.js";

export const postReceiptOcr = async (req, res) => {
  try {
    const result = await processReceiptOcrRequest({
      file: req.file,
      rawTextOverride: req.body?.rawText
    });

    res.json(result);
  } catch (error) {
    console.error("Failed to process receipt OCR", error);
    res.status(error.status || 500).json({
      error: error.message || "Failed to process receipt OCR"
    });
  }
};

export default postReceiptOcr;
