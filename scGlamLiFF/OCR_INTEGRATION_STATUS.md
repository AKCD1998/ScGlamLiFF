# OCR Integration Status

As of March 18, 2026, the backend SSOT repo at `scGlamLiff-reception` does not expose a dedicated `POST /api/ocr/receipt` route.

What exists in the SSOT backend:
- `receipt_evidence` is supported on `POST /api/appointments`
- `receipt_evidence` is supported on `POST /api/appointment-drafts` and `PATCH /api/appointment-drafts/:id`
- stored receipt data is handled by `backend/src/services/appointmentReceiptEvidenceService.js`

What does **not** exist in the SSOT backend:
- a dedicated OCR upload endpoint for parsing receipt images before appointment create/draft save

Frontend consequence:
- mock mode may still show mock OCR placeholders intentionally for local development
- real mode no longer converts OCR failures into fake success
- if the frontend calls `/api/ocr/receipt` and the backend returns `404`, the modal now shows a real OCR error state instead of placeholder receipt values

If a future backend OCR route is added:
1. confirm the exact path
2. confirm the multipart field name for the uploaded file
3. confirm the response payload shape
4. update `src/services/receiptOcrService.js` only if the new contract differs
