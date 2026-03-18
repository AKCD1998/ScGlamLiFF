import { normalizeCanonicalBranch } from "./branchContract";

const RECEIPT_PLACEHOLDERS = new Set([
  "ไม่พบเลขที่ใบเสร็จ",
  "ไม่พบราคาสินค้า",
  "ยังไม่ได้อ่านจากใบเสร็จจริง",
  "รอ OCR backend"
]);

const CONFLICTING_QUEUE_STATUSES = new Set(["booked", "rescheduled"]);

export const trimText = (value) =>
  typeof value === "string" ? value.trim() : "";

export const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const normalizePhoneDigits = (value) =>
  String(value || "").replace(/\D/g, "");

const hasMeaningfulReceiptText = (value) => {
  const trimmedValue = trimText(value);
  return Boolean(trimmedValue) && !RECEIPT_PLACEHOLDERS.has(trimmedValue);
};

const roundAmount = (value) => Math.round(value * 100) / 100;

const getQueueTimeLabel = (row) => {
  const bookingTime = trimText(row?.bookingTime);
  return /^\d{2}:\d{2}$/.test(bookingTime) ? bookingTime : "";
};

const buildReceiptVerificationMetadata = (bookingSelection) => ({
  flow: "receipt_booking",
  booking_option_value: trimText(bookingSelection?.optionValue),
  booking_option_source: trimText(bookingSelection?.source)
});

const buildDraftFlowMetadata = (bookingSelection) => {
  const flowMetadata = buildReceiptVerificationMetadata(bookingSelection);
  const cleanedFlowMetadata = Object.entries(flowMetadata).reduce(
    (accumulator, [key, value]) =>
      trimText(value)
        ? {
            ...accumulator,
            [key]: trimText(value)
          }
        : accumulator,
    {}
  );

  return Object.keys(cleanedFlowMetadata).length ? cleanedFlowMetadata : null;
};

const normalizeComparableValue = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeComparableValue(item));
  }

  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        const normalizedValue = normalizeComparableValue(value[key]);

        if (normalizedValue === null) {
          return accumulator;
        }

        return {
          ...accumulator,
          [key]: normalizedValue
        };
      }, {});
  }

  return value;
};

const areComparableValuesEqual = (left, right) =>
  JSON.stringify(normalizeComparableValue(left)) ===
  JSON.stringify(normalizeComparableValue(right));

const buildDraftFieldValues = ({
  formValues,
  bookingSelection,
  receiptOcrResult
}) => {
  const normalizedBranch = normalizeCanonicalBranch(formValues?.branchId);
  const receiptEvidence = buildCanonicalReceiptEvidence(receiptOcrResult, {
    verificationMetadata: buildReceiptVerificationMetadata(bookingSelection)
  });

  return {
    normalizedBranch,
    customerFullName: trimText(formValues?.name),
    phone: normalizePhoneDigits(formValues?.phone),
    branchId: normalizedBranch.writeBranchId,
    treatmentId: trimText(bookingSelection?.treatmentId),
    treatmentItemText: trimText(bookingSelection?.treatmentItemText),
    packageId: trimText(bookingSelection?.packageId),
    staffName: trimText(formValues?.provider),
    scheduledAt: buildScheduledAt(
      formValues?.bookingDatePicker,
      formValues?.bookingTimePicker
    ),
    receiptEvidence,
    flowMetadata: buildDraftFlowMetadata(bookingSelection)
  };
};

export const buildScheduledAt = (date, time) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time)
    ? `${date}T${time}:00+07:00`
    : "";

export const collectOccupiedTimesFromQueueRows = (rows, branchValue) => {
  const normalizedBranch = normalizeCanonicalBranch(branchValue);

  return Array.from(
    new Set(
      rows
        .filter((row) => {
          const status = trimText(row?.status).toLowerCase();

          if (!CONFLICTING_QUEUE_STATUSES.has(status)) {
            return false;
          }

          if (!normalizedBranch.requiresClientSideQueueFilter) {
            return true;
          }

          // Backend queue/calendar filters only accept UUID branch queries.
          // For opaque text write values like `branch-003`, the frontend omits the query
          // parameter and narrows the all-branch response locally instead of inventing a
          // UUID mapping that does not exist in the backend contract.
          return trimText(row?.branch_id) === normalizedBranch.writeBranchId;
        })
        .map((row) => getQueueTimeLabel(row))
        .filter(Boolean)
    )
  ).sort();
};

