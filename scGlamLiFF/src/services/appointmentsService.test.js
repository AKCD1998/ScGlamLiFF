import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAppointmentsQueue, getCalendarDays } from "./appointmentsService";

const createJsonResponse = (payload) => ({
  ok: true,
  text: vi.fn().mockResolvedValue(JSON.stringify(payload))
});

const parseRequestUrl = (value) => new URL(value, "https://example.test");

describe("appointmentsService branch_id query handling", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("includes branch_id on calendar-days when the selected branch value is UUID-shaped", async () => {
    const branchId = "123e4567-e89b-42d3-a456-426614174000";
    fetchMock.mockResolvedValue(createJsonResponse({ days: [] }));

    await getCalendarDays({
      from: "2026-03-01",
      to: "2026-03-31",
      branchValue: branchId
    });

    const [url, options] = fetchMock.mock.calls[0];
    const requestUrl = parseRequestUrl(url);

    expect(requestUrl.pathname).toBe("/api/appointments/calendar-days");
    expect(requestUrl.searchParams.get("branch_id")).toBe(branchId);
    expect(options.credentials).toBe("include");
  });

  it("omits branch_id on calendar-days when the selected branch value is not UUID-shaped", async () => {
    fetchMock.mockResolvedValue(createJsonResponse({ days: [] }));

    await getCalendarDays({
      from: "2026-03-01",
      to: "2026-03-31",
      branchValue: "branch-003"
    });

    const [url] = fetchMock.mock.calls[0];
    const requestUrl = parseRequestUrl(url);

    expect(requestUrl.pathname).toBe("/api/appointments/calendar-days");
    expect(requestUrl.searchParams.has("branch_id")).toBe(false);
  });

  it("includes branch_id on queue when the selected branch value is UUID-shaped", async () => {
    const branchId = "123e4567-e89b-42d3-a456-426614174000";
    fetchMock.mockResolvedValue(createJsonResponse({ rows: [] }));

    await getAppointmentsQueue({
      date: "2026-03-17",
      branchValue: branchId
    });

    const [url, options] = fetchMock.mock.calls[0];
    const requestUrl = parseRequestUrl(url);

    expect(requestUrl.pathname).toBe("/api/appointments/queue");
    expect(requestUrl.searchParams.get("branch_id")).toBe(branchId);
    expect(options.credentials).toBe("include");
  });

  it("omits branch_id on queue when the selected branch value is not UUID-shaped", async () => {
    fetchMock.mockResolvedValue(createJsonResponse({ rows: [] }));

    await getAppointmentsQueue({
      date: "2026-03-17",
      branchValue: "branch-003"
    });

    const [url] = fetchMock.mock.calls[0];
    const requestUrl = parseRequestUrl(url);

    expect(requestUrl.pathname).toBe("/api/appointments/queue");
    expect(requestUrl.searchParams.has("branch_id")).toBe(false);
  });
});
