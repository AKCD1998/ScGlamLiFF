# Dev Mock Setup

## Purpose
- Mock mode still exists so the LIFF frontend can run in a normal desktop browser.
- OCR is no longer assumed to be served by this repo's local Node backend.
- Active local OCR backend for Bill Verification is now `scGlamLiff-reception/backend` on port `5050`.

## Active Local OCR Topology
1. Frontend in `scGlamLiFFF/scGlamLiFF`
2. Backend SSOT in `scGlamLiff-reception/backend`
3. Python OCR runtime in `scGlamLiFFF/scGlamLiFF/backend/services/ocr_python`

## Local Workflow

### 1. Start backend SSOT
```powershell
cd ..\..\scGlamLiff-reception\backend
npm run dev
```

Expected local backend:
- `http://localhost:5050`
- route: `POST /api/ocr/receipt`

### 2. Start Python OCR service
```powershell
cd ..\scGlamLiFF\backend\services\ocr_python
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

### 3. Start frontend
```powershell
cd ..\scGlamLiFF
npm run dev
```

## Frontend Env Behavior

### Tracked development config
`scGlamLiFF/.env.development.local` now contains:

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=https://scglamliff-reception.onrender.com
VITE_OCR_API_BASE_URL=http://localhost:5050
```

Meaning:
- normal API calls can still target the configured main API base
- OCR calls are forced to the local backend SSOT repo on `5050`

Production note:
- backend-hosted `/liff/` builds should leave `VITE_API_BASE_URL` and `VITE_OCR_API_BASE_URL` blank so requests stay same-origin under `/api/...`

### Relative proxy mode
If you remove `VITE_OCR_API_BASE_URL`, Vite can still proxy relative `/api` requests to `http://localhost:5050` through `vite.config.js`.

## Mock Mode

### What `VITE_USE_MOCK=true` does
- bypasses real LIFF initialization
- returns mock OCR result in the frontend service
- does not exercise the backend OCR route

### What it does not do
- it does not verify the real OCR backend
- it does not prove that `POST /api/ocr/receipt` works

## Legacy / Inactive OCR Path In This Repo
- Older local backend OCR modules still exist under `scGlamLiFF/backend`.
- They are not the active Bill Verification OCR route now.
- Treat them as legacy/WIP unless explicitly reactivated later.

## OCR Backend Expectations
- Backend route: `scGlamLiff-reception/backend/src/routes/ocr.js`
- Python OCR endpoint: `http://127.0.0.1:8001/ocr/receipt`
- Required backend env behavior:

```env
OCR_SERVICE_ENABLED=true
OCR_SERVICE_FALLBACK_TO_MOCK=false
OCR_SERVICE_BASE_URL=http://127.0.0.1:8001
```

## Current Local Blocker
- Real OCR still cannot run until Python dependencies from `backend/services/ocr_python/requirements.txt` are installed.
- Confirmed missing packages in the current environment:
  - `fastapi`
  - `paddle`
  - `paddleocr`
  - `python_multipart`

## Manual Verification
1. Start the backend SSOT repo on `5050`.
2. Start the Python OCR service on `8001`.
3. Start the frontend.
4. Open Bill Verification and upload a receipt.
5. Confirm Network shows `POST /api/ocr/receipt` hitting `localhost:5050`.
6. Stop the Python OCR service and retry once.
7. Confirm the UI shows a structured OCR error instead of a fake success.
