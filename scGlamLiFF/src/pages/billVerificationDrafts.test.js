import { describe, expect, it } from "vitest";
import {
  EMPTY_BOOKING_DATE_PLACEHOLDER,
  getDraftStatusPresentation,
  isDraftReadyForSubmit,
  mapDraftToBillCard
} from "./billVerificationDrafts";

describe("billVerificationDrafts helpers", () => {
  it("maps backend draft fields into BillCard props", () => {
    const card = mapDraftToBillCard({
      id: "draft-uuid",
      status: "draft",
      customer_full_name: "ลูกค้าทดสอบ",
      phone: "0812345678",
      treatment_item_text: "Smooth 3x 3900",
      scheduled_at: "2030-03-20T14:00:00+07:00"
    });

    expect(card.id).toBe("draft-uuid");
    expect(card.name).toBe("ลูกค้าทดสอบ");
    expect(card.phone).toBe("0812345678");
    expect(card.promo).toBe("Smooth 3x 3900");
    expect(card.bookingDate).not.toBe(EMPTY_BOOKING_DATE_PLACEHOLDER);
    expect(card.status).toBe("เตรียมข้อมูล");
    expect(card.tone).toBe("prep");
  });

  it("uses a friendly placeholder when scheduled_at is missing", () => {
    const card = mapDraftToBillCard({
      id: "draft-uuid",
      status: "draft",
      customer_full_name: "ลูกค้าทดสอบ"
    });

    expect(card.bookingDate).toBe(EMPTY_BOOKING_DATE_PLACEHOLDER);
  });

  it("marks incomplete draft rows as เตรียมข้อมูล", () => {
    expect(
      getDraftStatusPresentation({
        status: "draft",
        customer_full_name: "ลูกค้าทดสอบ",
        phone: "0812345678",
        treatment_id: "treatment-uuid",
        branch_id: "branch-003"
      })
    ).toEqual({
      status: "เตรียมข้อมูล",
      tone: "prep"
    });
  });

  it("marks complete draft rows as พร้อมจอง when submit-required fields are present", () => {
    const readyDraft = {
      status: "draft",
      customer_full_name: "ลูกค้าทดสอบ",
      phone: "0812345678",
      treatment_id: "treatment-uuid",
      branch_id: "branch-003",
      scheduled_at: "2030-03-20T14:00:00+07:00",
      staff_name: "โบว์",
      flow_metadata: {
        booking_option_source: "package"
      },
      package_id: "package-uuid"
    };

    expect(isDraftReadyForSubmit(readyDraft)).toBe(true);
    expect(getDraftStatusPresentation(readyDraft)).toEqual({
      status: "พร้อมจอง",
      tone: "ready"
    });
  });

  it("keeps submitted and cancelled rows on their explicit backend states", () => {
    expect(getDraftStatusPresentation({ status: "submitted" })).toEqual({
      status: "จองแล้ว",
      tone: "ready"
    });
    expect(getDraftStatusPresentation({ status: "cancelled" })).toEqual({
      status: "ยกเลิกแล้ว",
      tone: "cancelled"
    });
  });
});
