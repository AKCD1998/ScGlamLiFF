# OCR Integration Status

## Updated At
- `2026-03-22T10:14:06.9072045+07:00`

## Scope
- This file tracks the active Bill Verification OCR path as it exists today across both repos.
- Frontend / LIFF repo:
  - `C:\Users\scgro\Desktop\Webapp training project\scGlamLiFFF`
- Backend / PostgreSQL source-of-truth repo:
  - `C:\Users\scgro\Desktop\Webapp training project\scGlamLiff-reception`

## Active OCR Path
1. Upload UI in `src/components/NewBillRecipientModal.jsx`
2. Frontend OCR caller in `src/services/receiptOcrService.js`
3. Frontend OCR config in:
   - `.env.development.local`
   - `vite.config.js`
   - `src/config/env.js`
   - `src/utils/apiBase.js`
4. Backend route in `..\..\scGlamLiff-reception\backend\src\routes\ocr.js`
5. Backend controller/upload/service chain in:
   - `..\..\scGlamLiff-reception\backend\src\controllers\ocrController.js`
   - `..\..\scGlamLiff-reception\backend\src\middlewares\receiptUpload.js`
   - `..\..\scGlamLiff-reception\backend\src\services\ocr\receiptOcrService.js`
   - `..\..\scGlamLiff-reception\backend\src\services\ocr\pythonOcrClient.js`
6. Python OCR service in this repo:
   - `backend/services/ocr_python/app/main.py`
   - `backend/services/ocr_python/app/services/receipt_parser.py`

## Path Classification

### Active
- `NewBillRecipientModal.jsx` -> `receiptOcrService.js` -> `POST /api/ocr/receipt` on `scGlamLiff-reception` -> Python OCR service at `http://127.0.0.1:8001/ocr/receipt`.
- Local development routing for this path is now:
  - `VITE_OCR_API_BASE_URL=http://localhost:5050`
  - or relative `/api` through Vite proxy to `http://localhost:5050`

### Legacy
- Frontend mock mode with `VITE_USE_MOCK=true`
- Backend mock override through `rawTextOverride`
- Legacy/local Node OCR modules inside this repo under:
  - `backend/routes/ocr.routes.js`
  - `backend/controllers/ocr.controller.js`
  - `backend/services/ocr/receipt-ocr.service.js`
  - `backend/services/ocr/python-ocr-client.service.js`
- These older local backend modules are no longer the active Bill Verification route.

### WIP
- Merchant extraction remains heuristic.
- Receipt parsing is still tuned mainly for the current pharmacy receipt layout and needs more real samples.

### Uncertain
- Production deployment status of the new OCR route on `https://scglamliff-reception.onrender.com` is not verified in this pass.
- Long-term ownership of the Python OCR service is still split across repos.

## Routing / Config Status
- `.env.development.local` now sets `VITE_OCR_API_BASE_URL=http://localhost:5050`.
- `vite.config.js` proxies relative `/api` calls to `http://localhost:5050`.
- `src/services/receiptOcrService.js` still supports a dedicated OCR base so OCR can go to the backend SSOT even if the rest of the frontend uses another API base.
- `.env.production` still uses `VITE_API_BASE_URL=https://scglamliff-reception.onrender.com`.
- Result:
  - local dev OCR points at the backend SSOT repo on port `5050`
  - production OCR is expected to use the deployed backend SSOT host

## Standardized OCR Response Contract

