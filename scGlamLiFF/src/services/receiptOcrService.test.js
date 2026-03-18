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
  apiBaseUrl = "https://backend.example.com"
} = {}) => {
  vi.resetModules();
  vi.doMock("../config/env", () => ({
    useMock,
    debugEnabled,
    isDev,
    apiBaseUrl
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

  it("calls the real OCR endpoint with multipart form data in real mode", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      createMockResponse({
        ok: true,
        status: 200,
        body: JSON.stringify({
          rawText: "12/03/2026 10:00 BNO RCP-001\nTOTAL 399.00",
          receipt_line: "12/03/2026 10:00 BNO RCP-001",
          total_amount_thb: 399
        })
      })
    );

    const { processReceiptImage } = await loadReceiptOcrService({
      useMock: false
    });

    const result = await processReceiptImage(createTestFile());

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toBe(
      "https://backend.example.com/api/ocr/receipt"
    );
    expect(global.fetch.mock.calls[0][1]).toMatchObject({
      method: "POST",
      credentials: "include"
    });
    expect(global.fetch.mock.calls[0][1].body).toBeInstanceOf(FormData);
    expect(result.source).toBe("api");
    expect(result.receiptLine).toContain("BNO");
    expect(result.totalAmountValue).toBe(399);
  });

  it("throws a hard failure when backend does not expose the OCR endpoint", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      createMockResponse({
        ok: false,
        status: 404,
        body: JSON.stringify({
          ok: false,
          error: "Not found"
        })
      })
    );

    const { processReceiptImage, ReceiptOcrApiError } = await loadReceiptOcrService({
      useMock: false
    });

    await expect(processReceiptImage(createTestFile())).rejects.toMatchObject({
      name: "ReceiptOcrApiError",
      reason: "missing_backend_endpoint",
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
          ok: true
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

