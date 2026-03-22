# Python OCR Service

## Purpose
- This folder contains the active Python OCR runtime used by the Bill Verification flow.
- The Python runtime still lives in `scGlamLiFFF`.
- The active public Node OCR route now lives in the sibling backend repo `scGlamLiff-reception`.

## Current Active Call Pattern
1. Frontend upload in `scGlamLiFFF/scGlamLiFF/src/components/NewBillRecipientModal.jsx`
2. Frontend OCR caller in `scGlamLiFFF/scGlamLiFF/src/services/receiptOcrService.js`
3. Backend SSOT route:
   - `scGlamLiff-reception/backend/src/routes/ocr.js`
   - `POST /api/ocr/receipt`
4. Backend Python bridge:
   - `scGlamLiff-reception/backend/src/services/ocr/pythonOcrClient.js`
5. Python endpoint in this repo:
   - `POST /ocr/receipt`

## Request Contract
- method: `POST`
- path: `/ocr/receipt`
- content type: `multipart/form-data`
- file field: `receipt`

## Response Contract

### Success
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

### Error
```json
{
  "success": false,
  "code": "OCR_INVALID_FILE_TYPE",
  "message": "receipt must be an image file",
  "errorCode": "OCR_INVALID_FILE_TYPE",
  "errorMessage": "receipt must be an image file",
  "ocrStatus": "error",
  "mode": "python-paddleocr",
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
    "code": "OCR_INVALID_FILE_TYPE",
    "message": "receipt must be an image file"
  }
}
```

## Runtime
```powershell
cd scGlamLiFF/backend/services/ocr_python
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

## Current Runtime Status In This Audit
- The service code is wired and callable from the backend SSOT repo.
- Real local OCR is still blocked until missing Python packages are installed.
- Confirmed missing in the current environment:
  - `fastapi`
  - `paddle`
  - `paddleocr`
  - `python_multipart`
- Confirmed available in the current environment:
  - `cv2`

## Notes
- The first OCR request will download PaddleOCR model files.
- The current parser is tuned for the target pharmacy receipt layout and still needs more real samples.
- Older Node OCR modules in `scGlamLiFFF/scGlamLiFF/backend` should now be treated as legacy/WIP, not as the active public route.
