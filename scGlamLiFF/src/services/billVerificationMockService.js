import {
  LIFF_RECEIPT_PROMO_BOOKING_CHANNEL,
  LIFF_RECEIPT_PROMO_OPTION_SOURCE
} from "../config/liffReceiptPromoCampaign";
import {
  buildScheduledAt,
  normalizePhoneDigits,
  trimText
} from "./appointmentContract";
import { getAppointmentDraftReadiness } from "./appointmentDraftReadiness";
import { DEFAULT_BOOKING_BRANCH_ID } from "./branchCatalog";
import { normalizeCanonicalBranch } from "./branchContract";

const DRAFTS_STORAGE_KEY = "scglamliff.mock.billVerificationDrafts.v1";
const APPOINTMENTS_STORAGE_KEY = "scglamliff.mock.billVerificationAppointments.v1";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const DEFAULT_MOCK_BOOKING_OPTIONS = Object.freeze([
  Object.freeze({
    value: "promo-receipt-smooth-3x-3900",
    label: "Smooth 3x 3900",
    source: LIFF_RECEIPT_PROMO_OPTION_SOURCE,
    treatment_id: "treatment-smooth-3x",
    treatment_item_text: "Smooth 3x 3900",
    package_id: ""
  }),
  Object.freeze({
    value: "package-deep-cleanse-7900",
    label: "Deep Cleanse Package 7900",
    source: "package",
    treatment_id: "treatment-deep-cleanse",
    treatment_item_text: "Deep Cleanse Package 7900",
    package_id: "package-deep-cleanse-7900"
  }),
  Object.freeze({
    value: "service-facial-lift-60",
    label: "Facial Lift 60 นาที",
    source: "service",
    treatment_id: "treatment-facial-lift-60",
    treatment_item_text: "Facial Lift 60 นาที",
    package_id: ""
  })
]);

const DEFAULT_MOCK_DRAFTS = Object.freeze([
  Object.freeze({
    id: "mock-draft-prep",
    status: "draft",
    source: "promo_receipt_draft",
    customer_full_name: "ลูกค้าทดลอง A",
    phone: "0812345678",
    branch_id: DEFAULT_BOOKING_BRANCH_ID,
    treatment_id: "treatment-smooth-3x",
    treatment_item_text: "Smooth 3x 3900",
    package_id: "",
    staff_name: "",
    scheduled_at: "",
    flow_metadata: {
      booking_option_value: "promo-receipt-smooth-3x-3900",
      booking_option_source: LIFF_RECEIPT_PROMO_OPTION_SOURCE,
      booking_channel: LIFF_RECEIPT_PROMO_BOOKING_CHANNEL
    },
    receipt_evidence: null,
    created_at: "2026-03-23T02:15:00.000Z",
    updated_at: "2026-03-24T04:00:00.000Z",
    submitted_at: ""
  }),
  Object.freeze({
    id: "mock-draft-ready",
    status: "draft",
    source: "promo_receipt_draft",
    customer_full_name: "ลูกค้าทดลอง B",
    phone: "0898765432",
    branch_id: DEFAULT_BOOKING_BRANCH_ID,
    treatment_id: "treatment-deep-cleanse",
    treatment_item_text: "Deep Cleanse Package 7900",
    package_id: "package-deep-cleanse-7900",
    staff_name: "โบว์",
    scheduled_at: "2026-03-29T14:30:00+07:00",
    flow_metadata: {
      booking_option_value: "package-deep-cleanse-7900",
      booking_option_source: "package"
    },
    receipt_evidence: null,
    created_at: "2026-03-23T08:30:00.000Z",
    updated_at: "2026-03-25T01:10:00.000Z",
    submitted_at: ""
  }),
  Object.freeze({
    id: "mock-draft-submitted",
    status: "submitted",
    source: "promo_receipt_draft",
    customer_full_name: "ลูกค้าทดลอง C",
    phone: "0861112233",
    branch_id: DEFAULT_BOOKING_BRANCH_ID,
    treatment_id: "treatment-facial-lift-60",
    treatment_item_text: "Facial Lift 60 นาที",
    package_id: "",
    staff_name: "ส้ม",
    scheduled_at: "2026-03-27T11:00:00+07:00",
    flow_metadata: {
      booking_option_value: "service-facial-lift-60",
      booking_option_source: "service"
    },
    receipt_evidence: {
      receipt_image_ref: "mock://receipt/mock-draft-submitted.jpg",
      receipt_number: "MOCK-20260325-001",
      receipt_line: "MOCK-20260325-001",
      total_amount_thb: 3900,
      ocr_status: "mock_success",
      verification_source: "bill_verification_modal"
    },
    created_at: "2026-03-21T03:00:00.000Z",
    updated_at: "2026-03-25T02:45:00.000Z",
    submitted_at: "2026-03-25T02:45:00.000Z"
  })
]);

