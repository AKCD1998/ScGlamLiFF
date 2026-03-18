import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AppointmentDraftApiError,
  listAppointmentDrafts
} from "./appointmentDraftService";

const createResponse = ({ ok, status, payload }) => ({
  ok,
  status,
  text: vi.fn().mockResolvedValue(
    payload === undefined ? "" : JSON.stringify(payload)
  )
});

const parseRequestUrl = (value) => new URL(value, "https://example.test");

describe("appointmentDraftService", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns draft rows from the canonical draft list endpoint when available", async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        ok: true,
        status: 200,
        payload: {
          drafts: [{ id: "draft-uuid" }]
        }
      })
    );

    const rows = await listAppointmentDrafts();
    const [url, options] = fetchMock.mock.calls[0];
    const requestUrl = parseRequestUrl(url);

    expect(rows).toEqual([{ id: "draft-uuid" }]);
    expect(requestUrl.pathname).toBe("/api/appointment-drafts");
    expect(options.method).toBe("GET");
    expect(options.credentials).toBe("include");
  });

  it("surfaces real backend list endpoint errors without unsupported fallback rewriting", async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        ok: false,
        status: 404,
        payload: {
          message: "Not Found"
        }
      })
    );

    let thrownError = null;

    try {
      await listAppointmentDrafts();
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(AppointmentDraftApiError);
    expect(thrownError.status).toBe(404);
    expect(thrownError.message).toBe("Not Found");
  });
});