### Success shape
```json
{
  "success": true,
  "code": "OCR_OK",
  "message": "Receipt OCR completed",
  "errorCode": "",
  "errorMessage": "",
  "ocrStatus": "success",
  "mode": "python-paddleocr",
  "rawText": "17/03/2026 08:36 BNO:S2603004002-0006510\nTotal 1.00 Items\n324 00",
  "ocrText": "17/03/2026 08:36 BNO:S2603004002-0006510\nTotal 1.00 Items\n324 00",
  "parsed": {
    "receiptLine": "17/03/2026 08:36 BNO:S2603004002-0006510",
    "receiptLines": [
      "17/03/2026 08:36 BNO:S2603004002-0006510",
      "Total 1.00 Items",
      "324 00"
    ],
    "totalAmount": "324.00 THB",
    "totalAmountValue": 324,
    "receiptDate": "2026-03-17",
    "receiptTime": "08:36",
    "merchant": "",
    "merchantName": ""
  },
  "receiptLine": "17/03/2026 08:36 BNO:S2603004002-0006510",
  "receiptLines": [
    "17/03/2026 08:36 BNO:S2603004002-0006510",
    "Total 1.00 Items",
    "324 00"
  ],
  "totalAmount": "324.00 THB",
  "totalAmountTHB": 324,
  "receiptDate": "2026-03-17",
  "receiptTime": "08:36",
  "merchant": "",
  "merchantName": "",
  "ocrMetadata": {}
}
```

### Error shape
```json
{
  "success": false,
  "code": "OCR_SERVICE_UNAVAILABLE",
  "message": "OCR service request failed",
  "errorCode": "OCR_SERVICE_UNAVAILABLE",
  "errorMessage": "OCR service request failed",
  "ocrStatus": "error",
  "mode": "node-receipt-ocr",
  "rawText": "",
  "ocrText": "",
  "parsed": {
    "receiptLine": "",
    "receiptLines": [],
    "totalAmount": "",
    "totalAmountValue": null,
    "receiptDate": "",
    "receiptTime": "",
    "merchant": "",
    "merchantName": ""
  },
  "receiptLine": "",
  "receiptLines": [],
  "totalAmount": "",
  "totalAmountTHB": null,
  "receiptDate": "",
  "receiptTime": "",
  "merchant": "",
  "merchantName": "",
  "ocrMetadata": {},
  "error": {
    "code": "OCR_SERVICE_UNAVAILABLE",
    "message": "OCR service request failed"
  }
}
```

## Bill Verification UI Handoff
- OCR result is stored in modal state `receiptOcrResult`.
- `processReceiptImage(...)` throws a structured error when the OCR request fails.
- The modal renders:
  - receipt line
  - amount
  - merchant only when present
  - receipt date/time only when present
- Frontend fallbacks still keep the modal usable when some parsed fields are missing:
  - missing `receiptLine` becomes `ไม่พบเลขที่ใบเสร็จ`
  - missing amount becomes `ไม่พบราคาสินค้า` unless a numeric amount can still be formatted
- Manual editing of the rest of the booking form still works because OCR result is additive state, not the only source for customer/booking fields.

## Runtime Requirements
- Node backend:
  - `..\..\scGlamLiff-reception\backend`
- Python OCR service:
  - `backend/services/ocr_python`
- Confirmed missing Python packages in the current environment:
  - `fastapi`
  - `paddle`
  - `paddleocr`
  - `python_multipart`
- Confirmed available in the current environment:
  - `cv2`

## Manual Run Steps
1. Start backend SSOT repo:

   ```powershell
   cd ..\..\scGlamLiff-reception\backend
   npm run dev
   ```

2. Start Python OCR service from this repo:

   ```powershell
   cd ..\scGlamLiFF\backend\services\ocr_python
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8001
   ```

3. Start frontend:

   ```powershell
   cd ..\scGlamLiFF
   npm run dev
   ```

## Manual Test Steps
1. Open Bill Verification.
2. Open the `ผู้รับสิทธิ์ใหม่` modal.
3. Upload a receipt image.
4. Confirm frontend sends `POST /api/ocr/receipt` to `http://localhost:5050` in local development.
5. Confirm success response contains:
   - `success`
   - `rawText` or `ocrText`
   - `parsed`
   - `merchant`
   - `receiptDate`
   - `totalAmount`
   - `receiptLines`
6. Confirm modal keeps the booking form usable after OCR.
7. Stop the Python OCR service and retry once.
8. Confirm frontend shows the OCR error path instead of pretending the upload succeeded.

