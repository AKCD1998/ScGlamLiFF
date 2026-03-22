# Bill Verification Mock Note

Date: 2026-03-17

## Summary

- Added a new static React page for the employee bill verification mockup in `src/pages/BillVerificationPage.jsx`.
- Added dedicated styles in `src/pages/BillVerificationPage.css` to match the requested warm beige, rounded-card visual direction.
- Wired the home screen button labeled `ร้านค้าตรวจสอบบิล` to navigate to the new route `/bill-verification`.

## Scope Guardrails

- No business logic was added.
- No API calls, form submission, editing, search, filtering, modal, or status updates were introduced.
- The page is UI mockup only, with navigation into the screen and standard breadcrumb back navigation out of it.

## Update: New Recipient Modal Mockup

- Converted the `ผู้รับสิทธิ์ใหม่` panel into a clickable button on the bill verification page.
- Added a separate static modal mockup for receipt capture and recipient detail layout.
- The modal is UI only: no upload logic, camera access, OCR, validation, save flow, or backend connection.
- Files created: `src/components/NewBillRecipientModal.jsx`, `src/components/NewBillRecipientModal.css`
- Files modified: `src/pages/BillVerificationPage.jsx`, `src/pages/BillVerificationPage.css`, `docs/bill-verification-mock-note.md`

## Update: Expanded Recipient Modal Fields

- Expanded the existing recipient modal with booking-related UI fields for booking date, booking time, and provider selection.
- Added an internal scrollable modal body so the panel stays within the viewport while longer content scrolls inside the dialog.
- Added footer workflow buttons for `บันทึกร่าง`, `ยกเลิก`, and `บันทึก` as UI-first placeholders only.
- Kept the implementation partial by design: lightweight date/time formatting only, with no submission flow, backend wiring, OCR, upload handling, or full validation.
- Files modified: `src/components/NewBillRecipientModal.jsx`, `src/components/NewBillRecipientModal.css`, `docs/bill-verification-mock-note.md`

## Update: Receipt Image Intake And OCR-Ready Flow

- Upgraded the top upload panel into a real image intake control with hidden file inputs for mobile camera capture and gallery selection.
- Added preview and confirmation flow before OCR runs, plus loading, success, and retryable error states inside the same modal.
- Added a backend-ready OCR service layer with parsing heuristics and a mock fallback response so the UI can later switch to a real PaddleOCR backend without rewriting the modal flow.
- Added a receipt summary state that replaces the original upload panel after OCR success while keeping the rest of the form fields and footer actions below.
- Files created: `src/services/receiptOcrService.js`
- Files modified: `src/components/NewBillRecipientModal.jsx`, `src/components/NewBillRecipientModal.css`, `docs/bill-verification-mock-note.md`

## Update: Dev Console Cleanup

- Enabled React Router future flags on the existing `HashRouter` to remove the v7 deprecation warnings shown during local development.
- Updated the receipt OCR service to respect mock mode and return mock OCR results immediately instead of calling the unfinished `/api/ocr/receipt` endpoint.
- This keeps the current receipt UI flow working in browser-based development without the extra 404 console noise.
- Files modified: `src/main.jsx`, `src/services/receiptOcrService.js`, `docs/bill-verification-mock-note.md`

## Update: OCR Mock Honesty And Amount Parsing

- Changed the receipt OCR fallback so mock mode no longer shows fake-looking receipt values as if they were extracted from the real photo.
- Added a UI note in the receipt summary panel to indicate when the result is still mock/fallback and not true OCR output.
- Tightened the amount parsing heuristic to avoid misreading date/time fragments like `2026 08` as a currency amount.
- Files modified: `src/services/receiptOcrService.js`, `src/components/NewBillRecipientModal.jsx`, `src/components/NewBillRecipientModal.css`, `docs/bill-verification-mock-note.md`

## Update: Backend OCR Scaffold

- Added a first backend OCR scaffold with a new `POST /api/ocr/receipt` endpoint wired into the existing Express app.
- Established a mock-first OCR response contract so the frontend can call the backend now before a real OCR engine is connected.
- Added separate backend modules for the OCR route, controller, service, upload middleware, and receipt parser.
- Kept parsing lightweight and heuristic-based for receipt line and total amount extraction from OCR-like raw text.
- Files created: `backend/routes/ocr.routes.js`, `backend/controllers/ocr.controller.js`, `backend/services/ocr/receipt-ocr.service.js`, `backend/services/ocr/receipt-parser.service.js`, `backend/middleware/receipt-upload.middleware.js`
- Files modified: `backend/index.js`, `backend/package.json`, `backend/package-lock.json`, `docs/bill-verification-mock-note.md`

## Update: OCR Upload Intake Contract

- Upgraded the OCR endpoint so `POST /api/ocr/receipt` now accepts multipart image uploads through the existing receipt upload middleware.
- Added image validation and file metadata in the response contract, including original filename, mimetype, and file size.
- Kept OCR extraction mock/stub internally for now while preserving the backend-ready parser and response structure.
- Files modified: `backend/services/ocr/receipt-ocr.service.js`, `docs/bill-verification-mock-note.md`

## Update: Python OCR Service Scaffold

