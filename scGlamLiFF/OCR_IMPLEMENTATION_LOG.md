# OCR Implementation Log

## Timestamp
- `2026-03-22T10:14:06.9072045+07:00`

## Goal
- Close the OCR routing gap across `scGlamLiFFF` and `scGlamLiff-reception`.
- Keep the current Bill Verification UI and booking flow intact.
- Make the OCR route usable end-to-end with one active backend path.

## What Was Broken
- Frontend and markdown still described the OCR route as if the active Node backend lived inside this repo.
- Local frontend development still defaulted to a remote API base, so OCR could miss the new backend route in `scGlamLiff-reception`.
- Backend SSOT repo had no real `POST /api/ocr/receipt` route before this pass.
- OCR response contracts drifted across frontend mapping, Node handling, and Python output.
- Runtime ownership was split across repos but not documented clearly.

## Active OCR Path After This Pass
1. `src/components/NewBillRecipientModal.jsx`
2. `src/services/receiptOcrService.js`
3. `.env.development.local` / `vite.config.js`
4. `..\..\scGlamLiff-reception\backend\src\routes\ocr.js`
5. `..\..\scGlamLiff-reception\backend\src\controllers\ocrController.js`
6. `..\..\scGlamLiff-reception\backend\src\middlewares\receiptUpload.js`
7. `..\..\scGlamLiff-reception\backend\src\services\ocr\receiptOcrService.js`
8. `..\..\scGlamLiff-reception\backend\src\services\ocr\pythonOcrClient.js`
9. `backend/services/ocr_python/app/main.py`
10. `backend/services/ocr_python/app/services/receipt_parser.py`

## Path Classification

### Active
- Cross-repo path through `scGlamLiff-reception` backend on `POST /api/ocr/receipt`.

### Legacy
- `VITE_USE_MOCK=true`
- `rawTextOverride`
- Local Node OCR modules under this repo's `backend/` folder

### WIP
- Merchant parsing heuristics
- Receipt parsing quality for more real receipt shapes

### Uncertain
- Deployed production availability of the new OCR route
- Long-term repo ownership of the Python OCR runtime

## Code Changes In This Repo
- Updated `.env.development.local` to point OCR at `http://localhost:5050`.
- Kept Vite proxy on `http://localhost:5050`.
- Kept frontend OCR mapping aligned with the standardized response contract.
- Kept Python OCR output aligned with the backend SSOT contract.

## Backend SSOT Repo Changes In The Same Pass
- Added `POST /api/ocr/receipt` route and upload middleware in `scGlamLiff-reception/backend/src`.
- Added Node OCR service, Python bridge, and receipt parser in `scGlamLiff-reception/backend/src/services/ocr`.
- Mounted the route in `scGlamLiff-reception/backend/src/app.js`.
- Standardized success/error payloads there to match the frontend mapping used in this repo.

## Response Contract Used By Frontend
- `success`
- `rawText`
- `ocrText`
- `parsed`
- `parsed.receiptLine`
- `parsed.receiptLines`
- `parsed.totalAmount`
- `parsed.totalAmountValue`
- `parsed.receiptDate`
- `parsed.receiptTime`
- `parsed.merchant`
- `parsed.merchantName`
- `merchant`
- `receiptDate`
- `totalAmount`
- `receiptLines`
- `errorCode`
- `errorMessage`

## Diagnostics
- Frontend OCR caller logs:
  - `request_started`
  - `response_received`
  - `request_succeeded`
  - `request_failed`
- Backend SSOT route logs:
  - `request_started`
  - `request_succeeded`
  - `request_failed`

## Validation Run
- `npx vitest run src/services/receiptOcrService.test.js`
- `npm run build`
- `python -m compileall backend/services/ocr_python/app/main.py backend/services/ocr_python/app/services/receipt_parser.py`

## Current Blockers
- Real OCR still cannot run in the current local environment until these packages are installed:
  - `fastapi`
  - `paddle`
  - `paddleocr`
  - `python_multipart`
- `cv2` is already available, so OpenCV itself is not the current blocker.

## Markdown Updated In This Pass
- `..\REPO_STATUS_AUDIT.md`
- `OCR_INTEGRATION_STATUS.md`
- `OCR_IMPLEMENTATION_LOG.md`
- `IMPLEMENTATION_LOG_RECEIPT_BOOKING.md`
- `DEV_MOCK_SETUP.md`
- `docs/bill-verification-mock-note.md`
- `backend/services/ocr_python/README.md`
- `..\..\scGlamLiff-reception\REPO_STATUS_AUDIT.md`
- `..\..\scGlamLiff-reception\OCR_INTEGRATION_STATUS.md`
- `..\..\scGlamLiff-reception\backend\IMPLEMENTATION_LOG_RECEIPT_BOOKING.md`

## Remaining Questions
- Should the Python OCR runtime stay in this repo after the backend route is now owned by `scGlamLiff-reception`?
- Should the old local OCR route in this repo be removed later once the cross-repo route is stable?

## Update 2026-03-22T12:26:05.7588466+07:00

### Goal
- Trace the exact OCR error text shown in LIFF back to frontend source.
- Make frontend OCR errors more diagnostic without changing unrelated booking behavior.
- Add a visible frontend build/version marker so deploy freshness can be checked from the LIFF UI itself.

### Code Changes In This Pass
- Updated `src/services/receiptOcrService.js`
  - added request timeout support through `AbortController`
  - added explicit `timeout` error reason
  - kept `route_not_found`, `service_unavailable`, and `network_error` as distinct reasons
- Updated `src/components/NewBillRecipientModal.jsx`
  - confirmed the old route-missing screenshot text was rendered from `getReceiptErrorMessage(...)`
  - replaced OCR error copy so the modal now distinguishes:
    - backend route missing
    - backend reachable but downstream OCR unavailable
    - network/CORS failure
    - timeout
  - added a visible `UI build ...` stamp
- Updated `src/components/NewBillRecipientModal.css`
  - added styling for the visible build stamp
- Updated `src/config/env.js`
  - added `buildVersion`
  - added `buildTimeUtc`
  - added `ocrRequestTimeoutMs`
- Updated `src/main.jsx`
  - logs build info to the browser console during boot
- Updated `.github/workflows/deploy.yml`
  - injects `VITE_BUILD_VERSION`
  - injects `VITE_BUILD_TIME_UTC`

### Validation
- `npx vitest run src/services/receiptOcrService.test.js src/components/NewBillRecipientModal.test.jsx`
- `npm run build`

### Production Check On 2026-03-22
- `GET https://scglamliff-reception.onrender.com/api/ocr/health` reported:
  - OCR route mounted
  - downstream OCR reachable
- `POST https://scglamliff-reception.onrender.com/api/ocr/receipt` without a file returned `OCR_IMAGE_REQUIRED`
- `https://akcd1998.github.io/ScGlamLiFF/` currently serves `assets/index-fnUR061P.js`
- That deployed frontend bundle still lacks the new build stamp from this pass.

### Conclusion
- The older LIFF screenshot text was real and came from current source before this patch.
- After the backend production route recovered, the older route-missing screenshot became more consistent with stale frontend deployment or device cache than with the current backend runtime alone.