## Validation Completed
- `npx vitest run src/services/receiptOcrService.test.js`
- `npm run build`
- `python -m compileall backend/services/ocr_python/app/main.py backend/services/ocr_python/app/services/receipt_parser.py`

## Remaining Gaps
- Real OCR is still blocked locally until Python dependencies are installed.
- The active public backend OCR route is now in `scGlamLiff-reception`, but deployed production status is still uncertain.
- Legacy OCR modules still exist in this repo and should not be mistaken for the active route.

## Update 2026-03-22T12:26:05.7588466+07:00

### Frontend OCR Error Mapping
- `src/services/receiptOcrService.js` now distinguishes:
  - `route_not_found`
  - `service_unavailable`
  - `network_error`
  - `timeout`
- `src/components/NewBillRecipientModal.jsx` now renders separate Thai copy for each of those frontend OCR failure reasons.

### Frontend Build Visibility
- `src/config/env.js` now exposes:
  - `VITE_BUILD_VERSION`
  - `VITE_BUILD_TIME_UTC`
  - `VITE_OCR_REQUEST_TIMEOUT_MS`
- `src/main.jsx` logs build info to the browser console under `[scGlamLiFF] frontend_build`.
- `src/components/NewBillRecipientModal.jsx` now renders a visible `UI build ...` stamp inside the modal so the LIFF screen itself can confirm the deployed frontend bundle.
- `.github/workflows/deploy.yml` now injects `VITE_BUILD_VERSION` and `VITE_BUILD_TIME_UTC` during the GitHub Pages build.

### Production Verification On 2026-03-22
- `GET https://scglamliff-reception.onrender.com/api/ocr/health`
  - returned `routeMounted=true`
  - returned `downstream.reachable=true`
  - reported `ocrServiceBaseUrl=https://scglamliff.onrender.com`
- `POST https://scglamliff-reception.onrender.com/api/ocr/receipt` without a file returned `OCR_IMAGE_REQUIRED`
- Result:
  - the production backend OCR route is mounted now
  - the older frontend route-missing screenshot does not match the current backend runtime state by itself

### Deployed Frontend Observation On 2026-03-22
- `https://akcd1998.github.io/ScGlamLiFF/` currently serves `assets/index-fnUR061P.js`.
- That deployed bundle still contains the older OCR route-missing text and the older service-unavailable text.
- That deployed bundle does not yet contain the new build stamp added in this pass.
- Practical conclusion:
  - if a device still shows the older OCR route-missing message after backend production was fixed, stale frontend deployment or frontend cache is plausible
  - the new build stamp is the intended verification point for the next deploy

## Update 2026-03-22T12:41:44.6473621+07:00

### New Production Finding
- Fresh LIFF screenshot now shows the visible build stamp, so current frontend code is on screen.
- Production backend checks confirm:
  - `POST https://scglamliff-reception.onrender.com/api/ocr/receipt` exists
  - `GET https://scglamliff-reception.onrender.com/api/ocr/health` reports the backend OCR route mounted
  - backend Render env currently exposes `ocrServiceBaseUrl=https://scglamliff.onrender.com`
- But direct production check also confirms:
  - `POST https://scglamliff.onrender.com/ocr/receipt` returns `404 Cannot POST /ocr/receipt`
  - `GET https://scglamliff.onrender.com/health` still returns `200`
- Conclusion:
  - the downstream Python OCR host on Render is alive
  - but the live downstream app does not expose the expected receipt route
  - this can happen because `OCR_SERVICE_BASE_URL` points at the wrong service or because that Render service is deployed with older code

### Frontend Classification Fix
- `src/services/receiptOcrService.js` no longer treats every `404` as `route_not_found`.
- Frontend now classifies payloads with:
  - `OCR_SERVICE_UNAVAILABLE`
  - `OCR_SERVICE_DISABLED`
  - `OCR_DOWNSTREAM_ROUTE_NOT_FOUND`
  as `service_unavailable`, even if the HTTP status is `404`.
- This avoids showing a misleading “backend route missing” error when the real failure is downstream.
