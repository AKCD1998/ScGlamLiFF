// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("appointmentDraftService mock mode", () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../config/env");
  });

  it("returns seeded mock drafts and lets a ready draft submit", async () => {
    vi.doMock("../config/env", () => ({
      useMock: true
    }));

    const {
      listAppointmentDrafts,
      submitAppointmentDraft
    } = await import("./appointmentDraftService");

    const rows = await listAppointmentDrafts();

    expect(rows.map((row) => row.id)).toEqual(
      expect.arrayContaining([
        "mock-draft-prep",
        "mock-draft-ready",
        "mock-draft-submitted"
      ])
    );

    const response = await submitAppointmentDraft("mock-draft-ready");

    expect(response.draft.status).toBe("submitted");
    expect(response.appointment.draft_id).toBe("mock-draft-ready");
    expect(response.appointment.bookingTime).toBe("14:30");
  });

  it("surfaces a typed validation error when the mock draft is incomplete", async () => {
    vi.doMock("../config/env", () => ({
      useMock: true
    }));

    const {
      AppointmentDraftApiError,
      submitAppointmentDraft
    } = await import("./appointmentDraftService");

    let thrownError = null;

    try {
      await submitAppointmentDraft("mock-draft-prep");
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(AppointmentDraftApiError);
    expect(thrownError.status).toBe(422);
    expect(thrownError.details?.missing_fields).toEqual(
      expect.arrayContaining(["scheduled_at", "staff_name"])
    );
  });
});
