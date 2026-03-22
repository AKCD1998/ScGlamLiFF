// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

const createMockResponse = ({ ok, status, body }) => ({
  ok,
  status,
  text: vi.fn().mockResolvedValue(body)
});

const createTestFile = () =>
  new File(["fake-image"], "receipt.jpg", {
    type: "image/jpeg"
  });

const loadReceiptOcrService = async ({
  useMock = false,
  debugEnabled = false,
  isDev = false,
  apiBaseUrl = "https://backend.example.com",
  ocrApiBaseUrl = ""
} = {}) => {
  vi.resetModules();
  vi.doMock("../config/env", () => ({
    useMock,
    debugEnabled,
    isDev,
    apiBaseUrl,
    ocrApiBaseUrl
  }));

  return import("./receiptOcrService");
};

describe("receiptOcrService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    delete global.fetch;
  });

  it("returns explicit mock OCR data in mock mode without calling backend", async () => {
    global.fetch = vi.fn();
    const { processReceiptImage } = await loadReceiptOcrService({
      useMock: true
    });

    const result = await processReceiptImage(createTestFile());

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.source).toBe("mock");
    expect(result.statusNote).toContain("โหมด mock");
  });

  it("calls the OCR endpoint with a dedicated OCR base URL when configured", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      createMockResponse({
        ok: true,
        status: 200,
        body: JSON.stringify({
          success: true,
          code: "OCR_OK",
          message: "Receipt OCR completed",
          ocrStatus: "success",
          mode: "python-paddleocr",
          ocrText: "12/03/2026 10:00 BNO:RCP-001\nSC GLAM CLINIC\nTOTAL 399.00",
          receiptLines: [
            "12/03/2026 10:00 BNO:RCP-001",
            "SC GLAM CLINIC",
            "TOTAL 399.00"
          ],
          totalAmountTHB: 399,
          merchant: "SC GLAM CLINIC",
          errorCode: "",
          errorMessage: "",
          parsed: {
            receiptLine: "12/03/2026 10:00 BNO:RCP-001",
            totalAmount: "399.00 THB",
            totalAmountValue: 399,
            receiptDate: "2026-03-12",
            receiptTime: "10:00",
            merchant: "SC GLAM CLINIC",
            merchantName: "SC GLAM CLINIC"
          },
          ocrMetadata: {
            engine: "paddleocr"
          }
        })
      })
    );

    const { processReceiptImage } = await loadReceiptOcrService({
      useMock: false,
      apiBaseUrl: "https://backend.example.com",
      ocrApiBaseUrl: "http://localhost:5050"
    });

    const result = await processReceiptImage(createTestFile());

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toBe("http://localhost:5050/api/ocr/receipt");
    expect(global.fetch.mock.calls[0][1]).toMatchObject({
      method: "POST",
      credentials: "include"
    });
    expect(global.fetch.mock.calls[0][1].body).toBeInstanceOf(FormData);
    expect(result.source).toBe("api");
    expect(result.receiptLine).toContain("BNO");
    expect(result.receiptLines).toHaveLength(3);
    expect(result.totalAmountValue).toBe(399);
    expect(result.receiptDate).toBe("2026-03-12");
    expect(result.merchant).toBe("SC GLAM CLINIC");
  });

  it("marks legacy backend mock results as mock so they are not treated as real OCR evidence", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      createMockResponse({
        ok: true,
        status: 200,
        body: JSON.stringify({
          success: true,
          code: "OCR_LEGACY_MOCK_RESULT",
          message: "Legacy mock OCR result returned",
          ocrStatus: "mock",
          mode: "mock-fallback",
          rawText: "17/03/2026 08:36 BNO:S2603004002-0006510\n324 00",
          parsed: {
            receiptLine: "17/03/2026 08:36 BNO:S2603004002-0006510",
            totalAmount: "324.00 THB",
            totalAmountValue: 324
          }
        })
      })
    );

    const { processReceiptImage } = await loadReceiptOcrService({
      useMock: false
    });

    const result = await processReceiptImage(createTestFile());

    expect(result.source).toBe("mock");
    expect(result.statusNote).toContain("Legacy mock OCR");
  });

  it("throws a generic route-not-found failure when backend does not expose the OCR endpoint", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      createMockResponse({
        ok: false,
        status: 404,
        body: JSON.stringify({
          success: false,
          errorCode: "OCR_ROUTE_NOT_FOUND",
          errorMessage: "Not found"
        })
      })
    );

    const { processReceiptImage, ReceiptOcrApiError } = await loadReceiptOcrService({
      useMock: false
    });

    await expect(processReceiptImage(createTestFile())).rejects.toMatchObject({
      name: "ReceiptOcrApiError",
      reason: "route_not_found",
      status: 404
    });

    await expect(processReceiptImage(createTestFile())).rejects.toBeInstanceOf(
      ReceiptOcrApiError
    );
  });

  it("throws when the OCR response shape does not contain usable OCR data", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      createMockResponse({
        ok: true,
        status: 200,
        body: JSON.stringify({
          success: true,
          code: "OCR_OK"
        })
      })
    );

    const { processReceiptImage } = await loadReceiptOcrService({
      useMock: false
    });

    await expect(processReceiptImage(createTestFile())).rejects.toMatchObject({
      reason: "malformed_response"
    });
  });
});
