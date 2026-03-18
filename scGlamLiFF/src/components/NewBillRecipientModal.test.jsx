// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NewBillRecipientModal from "./NewBillRecipientModal";

const {
  createAppointmentMock,
  getAppointmentsQueueMock,
  getBookingOptionsMock,
  getCalendarDaysMock,
  createAppointmentDraftMock,
  updateAppointmentDraftMock,
  submitAppointmentDraftMock
} = vi.hoisted(() => ({
  createAppointmentMock: vi.fn(),
  getAppointmentsQueueMock: vi.fn(),
  getBookingOptionsMock: vi.fn(),
  getCalendarDaysMock: vi.fn(),
  createAppointmentDraftMock: vi.fn(),
  updateAppointmentDraftMock: vi.fn(),
  submitAppointmentDraftMock: vi.fn()
}));

vi.mock("../services/appointmentsService", () => {
  class AppointmentsApiError extends Error {
    constructor(message, { status, payload } = {}) {
      super(message);
      this.name = "AppointmentsApiError";
      this.status = status ?? 0;
      this.payload = payload ?? null;
      this.code = payload?.code || "";
      this.details = payload?.details || null;
    }
  }

  return {
    AppointmentsApiError,
    createAppointment: createAppointmentMock,
    getAppointmentsQueue: getAppointmentsQueueMock,
    getBookingOptions: getBookingOptionsMock,
    getCalendarDays: getCalendarDaysMock
  };
});

vi.mock("../services/appointmentDraftService", () => {
  class AppointmentDraftApiError extends Error {
    constructor(message, { status, payload } = {}) {
      super(message);
      this.name = "AppointmentDraftApiError";
      this.status = status ?? 0;
      this.payload = payload ?? null;
      this.code = payload?.code || "";
      this.details = payload?.details || null;
    }
  }

  return {
    AppointmentDraftApiError,
    createAppointmentDraft: createAppointmentDraftMock,
    getAppointmentDraft: vi.fn(),
    updateAppointmentDraft: updateAppointmentDraftMock,
    submitAppointmentDraft: submitAppointmentDraftMock
  };
});

vi.mock("../services/receiptOcrService", () => ({
  processReceiptImage: vi.fn()
}));

const bookingOptions = [
  {
    value: "package:package-uuid",
    label: "Promo Smooth 3x 3900",
    source: "package",
    treatment_id: "treatment-uuid",
    treatment_item_text: "Smooth 3x 3900",
    package_id: "package-uuid"
  }
];

const baseDraft = {
  id: "draft-uuid",
  status: "draft",
  customer_full_name: "ลูกค้าทดสอบ",
  phone: "0812345678",
  branch_id: "branch-003",
  treatment_id: "treatment-uuid",
  treatment_item_text: "Smooth 3x 3900",
  package_id: "package-uuid",
  staff_name: null,
  scheduled_at: null,
  receipt_evidence: null,
  flow_metadata: {
    flow: "receipt_booking",
    booking_option_value: "package:package-uuid",
    booking_option_source: "package"
  },
  updated_at: "2026-03-17T10:00:00.000Z",
  created_at: "2026-03-17T10:00:00.000Z"
};

const renderModal = (props = {}) =>
  render(
    <NewBillRecipientModal
      open
      onClose={vi.fn()}
      onDraftChange={vi.fn()}
      {...props}
    />
  );

const fillDraftBaseFields = async () => {
  fireEvent.change(screen.getByLabelText("ชื่อ-นามสกุล"), {
    target: { value: "ลูกค้าทดสอบ" }
  });
  fireEvent.change(screen.getByLabelText("เบอร์โทร"), {
    target: { value: "081-234-5678" }
  });
  fireEvent.change(screen.getByLabelText("สาขา"), {
    target: { value: "branch-003" }
  });

  const bookingSelect = await screen.findByLabelText("โปรโมชั่น / บริการ");
  fireEvent.change(bookingSelect, {
    target: { value: "package:package-uuid" }
  });
};

const fillCompleteBookingFields = async () => {
  await fillDraftBaseFields();
  fireEvent.change(screen.getByLabelText("เลือกวันที่จอง"), {
    target: { value: "2030-03-20" }
  });
  fireEvent.change(screen.getByLabelText("เลือกเวลาที่นัดจองนวดหน้า"), {
    target: { value: "14:00" }
  });
  fireEvent.change(screen.getByLabelText("ชื่อผู้ให้บริการ"), {
    target: { value: "โบว์" }
  });
};

