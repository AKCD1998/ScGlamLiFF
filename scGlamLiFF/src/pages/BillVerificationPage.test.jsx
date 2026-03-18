// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BillVerificationPage from "./BillVerificationPage";
import { AppointmentDraftApiError } from "../services/appointmentDraftService";

const { listAppointmentDraftsMock } = vi.hoisted(() => ({
  listAppointmentDraftsMock: vi.fn()
}));

vi.mock("../components/AppLayout", () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>
}));

vi.mock("../components/NewBillRecipientModal", () => ({
  default: ({ open, initialDraft }) => (
    <div
      data-testid="new-bill-recipient-modal"
      data-open={open ? "true" : "false"}
      data-draft-id={initialDraft?.id || ""}
    />
  )
}));

vi.mock("../services/appointmentDraftService", () => {
  class AppointmentDraftApiError extends Error {
    constructor(message, { status } = {}) {
      super(message);
      this.name = "AppointmentDraftApiError";
      this.status = status ?? 0;
    }
  }

  return {
    AppointmentDraftApiError,
    listAppointmentDrafts: listAppointmentDraftsMock
  };
});

describe("BillVerificationPage", () => {
  beforeEach(() => {
    listAppointmentDraftsMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders backend draft records through the existing card UI", async () => {
    listAppointmentDraftsMock.mockResolvedValue([
      {
        id: "draft-uuid",
        status: "draft",
        customer_full_name: "ลูกค้าทดสอบ",
        phone: "0812345678",
        treatment_item_text: "Smooth 3x 3900",
        scheduled_at: null,
        updated_at: "2026-03-17T10:00:00.000Z"
      }
    ]);

    render(<BillVerificationPage />);

    expect(await screen.findByText("ลูกค้าทดสอบ")).toBeTruthy();
    expect(screen.getByText("0812345678")).toBeTruthy();
    expect(screen.getByText("Smooth 3x 3900")).toBeTruthy();
    expect(screen.getByText("ยังไม่ได้นัดวัน")).toBeTruthy();
    expect(screen.getByText("เตรียมข้อมูล")).toBeTruthy();
  });

  it("reloads persisted draft rows from the real backend list endpoint on remount", async () => {
    listAppointmentDraftsMock.mockResolvedValue([
      {
        id: "draft-uuid",
        status: "draft",
        customer_full_name: "ลูกค้าทดสอบ",
        phone: "0812345678",
        treatment_item_text: "Smooth 3x 3900",
        scheduled_at: null,
        updated_at: "2026-03-17T10:00:00.000Z"
      }
    ]);

    const firstRender = render(<BillVerificationPage />);

    expect(await screen.findByText("ลูกค้าทดสอบ")).toBeTruthy();
    expect(listAppointmentDraftsMock).toHaveBeenCalledTimes(1);

    firstRender.unmount();

    render(<BillVerificationPage />);

    expect(await screen.findByText("ลูกค้าทดสอบ")).toBeTruthy();
    expect(listAppointmentDraftsMock).toHaveBeenCalledTimes(2);
  });

  it("shows an honest error state when the persisted list request fails", async () => {
    listAppointmentDraftsMock.mockRejectedValue(
      new AppointmentDraftApiError("backend list failed", { status: 500 })
    );

    render(<BillVerificationPage />);

    expect(await screen.findByText("โหลดรายการร่างไม่สำเร็จ")).toBeTruthy();
    expect(screen.getByText("backend list failed")).toBeTruthy();
  });

  it("opens the modal with the selected draft when clicking a draft card", async () => {
    listAppointmentDraftsMock.mockResolvedValue([
      {
        id: "draft-uuid",
        status: "draft",
        customer_full_name: "ลูกค้าทดสอบ",
        phone: "0812345678",
        treatment_item_text: "Smooth 3x 3900",
        scheduled_at: null,
        updated_at: "2026-03-17T10:00:00.000Z"
      }
    ]);

    render(<BillVerificationPage />);

    await screen.findByText("ลูกค้าทดสอบ");
    fireEvent.click(screen.getByRole("button", { name: "แก้ไขข้อมูล" }));

    await waitFor(() =>
      expect(
        screen.getByTestId("new-bill-recipient-modal").getAttribute("data-open")
      ).toBe("true")
    );
    expect(
      screen.getByTestId("new-bill-recipient-modal").getAttribute("data-draft-id")
    ).toBe("draft-uuid");
  });
});
