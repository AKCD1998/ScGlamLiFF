# Repo Status Audit

## Audit Time
- `2026-03-22T10:14:06.9072045+07:00`

## Scope
- Frontend / LIFF repo: `C:\Users\scgro\Desktop\Webapp training project\scGlamLiFFF`
- Backend / PostgreSQL SSOT repo checked in the same pass: `C:\Users\scgro\Desktop\Webapp training project\scGlamLiff-reception`

## Files Read
- `scGlamLiFF/OCR_INTEGRATION_STATUS.md`
- `scGlamLiFF/OCR_IMPLEMENTATION_LOG.md`
- `scGlamLiFF/IMPLEMENTATION_LOG_RECEIPT_BOOKING.md`
- `scGlamLiFF/DEV_MOCK_SETUP.md`
- `scGlamLiFF/docs/bill-verification-mock-note.md`
- `scGlamLiFF/backend/services/ocr_python/README.md`
- `scGlamLiFF/src/components/NewBillRecipientModal.jsx`
- `scGlamLiFF/src/services/receiptOcrService.js`
- `scGlamLiFF/vite.config.js`
- `scGlamLiFF/.env.development.local`
- `scGlamLiff-reception/backend/src/app.js`
- `scGlamLiff-reception/backend/src/routes/ocr.js`
- `scGlamLiff-reception/backend/src/controllers/ocrController.js`
- `scGlamLiff-reception/backend/src/middlewares/receiptUpload.js`
- `scGlamLiff-reception/backend/src/services/ocr/receiptOcrService.js`
- `scGlamLiff-reception/backend/src/services/ocr/pythonOcrClient.js`
- `scGlamLiff-reception/backend/src/services/ocr/receiptParser.js`
- `scGlamLiff-reception/backend/API_CONTRACT.md`
- `scGlamLiff-reception/backend/API_CHANGELOG_NOTES.md`
- `scGlamLiff-reception/backend/IMPLEMENTATION_LOG_RECEIPT_BOOKING.md`

## Summary
- Active Bill Verification OCR path is now cross-repo, not single-repo.
- Upload UI and OCR caller stay in `scGlamLiFFF/scGlamLiFF`.
- Active Node OCR route is now `scGlamLiff-reception/backend/src/routes/ocr.js` on `POST /api/ocr/receipt`.
- Python OCR service entrypoint still lives in `scGlamLiFFF/scGlamLiFF/backend/services/ocr_python/app/main.py`.
- Local dev OCR routing is now explicitly pointed at the backend SSOT repo through `VITE_OCR_API_BASE_URL=http://localhost:5050`.

## Blockers
- Real OCR still cannot run in the current local Python environment until required packages are installed.
- Missing imports confirmed in this environment:
  - `fastapi`
  - `paddle`
  - `paddleocr`
  - `python_multipart`
- Production deployment status of the new OCR route on `https://scglamliff-reception.onrender.com` is still unverified in this audit pass.

## Next Actions
1. Run `scGlamLiff-reception/backend` on port `5050`.
2. Run `scGlamLiFFF/scGlamLiFF/backend/services/ocr_python` on port `8001`.
3. Manual-test Bill Verification upload from the LIFF/frontend repo.
4. If production should use this route immediately, deploy the backend SSOT repo and verify `POST /api/ocr/receipt` remotely.
5. Decide whether the old local Node OCR route in `scGlamLiFFF/scGlamLiFF/backend` should remain as legacy tooling or be removed later.

## Open Questions
- Should the Python OCR service stay inside `scGlamLiFFF`, or be moved into `scGlamLiff-reception` later so backend ownership is less split?
- Should the legacy OCR route/modules in `scGlamLiFFF/scGlamLiFF/backend` be deleted after the cross-repo path is stable?
- Does the deployed Render backend already include the new OCR route, or is this still local-only until the next deployment?

## Update 2026-03-22T12:26:05.7588466+07:00

### Files Read
- `scGlamLiFF/src/services/receiptOcrService.js`
- `scGlamLiFF/src/services/receiptOcrService.test.js`
- `scGlamLiFF/src/components/NewBillRecipientModal.jsx`
- `scGlamLiFF/src/components/NewBillRecipientModal.css`
- `scGlamLiFF/src/components/NewBillRecipientModal.test.jsx`
- `scGlamLiFF/src/config/env.js`
- `scGlamLiFF/src/main.jsx`
- `.github/workflows/deploy.yml`

### Summary
- The exact route-missing OCR message from the older LIFF screenshot was still present in frontend source before this pass.
- Frontend OCR errors are now split more clearly into:
  - missing backend OCR route
  - downstream OCR unavailable
  - network failure
  - request timeout
- A visible frontend build stamp now renders in the Bill Verification modal, and the same build info is logged to the browser console at boot.
- GitHub Actions now injects `VITE_BUILD_VERSION` and `VITE_BUILD_TIME_UTC` into production builds so the deployed LIFF UI can prove which bundle is actually live.

### Production Observations
- Verified on `2026-03-22`:
  - `GET https://scglamliff-reception.onrender.com/api/ocr/health` returned `routeMounted=true` and `downstream.reachable=true`.
  - `POST https://scglamliff-reception.onrender.com/api/ocr/receipt` without a file returned `OCR_IMAGE_REQUIRED`, which confirms the route is mounted in production.