export const buildCanonicalReceiptEvidence = (
  receiptOcrResult,
  { verificationMetadata } = {}
) => {
  if (!receiptOcrResult || receiptOcrResult.source !== "api") {
    return null;
  }

  const receiptEvidence = {};

  if (hasMeaningfulReceiptText(receiptOcrResult.receiptImageRef)) {
    receiptEvidence.receipt_image_ref = trimText(receiptOcrResult.receiptImageRef);
  }

  if (hasMeaningfulReceiptText(receiptOcrResult.receiptNumber)) {
    receiptEvidence.receipt_number = trimText(receiptOcrResult.receiptNumber);
  }

  if (hasMeaningfulReceiptText(receiptOcrResult.receiptLine)) {
    receiptEvidence.receipt_line = trimText(receiptOcrResult.receiptLine);
  }

  if (hasMeaningfulReceiptText(receiptOcrResult.receiptIdentifier)) {
    receiptEvidence.receipt_identifier = trimText(
      receiptOcrResult.receiptIdentifier
    );
  }

  if (
    typeof receiptOcrResult.totalAmountValue === "number" &&
    Number.isFinite(receiptOcrResult.totalAmountValue) &&
    receiptOcrResult.totalAmountValue >= 0
  ) {
    receiptEvidence.total_amount_thb = roundAmount(receiptOcrResult.totalAmountValue);
  }

  if (hasMeaningfulReceiptText(receiptOcrResult.ocrStatus)) {
    receiptEvidence.ocr_status = trimText(receiptOcrResult.ocrStatus);
  }

  if (hasMeaningfulReceiptText(receiptOcrResult.rawText)) {
    receiptEvidence.ocr_raw_text = trimText(receiptOcrResult.rawText);
  }

  if (
    isPlainObject(receiptOcrResult.ocrMetadata) &&
    Object.keys(receiptOcrResult.ocrMetadata).length
  ) {
    receiptEvidence.ocr_metadata = receiptOcrResult.ocrMetadata;
  }

  if (!Object.keys(receiptEvidence).length) {
    return null;
  }

  receiptEvidence.verification_source = "bill_verification_modal";

  if (isPlainObject(verificationMetadata)) {
    const cleanedVerificationMetadata = Object.entries(verificationMetadata).reduce(
      (accumulator, [key, value]) => {
        if (typeof value === "string") {
          const trimmedValue = trimText(value);

          if (!trimmedValue) {
            return accumulator;
          }

          return {
            ...accumulator,
            [key]: trimmedValue
          };
        }

        if (value === undefined || value === null) {
          return accumulator;
        }

        return {
          ...accumulator,
          [key]: value
        };
      },
      {}
    );

    if (Object.keys(cleanedVerificationMetadata).length) {
      receiptEvidence.verification_metadata = cleanedVerificationMetadata;
    }
  }

  return receiptEvidence;
};

export const buildCanonicalAppointmentCreatePayload = ({
  formValues,
  bookingSelection,
  receiptOcrResult
}) => {
  const normalizedBranch = normalizeCanonicalBranch(formValues?.branchId);
  const payload = {
    scheduled_at: buildScheduledAt(
      formValues?.bookingDatePicker,
      formValues?.bookingTimePicker
    ),
    customer_full_name: trimText(formValues?.name),
    phone: normalizePhoneDigits(formValues?.phone),
    treatment_id: trimText(bookingSelection?.treatmentId)
  };
  const staffName = trimText(formValues?.provider);
  const treatmentItemText = trimText(bookingSelection?.treatmentItemText);
  const packageId = trimText(bookingSelection?.packageId);
  const receiptEvidence = buildCanonicalReceiptEvidence(receiptOcrResult, {
    verificationMetadata: {
      flow: "receipt_booking",
      booking_option_value: trimText(bookingSelection?.optionValue),
      booking_option_source: trimText(bookingSelection?.source)
    }
  });

  if (normalizedBranch.writeBranchId) {
    payload.branch_id = normalizedBranch.writeBranchId;
  }

  if (staffName) {
    payload.staff_name = staffName;
  }

  if (treatmentItemText) {
    payload.treatment_item_text = treatmentItemText;
  }

  if (packageId) {
    payload.package_id = packageId;
  }

  if (receiptEvidence) {
    payload.receipt_evidence = receiptEvidence;
  }

  return {
    normalizedBranch,
    payload,
    receiptEvidence
  };
};