describe("NewBillRecipientModal draft flow", () => {
  beforeEach(() => {
    createAppointmentMock.mockReset();
    getAppointmentsQueueMock.mockReset();
    getBookingOptionsMock.mockReset();
    getCalendarDaysMock.mockReset();
    createAppointmentDraftMock.mockReset();
    updateAppointmentDraftMock.mockReset();
    submitAppointmentDraftMock.mockReset();

    getBookingOptionsMock.mockResolvedValue(bookingOptions);
    getCalendarDaysMock.mockResolvedValue([]);
    getAppointmentsQueueMock.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("calls draft create API instead of real appointment create when saving an incomplete booking", async () => {
    createAppointmentDraftMock.mockResolvedValue({
      draft: baseDraft
    });

    renderModal();
    await fillDraftBaseFields();

    fireEvent.click(screen.getByRole("button", { name: "บันทึกร่าง" }));

    await waitFor(() => expect(createAppointmentDraftMock).toHaveBeenCalledTimes(1));
    expect(createAppointmentMock).not.toHaveBeenCalled();
    expect(submitAppointmentDraftMock).not.toHaveBeenCalled();
  });

  it("submits an existing completed draft through draft submit path", async () => {
    createAppointmentDraftMock.mockResolvedValue({
      draft: baseDraft
    });
    updateAppointmentDraftMock.mockResolvedValue({
      draft: {
        ...baseDraft,
        staff_name: "โบว์",
        scheduled_at: "2030-03-20T14:00:00+07:00"
      }
    });
    submitAppointmentDraftMock.mockResolvedValue({
      draft: {
        ...baseDraft,
        status: "submitted",
        staff_name: "โบว์",
        scheduled_at: "2030-03-20T14:00:00+07:00",
        submitted_appointment_id: "appointment-uuid"
      },
      appointment: {
        appointment_id: "appointment-uuid",
        receipt_evidence: null
      }
    });

    renderModal();
    await fillDraftBaseFields();
    fireEvent.click(screen.getByRole("button", { name: "บันทึกร่าง" }));

    await waitFor(() => expect(createAppointmentDraftMock).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("เลือกวันที่จอง"), {
      target: { value: "2030-03-20" }
    });
    fireEvent.change(screen.getByLabelText("เลือกเวลาที่นัดจองนวดหน้า"), {
      target: { value: "14:00" }
    });
    fireEvent.change(screen.getByLabelText("ชื่อผู้ให้บริการ"), {
      target: { value: "โบว์" }
    });

    fireEvent.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(() => expect(updateAppointmentDraftMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(submitAppointmentDraftMock).toHaveBeenCalledWith("draft-uuid"));
    expect(createAppointmentMock).not.toHaveBeenCalled();
  });

  it("still uses real appointment create when no draft exists and booking is complete", async () => {
    createAppointmentMock.mockResolvedValue({
      appointment_id: "appointment-uuid",
      receipt_evidence: null
    });

    renderModal();
    await fillCompleteBookingFields();

    fireEvent.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(() => expect(createAppointmentMock).toHaveBeenCalledTimes(1));
    expect(createAppointmentDraftMock).not.toHaveBeenCalled();
    expect(submitAppointmentDraftMock).not.toHaveBeenCalled();
  });

  it("hydrates an existing draft into the modal form when opened from the draft list", async () => {
    renderModal({
      initialDraft: {
        ...baseDraft,
        staff_name: "โบว์",
        scheduled_at: "2030-03-20T14:00:00+07:00"
      }
    });

    await waitFor(() =>
      expect(screen.getByLabelText("โปรโมชั่น / บริการ").value).toBe(
        "package:package-uuid"
      )
    );

    expect(screen.getByLabelText("ชื่อ-นามสกุล").value).toBe("ลูกค้าทดสอบ");
    expect(screen.getByLabelText("เบอร์โทร").value).toBe("0812345678");
    expect(screen.getByLabelText("สาขา").value).toBe("branch-003");
    expect(screen.getByLabelText("เลือกวันที่จอง").value).toBe("2030-03-20");
    expect(screen.getByLabelText("เลือกเวลาที่นัดจองนวดหน้า").value).toBe("14:00");
    expect(screen.getByLabelText("ชื่อผู้ให้บริการ").value).toBe("โบว์");
    await waitFor(() =>
      expect(screen.getByText("สถานะร่างตอนนี้: พร้อมจอง")).toBeTruthy()
    );
  });

  it("preserves opaque backend branch values when reopening a stored draft", async () => {
    renderModal({
      initialDraft: {
        ...baseDraft,
        branch_id: "branch-external-777"
      }
    });

    await waitFor(() =>
      expect(screen.getByLabelText("โปรโมชั่น / บริการ").value).toBe(
        "package:package-uuid"
      )
    );

    expect(screen.getByLabelText("สาขา").value).toBe("branch-external-777");
    expect(
      screen.getByRole("option", {
        name: "สาขาที่บันทึกไว้ (branch-external-777)"
      })
    ).toBeTruthy();
  });
});
