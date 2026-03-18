from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from .services.paddle_ocr_service import extract_receipt_text
from .services.preprocess_service import preprocess_receipt_image
from .services.receipt_parser import parse_receipt_text

app = FastAPI(
    title="scGlam Receipt OCR Service",
    description="Receipt OCR service using OpenCV preprocessing + PaddleOCR.",
    version="0.1.0",
)


@app.get("/health")
async def health_check():
    return {"ok": True, "service": "ocr-python", "mode": "python-paddleocr"}


@app.post("/ocr/receipt")
async def ocr_receipt(receipt: UploadFile = File(...)):
    if not receipt.content_type or not receipt.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="receipt must be an image file")

    image_bytes = await receipt.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="receipt image is empty")

    try:
        preprocessed_image = preprocess_receipt_image(
            image_bytes,
            filename=receipt.filename or "",
            content_type=receipt.content_type,
        )
        ocr_result = extract_receipt_text(
            preprocessed_image,
            filename=receipt.filename or "",
            content_type=receipt.content_type,
        )
        raw_text = ocr_result.get("rawText", "")
        parsed = parse_receipt_text(raw_text, ocr_lines=ocr_result.get("lines"))
        ocr_status = "success" if parsed.get("receiptLine") and parsed.get("totalAmount") else "partial"

        return {
            "success": True,
            "ocrStatus": ocr_status,
            "mode": ocr_result.get("mode", "python-paddleocr"),
            "rawText": raw_text,
            "parsed": parsed,
            "meta": ocr_result.get("meta", {}),
        }
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:  # pragma: no cover - depends on OCR runtime
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "ocrStatus": "error",
                "mode": "python-paddleocr",
                "rawText": "",
                "parsed": {
                    "receiptLine": "",
                    "totalAmount": "",
                },
                "error": str(error),
            },
        )