class MockApiError extends Error {
  constructor(message, { status = 400, payload = null } = {}) {
    super(message);
    this.name = "MockApiError";
    this.status = status;
    this.payload = payload;
    this.code = payload?.code || "";
    this.details = payload?.details || null;
  }
}

const cloneValue = (value) => {
  if (value === undefined || value === null) {
    return value;
  }

  return JSON.parse(JSON.stringify(value));
};

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getStorage = () => {
  try {
    if (
      typeof window !== "undefined" &&
      window?.localStorage &&
      typeof window.localStorage.getItem === "function"
    ) {
      return window.localStorage;
    }
  } catch {
    return null;
  }

  return null;
};

const fallbackMemoryStorage = new Map();

const readPersistedJson = (key) => {
  const storage = getStorage();

  if (storage) {
    const rawValue = storage.getItem(key);

    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue);
    } catch {
      return null;
    }
  }

  return fallbackMemoryStorage.has(key)
    ? cloneValue(fallbackMemoryStorage.get(key))
    : null;
};

const writePersistedJson = (key, value) => {
  const clonedValue = cloneValue(value);
  const storage = getStorage();

  if (storage) {
    storage.setItem(key, JSON.stringify(clonedValue));
    return cloneValue(clonedValue);
  }

  fallbackMemoryStorage.set(key, clonedValue);
  return cloneValue(clonedValue);
};

const parseDateOnly = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimText(value));

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
};

const formatDateOnly = (value) =>
  [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0")
  ].join("-");

const addUtcDays = (date, days) => {
  const nextDate = new Date(date.getTime());
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
};

const createTimestamp = () => new Date().toISOString();

const createMockId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeBranchId = (value) =>
  normalizeCanonicalBranch(value).writeBranchId || DEFAULT_BOOKING_BRANCH_ID;

const extractDateFromScheduledAt = (value) => {
  const match = /^(\d{4}-\d{2}-\d{2})T/.exec(trimText(value));
  return match ? match[1] : "";
};

const extractTimeFromScheduledAt = (value) => {
  const match = /^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})/.exec(trimText(value));
  return match ? match[1] : "";
};

const sanitizeObject = (value) => (isPlainObject(value) ? cloneValue(value) : null);

const normalizeDraftRecord = (value, currentDraft = null) => {
  const now = createTimestamp();
  const normalizedStatus = trimText(value?.status || "draft");

  return {
    id: trimText(value?.id || currentDraft?.id) || createMockId("draft"),
    status: normalizedStatus || "draft",
    source: trimText(value?.source || "promo_receipt_draft") || "promo_receipt_draft",
    customer_full_name: trimText(value?.customer_full_name),
    phone: normalizePhoneDigits(value?.phone),
    branch_id: trimText(value?.branch_id),
    treatment_id: trimText(value?.treatment_id),
    treatment_item_text: trimText(value?.treatment_item_text),
    package_id: trimText(value?.package_id),
    staff_name: trimText(value?.staff_name),
    scheduled_at: trimText(value?.scheduled_at),
    flow_metadata: sanitizeObject(value?.flow_metadata),
    receipt_evidence: sanitizeObject(value?.receipt_evidence),
    created_at: trimText(currentDraft?.created_at) || now,
    updated_at: now,
    submitted_at:
      normalizedStatus === "submitted"
        ? trimText(value?.submitted_at || currentDraft?.submitted_at) || now
        : ""
  };
};

const getPersistedDrafts = () => {
  const storedValue = readPersistedJson(DRAFTS_STORAGE_KEY);

  if (Array.isArray(storedValue)) {
    return storedValue;
  }

  return writePersistedJson(DRAFTS_STORAGE_KEY, DEFAULT_MOCK_DRAFTS);
};

const saveDrafts = (drafts) => writePersistedJson(DRAFTS_STORAGE_KEY, drafts);

const getPersistedAppointments = () => {
  const storedValue = readPersistedJson(APPOINTMENTS_STORAGE_KEY);
  return Array.isArray(storedValue) ? storedValue : [];
};

const saveAppointments = (appointments) =>
  writePersistedJson(APPOINTMENTS_STORAGE_KEY, appointments);

