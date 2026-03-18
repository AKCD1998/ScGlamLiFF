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

const labelMatchers = {
  name: /ชื่อ-นามสกุล/,
  phone: /เบอร์โทร/,
  branch: /สาขา/,
  bookingOption: /โปรโมชั่น \/ บริการ/,
  bookingDatePicker: /เลือกวันที่จอง/,
  bookingTimePicker: /เลือกเวลาที่นัดจองนวดหน้า/,
  provider: /ชื่อผู้ให้บริการ/
};

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

const renderModal = (props = {}) => {
  const { onClose = vi.fn(), onDraftChange = vi.fn(), ...restProps } = props;

  return {
    onClose,
    onDraftChange,
    ...render(
      <NewBillRecipientModal
        open
        onClose={onClose}
        onDraftChange={onDraftChange}
        {...restProps}
      />
    )
  };
};

const fillDraftBaseFields = async () => {
  fireEvent.change(screen.getByLabelText(labelMatchers.name), {
    target: { value: "ลูกค้าทดสอบ" }
  });
  fireEvent.change(screen.getByLabelText(labelMatchers.phone), {
    target: { value: "081-234-5678" }
  });
  fireEvent.change(screen.getByLabelText(labelMatchers.branch), {
    target: { value: "branch-003" }
  });

  const bookingSelect = await screen.findByLabelText(labelMatchers.bookingOption);
  fireEvent.change(bookingSelect, {
    target: { value: "package:package-uuid" }
  });
};

const fillCompleteBookingFields = async () => {
  await fillDraftBaseFields();
  fireEvent.change(screen.getByLabelText(labelMatchers.bookingDatePicker), {
    target: { value: "2030-03-20" }
  });
  fireEvent.change(screen.getByLabelText(labelMatchers.bookingTimePicker), {
    target: { value: "14:00" }
  });
  fireEvent.change(screen.getByLabelText(labelMatchers.provider), {
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

    fireEvent.change(screen.getByLabelText(labelMatchers.bookingDatePicker), {
      target: { value: "2030-03-20" }
    });
    fireEvent.change(screen.getByLabelText(labelMatchers.bookingTimePicker), {
      target: { value: "14:00" }
    });
    fireEvent.change(screen.getByLabelText(labelMatchers.provider), {
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

  it("keeps the save button disabled until all required fields are complete", async () => {
    renderModal();

    const saveButton = screen.getByRole("button", { name: "บันทึก" });
    expect(saveButton.disabled).toBe(true);

    await fillCompleteBookingFields();

    expect(screen.getByRole("button", { name: "บันทึก" }).disabled).toBe(false);
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
      expect(screen.getByLabelText(labelMatchers.bookingOption).value).toBe(
        "package:package-uuid"
      )
    );

    expect(screen.getByLabelText(labelMatchers.name).value).toBe("ลูกค้าทดสอบ");
    expect(screen.getByLabelText(labelMatchers.phone).value).toBe("0812345678");
    expect(screen.getByLabelText(labelMatchers.branch).value).toBe("branch-003");
    expect(screen.getByLabelText(labelMatchers.bookingDatePicker).value).toBe("2030-03-20");
    expect(screen.getByLabelText(labelMatchers.bookingTimePicker).value).toBe("14:00");
    expect(screen.getByLabelText(labelMatchers.provider).value).toBe("โบว์");
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
      expect(screen.getByLabelText(labelMatchers.bookingOption).value).toBe(
        "package:package-uuid"
      )
    );

    expect(screen.getByLabelText(labelMatchers.branch).value).toBe("branch-external-777");
    expect(
      screen.getByRole("option", {
        name: "สาขาที่บันทึกไว้ (branch-external-777)"
      })
    ).toBeTruthy();
  });

  it("asks for confirmation before discarding entered data from the cancel button", async () => {
    const onClose = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm");
    confirmSpy.mockReturnValueOnce(false).mockReturnValueOnce(true);

    renderModal({ onClose });
    await fillDraftBaseFields();

    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));

    expect(confirmSpy).toHaveBeenCalledWith(
      "ยืนยันการยกเลิกหรือไม่ ข้อมูลที่กรอกไว้จะหายไป"
    );
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    confirmSpy.mockRestore();
  });
});
