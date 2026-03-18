import { describe, expect, it } from "vitest";
import {
  buildCanonicalAppointmentDraftCreatePayload,
  buildCanonicalAppointmentDraftPatchPayload,
  buildCanonicalAppointmentCreatePayload,
  buildCanonicalReceiptEvidence,
  collectOccupiedTimesFromQueueRows
} from "./appointmentContract";

const createBaseFormValues = (overrides = {}) => ({
  name: "Customer Name",
  phone: "081-234-5678",
  branchId: "branch-003",
  bookingDatePicker: "2026-03-20",
  bookingTimePicker: "14:00",
  provider: "โบว์",
  ...overrides
});

const createBaseBookingSelection = (overrides = {}) => ({
  optionValue: "package:package-uuid",
  label: "Smooth label from UI",
  source: "package",
  treatmentId: "treatment-uuid",
  treatmentItemText: "Smooth 3x 3900",
  packageId: "package-uuid",
  ...overrides
});

describe("buildCanonicalAppointmentCreatePayload", () => {
  it("keeps the raw selected branch value for create payloads", () => {
    const { normalizedBranch, payload } = buildCanonicalAppointmentCreatePayload({
      formValues: createBaseFormValues(),
      bookingSelection: createBaseBookingSelection(),
      receiptOcrResult: null
    });

    expect(normalizedBranch.writeBranchId).toBe("branch-003");
    expect(normalizedBranch.availabilityBranchId).toBe("");
    expect(payload.branch_id).toBe("branch-003");
  });

  it("includes treatment_item_text only when the booking option provides it", () => {
    const { payload } = buildCanonicalAppointmentCreatePayload({
      formValues: createBaseFormValues(),
      bookingSelection: createBaseBookingSelection(),
      receiptOcrResult: null
    });

    expect(payload.treatment_item_text).toBe("Smooth 3x 3900");
  });

  it("omits treatment_item_text when booking options do not provide it and does not fall back to label", () => {
    const { payload } = buildCanonicalAppointmentCreatePayload({
      formValues: createBaseFormValues(),
      bookingSelection: createBaseBookingSelection({
        treatmentItemText: "",
        label: "This label must not leak into treatment_item_text"
      }),
      receiptOcrResult: null
    });

    expect(payload).not.toHaveProperty("treatment_item_text");
    expect(payload).not.toMatchObject({
      treatment_item_text: "This label must not leak into treatment_item_text"
    });
  });

  it("omits receipt_evidence when OCR source is not api", () => {
    const { payload, receiptEvidence } = buildCanonicalAppointmentCreatePayload({
      formValues: createBaseFormValues(),
      bookingSelection: createBaseBookingSelection(),
      receiptOcrResult: {
        source: "fallback",
        receiptNumber: "RCP-123"
      }
    });

    expect(receiptEvidence).toBeNull();
    expect(payload).not.toHaveProperty("receipt_evidence");
  });

  it("omits optional top-level fields instead of sending empty strings or empty objects", () => {
    const { payload } = buildCanonicalAppointmentCreatePayload({
      formValues: createBaseFormValues({
        branchId: "",
        provider: "   "
      }),
      bookingSelection: createBaseBookingSelection({
        treatmentItemText: "",
        packageId: ""
      }),
      receiptOcrResult: null
    });

    expect(payload).toEqual({
      scheduled_at: "2026-03-20T14:00:00+07:00",
      customer_full_name: "Customer Name",
      phone: "0812345678",
      treatment_id: "treatment-uuid"
    });
  });

  it("preserves verification metadata only when valid receipt evidence exists", () => {
    const { payload } = buildCanonicalAppointmentCreatePayload({
      formValues: createBaseFormValues(),
      bookingSelection: createBaseBookingSelection({
        optionValue: "package:package-uuid",
        source: "package"
      }),
      receiptOcrResult: {
        source: "api",
        receiptNumber: "RCP-20260317-0091",
        receiptLine: "",
        receiptIdentifier: "",
        receiptImageRef: "",
        totalAmountValue: 1299,
        ocrStatus: "verified",
        rawText: "RAW OCR TEXT",
        ocrMetadata: {
          engine: "vision-v1"
        }
      }
    });

    expect(payload.receipt_evidence).toMatchObject({
      receipt_number: "RCP-20260317-0091",
      total_amount_thb: 1299,
      ocr_status: "verified",
      ocr_raw_text: "RAW OCR TEXT",
      verification_source: "bill_verification_modal",
      verification_metadata: {
        flow: "receipt_booking",
        booking_option_value: "package:package-uuid",
        booking_option_source: "package"
      }
    });
  });
});

