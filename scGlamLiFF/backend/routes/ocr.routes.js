import express from "express";
import postReceiptOcr from "../controllers/ocr.controller.js";
import receiptUploadMiddleware from "../middleware/receipt-upload.middleware.js";

const router = express.Router();

router.post("/api/ocr/receipt", receiptUploadMiddleware, postReceiptOcr);

export default router;
