// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("appointmentsService mock mode", () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../config/env");
  });

  it("returns mock booking options and calendar density", async () => {
    vi.doMock("../config/env", () => ({
      useMock: true
    }));

    const { getBookingOptions, getCalendarDays } = await import(
      "./appointmentsService"
    );

    const bookingPayload = await getBookingOptions();
    const days = await getCalendarDays({
      from: "2026-03-25",
      to: "2026-03-31",
      branchValue: "branch-003"
    });

    expect(bookingPayload.options.length).toBeGreaterThan(0);
    expect(bookingPayload.meta?.source).toBe("mock_mode");
    expect(days.length).toBeGreaterThan(0);
    expect(days[0]).toEqual(
      expect.objectContaining({
        date: expect.any(String),
        count: expect.any(Number)
      })
    );
  });

  it("adds created mock appointments into the queue view", async () => {
    vi.doMock("../config/env", () => ({
      useMock: true
    }));

    const { createAppointment, getAppointmentsQueue } = await import(
      "./appointmentsService"
    );

    const response = await createAppointment({
      customer_full_name: "ลูกค้าทดลอง Queue",
      phone: "0800000000",
      branch_id: "branch-003",
      treatment_id: "treatment-smooth-3x",
      treatment_item_text: "Smooth 3x 3900",
      staff_name: "แพร",
      scheduled_at: "2026-03-30T15:30:00+07:00"
    });
    const rows = await getAppointmentsQueue({
      date: "2026-03-30",
      branchValue: "branch-003"
    });

    expect(rows.some((row) => row.id === response.appointment.id)).toBe(true);
    expect(rows.some((row) => row.bookingTime === "15:30")).toBe(true);
  });
});