const buildMockAppointmentRecord = (payload, overrides = {}) => {
  const scheduledAt = trimText(overrides?.scheduled_at || payload?.scheduled_at);

  return {
    id: trimText(overrides?.id) || createMockId("appointment"),
    draft_id: trimText(overrides?.draft_id || payload?.draft_id),
    status: trimText(overrides?.status || payload?.status || "booked") || "booked",
    customer_full_name: trimText(
      overrides?.customer_full_name || payload?.customer_full_name
    ),
    phone: normalizePhoneDigits(overrides?.phone || payload?.phone),
    branch_id: normalizeBranchId(overrides?.branch_id || payload?.branch_id),
    treatment_id: trimText(overrides?.treatment_id || payload?.treatment_id),
    treatment_item_text: trimText(
      overrides?.treatment_item_text || payload?.treatment_item_text
    ),
    package_id: trimText(overrides?.package_id || payload?.package_id),
    staff_name: trimText(overrides?.staff_name || payload?.staff_name),
    scheduled_at: scheduledAt,
    visit_date: extractDateFromScheduledAt(scheduledAt),
    bookingTime: extractTimeFromScheduledAt(scheduledAt),
    receipt_evidence: sanitizeObject(
      overrides?.receipt_evidence || payload?.receipt_evidence
    ),
    created_at: trimText(overrides?.created_at) || createTimestamp(),
    updated_at: createTimestamp()
  };
};

const upsertAppointmentRecord = (appointment) => {
  const existingAppointments = getPersistedAppointments();
  const nextAppointments = existingAppointments.some(
    (item) => item.id === appointment.id
  )
    ? existingAppointments.map((item) =>
        item.id === appointment.id ? appointment : item
      )
    : [appointment, ...existingAppointments];

  saveAppointments(nextAppointments);
  return cloneValue(appointment);
};

const buildSubmittedDraftError = (message, options) =>
  new MockApiError(message, {
    status: options?.status,
    payload: {
      message,
      ...(options?.payload || {})
    }
  });

export const listMockAppointmentDrafts = async () =>
  cloneValue(getPersistedDrafts());

export const createMockAppointmentDraft = async (payload) => {
  const nextDraft = normalizeDraftRecord(payload);
  const existingDrafts = getPersistedDrafts();
  saveDrafts([nextDraft, ...existingDrafts]);

  return {
    draft: cloneValue(nextDraft)
  };
};

export const getMockAppointmentDraft = async (id) => {
  const draftId = trimText(id);
  const draft = getPersistedDrafts().find((item) => item.id === draftId);

  if (!draft) {
    throw buildSubmittedDraftError("ไม่พบข้อมูลร่างนี้แล้ว กรุณาเริ่มบันทึกใหม่", {
      status: 404
    });
  }

  return {
    draft: cloneValue(draft)
  };
};

export const updateMockAppointmentDraft = async (id, payload) => {
  const draftId = trimText(id);
  const existingDrafts = getPersistedDrafts();
  const currentDraft = existingDrafts.find((item) => item.id === draftId);

  if (!currentDraft) {
    throw buildSubmittedDraftError("ไม่พบข้อมูลร่างนี้แล้ว กรุณาเริ่มบันทึกใหม่", {
      status: 404
    });
  }

  if (trimText(currentDraft.status).toLowerCase() === "submitted") {
    throw buildSubmittedDraftError("Draft already submitted", {
      status: 409
    });
  }

  if (trimText(currentDraft.status).toLowerCase() === "cancelled") {
    throw buildSubmittedDraftError("Draft already cancelled", {
      status: 409
    });
  }

  const nextDraft = normalizeDraftRecord(
    {
      ...currentDraft,
      ...(payload || {})
    },
    currentDraft
  );
  const nextDrafts = existingDrafts.map((item) =>
    item.id === draftId ? nextDraft : item
  );

  saveDrafts(nextDrafts);

  return {
    draft: cloneValue(nextDraft)
  };
};