describe("draft payload builders", () => {
  it("allows missing scheduled_at and staff_name when creating a draft payload", () => {
    const { payload } = buildCanonicalAppointmentDraftCreatePayload({
      formValues: createBaseFormValues({
        bookingDatePicker: "",
        bookingTimePicker: "",
        provider: ""
      }),
      bookingSelection: createBaseBookingSelection(),
      receiptOcrResult: null
    });

    expect(payload).toMatchObject({
      source: "promo_receipt_draft",
      customer_full_name: "Customer Name",
      phone: "0812345678",
      branch_id: "branch-003",
      treatment_id: "treatment-uuid",
      treatment_item_text: "Smooth 3x 3900",
      package_id: "package-uuid",
      flow_metadata: {
        flow: "receipt_booking",
        booking_option_value: "package:package-uuid",
        booking_option_source: "package"
      }
    });
    expect(payload).not.toHaveProperty("scheduled_at");
    expect(payload).not.toHaveProperty("staff_name");
  });

  it("omits empty optional fields from draft create payloads", () => {
    const { payload } = buildCanonicalAppointmentDraftCreatePayload({
      formValues: createBaseFormValues({
        branchId: "",
        provider: "",
        bookingDatePicker: "",
        bookingTimePicker: ""
      }),
      bookingSelection: createBaseBookingSelection({
        treatmentItemText: "",
        packageId: "",
        optionValue: "",
        source: ""
      }),
      receiptOcrResult: null
    });

    expect(payload).toEqual({
      source: "promo_receipt_draft",
      customer_full_name: "Customer Name",
      phone: "0812345678",
      treatment_id: "treatment-uuid",
      flow_metadata: {
        flow: "receipt_booking"
      }
    });
  });

  it("builds draft patch payloads that clear now-empty optional fields", () => {
    const { payload } = buildCanonicalAppointmentDraftPatchPayload({
      formValues: createBaseFormValues({
        provider: "",
        bookingDatePicker: "",
        bookingTimePicker: ""
      }),
      bookingSelection: createBaseBookingSelection({
        treatmentItemText: "",
        packageId: ""
      }),
      receiptOcrResult: null,
      currentDraft: {
        customer_full_name: "Customer Name",
        phone: "0812345678",
        branch_id: "branch-003",
        treatment_id: "treatment-uuid",
        treatment_item_text: "Smooth 3x 3900",
        package_id: "package-uuid",
        staff_name: "โบว์",
        scheduled_at: "2026-03-20T14:00:00+07:00",
        flow_metadata: {
          flow: "receipt_booking",
          booking_option_value: "package:package-uuid",
          booking_option_source: "package"
        }
      }
    });

    expect(payload).toMatchObject({
      treatment_item_text: "",
      package_id: "",
      staff_name: "",
      scheduled_at: ""
    });
  });

  it("narrows mixed-branch queue rows locally when the selected branch is a text write value", () => {
    const rows = [
      {
        status: "booked",
        bookingTime: "10:00",
        branch_id: "branch-003"
      },
      {
        status: "rescheduled",
        bookingTime: "11:00",
        branch_id: "branch-999"
      },
      {
        status: "completed",
        bookingTime: "12:00",
        branch_id: "branch-003"
      }
    ];

    expect(collectOccupiedTimesFromQueueRows(rows, "branch-003")).toEqual(["10:00"]);
  });
});

describe("buildCanonicalReceiptEvidence", () => {
  it("omits receipt_evidence entirely when no backend-supported receipt fields survive filtering", () => {
    const receiptEvidence = buildCanonicalReceiptEvidence(
      {
        source: "api",
        receiptLine: "ไม่พบเลขที่ใบเสร็จ",
        totalAmountValue: null,
        receiptNumber: "",
        receiptIdentifier: undefined,
        receiptImageRef: "",
        ocrStatus: "",
        rawText: "",
        ocrMetadata: {}
      },
      {
        verificationMetadata: {
          flow: "receipt_booking"
        }
      }
    );

    expect(receiptEvidence).toBeNull();
  });

  it("includes only backend-supported receipt fields and omits empty values", () => {
    const receiptEvidence = buildCanonicalReceiptEvidence(
      {
        source: "api",
        receiptImageRef: "",
        receiptNumber: "RCP-20260317-0091",
        receiptLine: "17/03/2026 14:31 BNO:0091",
        receiptIdentifier: "promo-verify-abc123",
        totalAmountValue: 1299,
        ocrStatus: "verified",
        rawText: "RAW OCR TEXT",
        ocrMetadata: {},
        unsupported_field: "must-not-leak"
      },
      {
        verificationMetadata: {
          flow: "receipt_booking",
          booking_option_value: "package:package-uuid",
          booking_option_source: "package",
          empty_value: "   ",
          nullable_value: null
        }
      }
    );

    expect(receiptEvidence).toEqual({
      receipt_number: "RCP-20260317-0091",
      receipt_line: "17/03/2026 14:31 BNO:0091",
      receipt_identifier: "promo-verify-abc123",
      total_amount_thb: 1299,
      ocr_status: "verified",
      ocr_raw_text: "RAW OCR TEXT",
      verification_source: "bill_verification_modal",
      verification_metadata: {
        flow: "receipt_booking",
        booking_option_value: "package:package-uuid",
        booking_option_source: "package"
      }
    });
  });
});
