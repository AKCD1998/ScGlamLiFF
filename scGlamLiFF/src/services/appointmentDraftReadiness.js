import {
  buildScheduledAt,
  normalizePhoneDigits,
  trimText
} from "./appointmentContract";
import { normalizeBranchWriteValue } from "./branchContract";

const isScheduledAtReady = (value) => {
  const scheduledAt = trimText(value);

  if (!scheduledAt) {
    return false;
  }

  return !Number.isNaN(new Date(scheduledAt).getTime());
};

const getDraftLifecycleStatus = (draft) =>
  trimText(draft?.status || "draft").toLowerCase() || "draft";

export const buildAppointmentDraftReadinessRecord = ({
  formValues,
  bookingSelection,
  status = "draft"
} = {}) => ({
  status,
  customer_full_name: trimText(formValues?.name),
  phone: normalizePhoneDigits(formValues?.phone),
  treatment_id: trimText(bookingSelection?.treatmentId),
  branch_id: normalizeBranchWriteValue(formValues?.branchId),
  scheduled_at: buildScheduledAt(
    formValues?.bookingDatePicker,
    formValues?.bookingTimePicker
  ),
  staff_name: trimText(formValues?.provider),
  package_id: trimText(bookingSelection?.packageId),
  flow_metadata: {
    booking_option_source: trimText(bookingSelection?.source)
  }
});

export const getAppointmentDraftReadiness = (draft) => {
  const lifecycleStatus = getDraftLifecycleStatus(draft);
  const missingFields = [];

  if (!trimText(draft?.customer_full_name)) {
    missingFields.push("customer_full_name");
  }

  if (normalizePhoneDigits(draft?.phone).length < 9) {
    missingFields.push("phone");
  }

  if (!trimText(draft?.treatment_id)) {
    missingFields.push("treatment_id");
  }

  if (!trimText(draft?.branch_id)) {
    missingFields.push("branch_id");
  }

  if (!isScheduledAtReady(draft?.scheduled_at)) {
    missingFields.push("scheduled_at");
  }

  if (!trimText(draft?.staff_name)) {
    missingFields.push("staff_name");
  }

  if (
    trimText(draft?.flow_metadata?.booking_option_source).toLowerCase() ===
      "package" &&
    !trimText(draft?.package_id)
  ) {
    missingFields.push("package_id");
  }

  return {
    lifecycleStatus,
    missingFields,
    isReadyToSubmit: lifecycleStatus === "draft" && missingFields.length === 0
  };
};

export const isAppointmentDraftReadyToSubmit = (draft) =>
  getAppointmentDraftReadiness(draft).isReadyToSubmit;

export const getAppointmentDraftDisplayStatus = (draft) => {
  const readiness = getAppointmentDraftReadiness(draft);

  if (readiness.lifecycleStatus === "submitted") {
    return {
      label: "จองแล้ว",
      tone: "ready"
    };
  }

  if (readiness.lifecycleStatus === "cancelled") {
    return {
      label: "ยกเลิกแล้ว",
      tone: "cancelled"
    };
  }

  return readiness.isReadyToSubmit
    ? {
        label: "พร้อมจอง",
        tone: "ready"
      }
    : {
        label: "เตรียมข้อมูล",
        tone: "prep"
      };
};