- Verified on `2026-03-22`:
  - `https://akcd1998.github.io/ScGlamLiFF/` currently serves `assets/index-fnUR061P.js`.
  - That deployed bundle still contains the old OCR route-missing string and does not yet include the new build stamp added in this pass.

### Next Actions
1. Deploy the updated frontend repo so the LIFF UI shows the new build stamp.
2. Re-open the LIFF app on mobile and compare the on-screen build stamp against the latest deployment.
3. If the old route-missing text still appears after the new build stamp is visible, inspect device cache or LINE in-app webview cache behavior next.

## Update 2026-03-22T12:41:44.6473621+07:00

### Summary
- The fresh frontend build is now visible in LIFF via the `UI build ...` stamp, so the latest screenshot is no longer explained by stale frontend cache alone.
- Cross-repo production checks show:
  - `scglamliff-reception.onrender.com/api/ocr/receipt` is mounted and reachable
  - `scglamliff-reception.onrender.com/api/auth/login` is mounted and returns a cross-site cookie
  - downstream OCR service configured in Render currently reports healthy at `/health`
  - but the same downstream host returns `Cannot POST /ocr/receipt`
- Result:
  - the main backend route is present
  - the downstream OCR service route is missing or the configured `OCR_SERVICE_BASE_URL` points at the wrong Render service/version
- Frontend had a second issue:
  - it treated any HTTP `404` as `route_not_found`
  - that made an upstream OCR-service `404` look like the main backend OCR route was missing

### Files Read
- `scGlamLiFF/src/services/receiptOcrService.js`
- `scGlamLiFF/src/services/branchDeviceStaffAuthService.js`
- `scGlamLiFF/src/context/BranchDeviceContext.jsx`
- `scGlamLiFF/src/utils/apiBase.js`
- `..\scGlamLiff-reception\backend\src\app.js`
- `..\scGlamLiff-reception\backend\src\routes\ocr.js`
- `..\scGlamLiff-reception\backend\src\controllers\authController.js`
- `..\scGlamLiff-reception\backend\src\services\ocr\pythonOcrClient.js`
- `..\scGlamLiff-reception\backend\src\services\ocr\receiptOcrService.js`
- `..\scGlamLiff-reception\backend\README-backend.md`

### Next Actions
1. Redeploy the frontend so the new OCR 404 classification fix reaches LIFF users.
2. Check Render env for `OCR_SERVICE_BASE_URL` and confirm it points at the Python OCR deployment that actually serves `POST /ocr/receipt`.
3. If `OCR_SERVICE_BASE_URL` is already correct, redeploy the Python OCR Render service because its live runtime does not match the repo code.
4. Keep investigating LIFF staff login separately as a cross-site cookie persistence problem, not as a missing auth route.

## Update 2026-03-22T20:57:00+07:00

### Summary
- Used local mock mode briefly to verify the LIFF UI in a normal browser, then restored `.env.development.local` to production-facing values.
- Cleaned up the normal receipt preview state by removing the visible confirmation heading/helper while preserving accessibility labeling.
- Added responsive CSS adjustments for receipt upload/preview panels across several device classes where the modal layout was visually cramped.

### Files Updated
- `scGlamLiFF/.env.development.local`
- `scGlamLiFF/src/components/NewBillRecipientModal.jsx`
- `scGlamLiFF/src/components/NewBillRecipientModal.css`
- `scGlamLiFF/IMPLEMENTATION_LOG_RECEIPT_BOOKING.md`

### Notes
- These frontend changes were layout/testing focused only.
- No LIFF-side OCR execution was reintroduced in this pass.

## Update 2026-03-23T16:35:00+07:00

### Summary
- The LIFF receipt modal is now wired for the temporary promo-only booking option channel instead of the general booking catalog.
- Frontend receipt upload handling now accepts upload-only backend responses and treats them as attachment success rather than expecting immediate OCR extraction.
- Promo booking metadata is now passed through draft/create payloads via `booking_channel`.

### Files Updated
- `scGlamLiFF/src/config/liffReceiptPromoCampaign.js`
- `scGlamLiFF/src/services/appointmentsService.js`
- `scGlamLiFF/src/services/appointmentContract.js`
- `scGlamLiFF/src/services/receiptOcrService.js`
- `scGlamLiFF/src/components/NewBillRecipientModal.jsx`
- `scGlamLiFF/IMPLEMENTATION_LOG_RECEIPT_BOOKING.md`

### Validation
- `npm test -- src/services/appointmentContract.test.js src/components/NewBillRecipientModal.test.jsx`
  - passed

## Update 2026-03-23T16:50:00+07:00

### Deployment / QA Checklist
- Deploy order:
  1. migrate promo treatment in `scGlamLiff-reception/backend`
  2. deploy backend
  3. verify promo booking-options endpoint
  4. deploy frontend
  5. run mobile LIFF smoke test
- Frontend smoke test:
  - LIFF should show only the temporary promo option
  - receipt upload should complete without expecting OCR extraction
  - draft save should still work when date/time are incomplete
  - final submit should still succeed through the existing appointment flow
- Rollback:
  - frontend rollback first if the issue is presentation-only
  - backend rollback if promo selection or submit path fails