- Added a separate Python OCR service scaffold under `backend/services/ocr_python` for future receipt OCR support.
- Chose FastAPI because there was no existing Python service pattern in the repo and it keeps the service small and easy to call from the Node backend later.
- Added placeholder modules for preprocessing, PaddleOCR extraction, and receipt parsing, with TODO notes marking where OpenCV and PaddleOCR will be integrated later.
- Current behavior is scaffold/mock-ready only and returns placeholder OCR text in a backend-friendly response shape.
- Files created: `backend/services/ocr_python/README.md`, `backend/services/ocr_python/requirements.txt`, `backend/services/ocr_python/app/main.py`, `backend/services/ocr_python/app/__init__.py`, `backend/services/ocr_python/app/services/__init__.py`, `backend/services/ocr_python/app/services/preprocess_service.py`, `backend/services/ocr_python/app/services/paddle_ocr_service.py`, `backend/services/ocr_python/app/services/receipt_parser.py`
- Files modified: `docs/bill-verification-mock-note.md`

## Update: Node To Python OCR Bridge

- Updated the Node OCR service so it can call the Python OCR service when `OCR_SERVICE_ENABLED=true`.
- Added OCR service config support through `OCR_SERVICE_BASE_URL`, `OCR_SERVICE_ENABLED`, and `OCR_SERVICE_FALLBACK_TO_MOCK`.
- Added fallback behavior so the Node backend can return controlled mock OCR results when the Python OCR service is disabled or unavailable.
- Kept the frontend OCR response contract stable, including `file`, `rawText`, `parsed`, `receiptLine`, and `totalAmount`.
- Files created: `backend/services/ocr/python-ocr-client.service.js`
- Files modified: `backend/services/ocr/receipt-ocr.service.js`, `docs/bill-verification-mock-note.md`

## Update: First Real Python OCR Pass

- Replaced the Python OCR scaffold's placeholder extractor with a first real OCR pipeline using OpenCV preprocessing plus PaddleOCR.
- Added practical receipt parsing for `receiptLine` and `totalAmount`, while keeping the API response shape stable for the existing Node backend and frontend flow.
- This is an initial pass and will still need tuning against more real receipt images, especially for noisy mobile captures and OCR confusion around tokens like `BNO`.
- Files modified: `backend/services/ocr_python/requirements.txt`, `backend/services/ocr_python/README.md`, `backend/services/ocr_python/app/main.py`, `backend/services/ocr_python/app/services/preprocess_service.py`, `backend/services/ocr_python/app/services/paddle_ocr_service.py`, `backend/services/ocr_python/app/services/receipt_parser.py`, `docs/bill-verification-mock-note.md`

## Update: Pharmacy Receipt OCR Tuning

- Tuned the Python OCR preprocessing and parser specifically for the pharmacy receipt layout we are targeting, with stronger focus on the date/time/BNO line and the final total amount.
- Added more OCR image variants, including cropped receipt-region variants when a paper-like contour is detected, and updated candidate scoring to prefer variants that successfully parse the two target fields.
- Tightened total-amount selection to avoid quantity-like values from `Items` or multiplication rows and to prefer the right-side amount around the `Total/Cash/Change` block.
- Tuned against the available sample receipt style and synthetic sanity-checks for this receipt family; more real samples will still help further.
- Files modified: `backend/services/ocr_python/app/services/preprocess_service.py`, `backend/services/ocr_python/app/services/paddle_ocr_service.py`, `backend/services/ocr_python/app/services/receipt_parser.py`, `backend/services/ocr_python/app/main.py`, `backend/services/ocr_python/README.md`, `docs/bill-verification-mock-note.md`

## Update: OCR Route Standardization For Bill Verification

- Older sections in this file remain as implementation history only.
- Current active OCR path is no longer "future" or "scaffold only" at the route-contract level.
- The active public route in this repo is now `POST /api/ocr/receipt`.
- The active chain is:
  - `src/components/NewBillRecipientModal.jsx`
  - `src/services/receiptOcrService.js`
  - `backend/routes/ocr.routes.js`
  - `backend/services/ocr/receipt-ocr.service.js`
  - `backend/services/ocr/python-ocr-client.service.js`
  - `backend/services/ocr_python/app/main.py`
- `VITE_OCR_API_BASE_URL` now exists so OCR can be routed to the local backend even when the rest of the frontend uses another API base.
- Legacy/mock OCR still exists, but is now explicitly labeled as legacy and not treated as active OCR evidence.
- Current OCR source-of-truth docs for this repo are now:
  - `OCR_INTEGRATION_STATUS.md`
  - `OCR_IMPLEMENTATION_LOG.md`

## Update: Cross-Repo OCR Routing Alignment

- Bill Verification OCR no longer treats this repo's local Node backend as the active public backend route.
- Active public route is now in the backend SSOT repo `scGlamLiff-reception/backend`:
  - `backend/src/routes/ocr.js`
  - `POST /api/ocr/receipt`
- This repo still owns:
  - upload UI in `src/components/NewBillRecipientModal.jsx`
  - frontend OCR caller in `src/services/receiptOcrService.js`
  - Python OCR runtime in `backend/services/ocr_python/app/main.py`
- Local development OCR routing is now aligned to that backend SSOT route through:
  - `.env.development.local` with `VITE_OCR_API_BASE_URL=http://localhost:5050`
  - `vite.config.js` proxy on `http://localhost:5050`
- The older local Node OCR modules under this repo's `backend/` folder are now legacy/WIP for this flow and should not be treated as the active Bill Verification backend path.
- Files modified in this pass:
  - `.env.development.local`
  - `DEV_MOCK_SETUP.md`
  - `OCR_INTEGRATION_STATUS.md`
  - `OCR_IMPLEMENTATION_LOG.md`
  - `IMPLEMENTATION_LOG_RECEIPT_BOOKING.md`
  - `backend/services/ocr_python/README.md`
  - `docs/bill-verification-mock-note.md`
