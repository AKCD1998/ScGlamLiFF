import { trimText } from "../services/appointmentContract";
import formatBangkokDateTime from "../utils/formatBangkokDateTime";
import {
  getAppointmentDraftDisplayStatus,
  isAppointmentDraftReadyToSubmit
} from "../services/appointmentDraftReadiness";

export const EMPTY_BOOKING_DATE_PLACEHOLDER = "ยังไม่ได้นัดวัน";
export const isDraftReadyForSubmit = (draft) =>
  isAppointmentDraftReadyToSubmit(draft);

export const formatDraftBookingDate = (scheduledAt) => {
  if (!scheduledAt) {
    return EMPTY_BOOKING_DATE_PLACEHOLDER;
  }

  const formattedDate = formatBangkokDateTime(scheduledAt);

  if (!formattedDate) {
    return EMPTY_BOOKING_DATE_PLACEHOLDER;
  }

  return formattedDate;
};

export const getDraftStatusPresentation = (draft) => {
  const presentation = getAppointmentDraftDisplayStatus(draft);

  return {
    status: presentation.label,
    tone: presentation.tone
  };
};

const formatDraftStatusNote = (draft) => {
  const status = trimText(draft?.status).toLowerCase();
  const noteValue =
    status === "submitted" ? draft?.submitted_at : draft?.updated_at || draft?.created_at;

  if (!trimText(noteValue)) {
    return "บันทึกไว้ในฐานข้อมูล";
  }

  const parsedDate = new Date(noteValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "บันทึกไว้ในฐานข้อมูล";
  }

  return `${status === "submitted" ? "จองสำเร็จ" : "อัปเดตล่าสุด"} ${new Intl.DateTimeFormat(
    "th-TH",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok"
    }
  ).format(parsedDate)}`;
};

export const getDraftPromoText = (draft) =>
  String(draft?.treatment_item_text || "").trim() ||
  "ยังไม่ระบุโปรโมชั่นหรือบริการ";

export const mapDraftToBillCard = (draft) => {
  const statusConfig = getDraftStatusPresentation(draft);

  return {
    id: String(draft?.id || "").trim() || `draft-${Date.now()}`,
    status: statusConfig.status,
    tone: statusConfig.tone,
    name: draft?.customer_full_name || "ยังไม่ระบุชื่อ",
    phone: draft?.phone || "ยังไม่ระบุเบอร์โทร",
    promo: getDraftPromoText(draft),
    bookingDate: formatDraftBookingDate(draft?.scheduled_at),
    statusNote: formatDraftStatusNote(draft)
  };
};

export const sortDraftsNewestFirst = (drafts) =>
  [...drafts].sort((left, right) => {
    const leftTime = new Date(left?.updated_at || left?.created_at || 0).getTime();
    const rightTime = new Date(right?.updated_at || right?.created_at || 0).getTime();
    return rightTime - leftTime;
  });
