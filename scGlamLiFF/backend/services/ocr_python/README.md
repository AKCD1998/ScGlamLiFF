# Python OCR Service Scaffold

This folder contains a separate Python OCR service scaffold for future receipt OCR.

Purpose:
- receive receipt image uploads from the Node backend
- optionally preprocess images with OpenCV
- run OCR with PaddleOCR
- parse receipt text into structured fields for the Node backend

Current status:
- first real OCR pass is wired
- image preprocessing uses OpenCV before OCR
- text extraction uses PaddleOCR
- receipt parsing is tuned for the current pharmacy receipt layout and still needs more tuning with additional real samples

Expected call pattern:
- method: `POST`
- path: `/ocr/receipt`
- content type: `multipart/form-data`
- file field: `receipt`

Planned response shape:

```json
{
  "success": true,
  "ocrStatus": "success",
  "mode": "scaffold",
  "rawText": "17/03/2026 08:36 BNO:S2603004002-0006510\nTotal 1.00 Items\n324 00",
  "parsed": {
    "receiptLine": "17/03/2026 08:36 BNO:S2603004002-0006510",
    "totalAmount": "324.00"
  }
}
```

Run locally later:

```bash
python -m venv C:\ocrvenv
C:\ocrvenv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Notes:
- the first OCR request will download PaddleOCR model files
- on Windows, a short-path virtual environment helps avoid long-path issues during installation
- set `PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True` if you want to skip the model host connectivity check
- multiple OCR variants are tried, including cropped receipt variants when a paper-like region is detected

Later TODOs:
- refine the OpenCV preprocessing in `app/services/preprocess_service.py`
- tune PaddleOCR model choices and runtime options in `app/services/paddle_ocr_service.py`
- refine receipt parsing in `app/services/receipt_parser.py` against more pharmacy receipt photos
- have the Node backend call this service through its OCR client layer