export const buildCanonicalAppointmentDraftCreatePayload = ({
  formValues,
  bookingSelection,
  receiptOcrResult
}) => {
  const {
    normalizedBranch,
    customerFullName,
    phone,
    branchId,
    treatmentId,
    treatmentItemText,
    packageId,
    staffName,
    scheduledAt,
    receiptEvidence,
    flowMetadata
  } = buildDraftFieldValues({
    formValues,
    bookingSelection,
    receiptOcrResult
  });
  const payload = {
    source: "promo_receipt_draft"
  };

  if (customerFullName) {
    payload.customer_full_name = customerFullName;
  }

  if (phone) {
    payload.phone = phone;
  }

  if (branchId) {
    payload.branch_id = branchId;
  }

  if (treatmentId) {
    payload.treatment_id = treatmentId;
  }

  if (treatmentItemText) {
    payload.treatment_item_text = treatmentItemText;
  }

  if (packageId) {
    payload.package_id = packageId;
  }

  if (staffName) {
    payload.staff_name = staffName;
  }

  if (scheduledAt) {
    payload.scheduled_at = scheduledAt;
  }

  if (receiptEvidence) {
    payload.receipt_evidence = receiptEvidence;
  }

  if (flowMetadata) {
    payload.flow_metadata = flowMetadata;
  }

  return {
    normalizedBranch,
    payload,
    receiptEvidence,
    flowMetadata
  };
};

export const buildCanonicalAppointmentDraftPatchPayload = ({
  formValues,
  bookingSelection,
  receiptOcrResult,
  currentDraft
}) => {
  const {
    normalizedBranch,
    customerFullName,
    phone,
    branchId,
    treatmentId,
    treatmentItemText,
    packageId,
    staffName,
    scheduledAt,
    receiptEvidence,
    flowMetadata
  } = buildDraftFieldValues({
    formValues,
    bookingSelection,
    receiptOcrResult
  });
  const payload = {};
  const nextValues = {
    customer_full_name: customerFullName || "",
    phone: phone || "",
    branch_id: branchId || "",
    treatment_id: treatmentId || "",
    treatment_item_text: treatmentItemText || "",
    package_id: packageId || "",
    staff_name: staffName || "",
    scheduled_at: scheduledAt || "",
    receipt_evidence: receiptEvidence,
    flow_metadata: flowMetadata
  };
  const currentValues = {
    customer_full_name: trimText(currentDraft?.customer_full_name),
    phone: normalizePhoneDigits(currentDraft?.phone),
    branch_id: trimText(currentDraft?.branch_id),
    treatment_id: trimText(currentDraft?.treatment_id),
    treatment_item_text: trimText(currentDraft?.treatment_item_text),
    package_id: trimText(currentDraft?.package_id),
    staff_name: trimText(currentDraft?.staff_name),
    scheduled_at: trimText(currentDraft?.scheduled_at),
    receipt_evidence:
      isPlainObject(currentDraft?.receipt_evidence) &&
      Object.keys(currentDraft.receipt_evidence).length
        ? currentDraft.receipt_evidence
        : null,
    flow_metadata:
      isPlainObject(currentDraft?.flow_metadata) &&
      Object.keys(currentDraft.flow_metadata).length
        ? currentDraft.flow_metadata
        : null
  };

  Object.entries(nextValues).forEach(([fieldName, nextValue]) => {
    if (areComparableValuesEqual(nextValue, currentValues[fieldName])) {
      return;
    }

    payload[fieldName] = nextValue ?? null;
  });

  return {
    normalizedBranch,
    payload,
    receiptEvidence,
    flowMetadata
  };
};