export const submitMockAppointmentDraft = async (id) => {
  const draftId = trimText(id);
  const existingDrafts = getPersistedDrafts();
  const currentDraft = existingDrafts.find((item) => item.id === draftId);

  if (!currentDraft) {
    throw buildSubmittedDraftError("ไม่พบข้อมูลร่างนี้แล้ว กรุณาเริ่มบันทึกใหม่", {
      status: 404
    });
  }

  if (trimText(currentDraft.status).toLowerCase() === "submitted") {
    throw buildSubmittedDraftError("Draft already submitted", {
      status: 409
    });
  }

  if (trimText(currentDraft.status).toLowerCase() === "cancelled") {
    throw buildSubmittedDraftError("Draft already cancelled", {
      status: 409
    });
  }

  const readiness = getAppointmentDraftReadiness(currentDraft);

  if (!readiness.isReadyToSubmit) {
    throw new MockApiError("Draft is incomplete", {
      status: 422,
      payload: {
        message: "Draft is incomplete",
        details: {
          missing_fields: readiness.missingFields
        }
      }
    });
  }

  const nextDraft = normalizeDraftRecord(
    {
      ...currentDraft,
      status: "submitted",
      submitted_at: createTimestamp()
    },
    currentDraft
  );
  const nextDrafts = existingDrafts.map((item) =>
    item.id === draftId ? nextDraft : item
  );

  saveDrafts(nextDrafts);

  const appointment = upsertAppointmentRecord(
    buildMockAppointmentRecord(nextDraft, {
      draft_id: nextDraft.id,
      status: "booked",
      created_at: nextDraft.created_at
    })
  );

  return {
    draft: cloneValue(nextDraft),
    appointment
  };
};

export const getMockBookingOptions = async ({
  channel = LIFF_RECEIPT_PROMO_BOOKING_CHANNEL
} = {}) => ({
  options: cloneValue(DEFAULT_MOCK_BOOKING_OPTIONS),
  meta: {
    active: true,
    booking_channel:
      trimText(channel) || LIFF_RECEIPT_PROMO_BOOKING_CHANNEL,
    active_from: "2026-01-01T00:00:00.000Z",
    active_until: "2026-12-31T23:59:59.000Z",
    source: "mock_mode"
  }
});

export const getMockCalendarDays = async ({ from, to, branchValue } = {}) => {
  const startDate = parseDateOnly(from);
  const endDate = parseDateOnly(to);

  if (!startDate || !endDate || startDate > endDate) {
    return [];
  }

  const branchId = normalizeBranchId(branchValue);
  const branchBias = branchId === DEFAULT_BOOKING_BRANCH_ID ? 1 : 2;
  const days = [];

  for (
    let currentDate = new Date(startDate.getTime());
    currentDate <= endDate;
    currentDate = addUtcDays(currentDate, 1)
  ) {
    const dayIndex = Math.floor((currentDate - startDate) / DAY_IN_MS);
    const weekDay = currentDate.getUTCDay();
    const count =
      weekDay === 0
        ? 0
        : ((dayIndex + branchBias) % 4) + (weekDay === 6 ? 0 : 1);

    if (count <= 0 || (dayIndex + branchBias) % 2 !== 0) {
      continue;
    }

    days.push({
      date: formatDateOnly(currentDate),
      count
    });
  }

  return days;
};

const buildBaseQueueRows = (date, branchId) => {
  const parsedDate = parseDateOnly(date);

  if (!parsedDate) {
    return [];
  }

  const dateSeed = parsedDate.getUTCDate();
  const baseTimes =
    dateSeed % 2 === 0
      ? ["10:00", "13:30", "16:00"]
      : ["11:00", "14:30", "17:00"];

  return baseTimes.map((bookingTime, index) => ({
    id: `mock-queue-${date}-${index}`,
    branch_id: branchId,
    status: index === 1 ? "rescheduled" : "booked",
    bookingTime,
    scheduled_at: buildScheduledAt(date, bookingTime)
  }));
};

export const getMockAppointmentsQueue = async ({
  date,
  branchValue,
  limit
} = {}) => {
  const targetDate = trimText(date);

  if (!targetDate) {
    return [];
  }

  const normalizedBranch = normalizeCanonicalBranch(branchValue);
  const branchId = normalizedBranch.writeBranchId || DEFAULT_BOOKING_BRANCH_ID;
  const baseRows = buildBaseQueueRows(targetDate, branchId);
  const persistedRows = getPersistedAppointments()
    .filter((item) => {
      if (trimText(item.visit_date) !== targetDate) {
        return false;
      }

      if (!normalizedBranch.writeBranchId) {
        return true;
      }

      return trimText(item.branch_id) === normalizedBranch.writeBranchId;
    })
    .map((item) => ({
      id: item.id,
      branch_id: item.branch_id,
      status: item.status || "booked",
      bookingTime: item.bookingTime,
      scheduled_at: item.scheduled_at
    }));

  const rows = [...persistedRows, ...baseRows];

  if (Number.isFinite(Number(limit)) && Number(limit) > 0) {
    return rows.slice(0, Number(limit));
  }

  return rows;
};

export const createMockAppointment = async (payload) => {
  const appointment = upsertAppointmentRecord(buildMockAppointmentRecord(payload));

  return {
    appointment
  };
};

export { MockApiError };
