import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AppointmentsApiError,
  createAppointment,
  getAppointmentsQueue,
  getBookingOptions,
  getCalendarDays
} from "../services/appointmentsService";
import {
  buildCanonicalAppointmentDraftCreatePayload,
  buildCanonicalAppointmentDraftPatchPayload,
  buildCanonicalAppointmentCreatePayload,
  collectOccupiedTimesFromQueueRows,
  isPlainObject,
  normalizePhoneDigits,
  trimText
} from "../services/appointmentContract";
import {
  AppointmentDraftApiError,
  createAppointmentDraft,
  submitAppointmentDraft,
  updateAppointmentDraft
} from "../services/appointmentDraftService";
import {
  getBookingBranchOptions
} from "../services/branchCatalog";
import { normalizeCanonicalBranch } from "../services/branchContract";
import {
  buildAppointmentDraftReadinessRecord,
  getAppointmentDraftDisplayStatus
} from "../services/appointmentDraftReadiness";
import {
  processReceiptImage,
  ReceiptOcrApiError
} from "../services/receiptOcrService";
import { buildTimeUtc, buildVersion } from "../config/env";
import "./NewBillRecipientModal.css";

const recipientFields = [
  { id: "recipient-name", key: "name", label: "ชื่อ-นามสกุล" },
  { id: "recipient-phone", key: "phone", label: "เบอร์โทร" }
];

const providerOptions = ["โบว์", "ส้ม", "แพร", "ขิม", "มายด์"];

const SHOP_TIME_ZONE = "Asia/Bangkok";
const DEFAULT_CALENDAR_RANGE_DAYS = 60;
const CALENDAR_LOOKAHEAD_DAYS = 31;
const CREATE_SUCCESS_CLOSE_DELAY_MS = 1400;

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SHOP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: SHOP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const createInitialFormValues = (defaultBranchId = "") => ({
  name: "",
  phone: "",
  branchId: defaultBranchId,
  bookingOptionValue: "",
  bookingDateText: "",
  bookingDatePicker: "",
  bookingTimeText: "",
  bookingTimePicker: "",
  provider: ""
});

const createEmptyBookingSelection = () => ({
  optionValue: "",
  label: "",
  source: "",
  treatmentId: "",
  treatmentItemText: "",
  packageId: ""
});

const extractDraftBookingOptionValue = (draft) =>
  trimText(draft?.flow_metadata?.booking_option_value);

const extractDraftBookingOptionSource = (draft) =>
  trimText(draft?.flow_metadata?.booking_option_source);

const formatDateParts = (date) => {
  const parts = dateFormatter.formatToParts(date);

  return parts.reduce(
    (accumulator, part) =>
      part.type === "year" || part.type === "month" || part.type === "day"
        ? {
            ...accumulator,
            [part.type]: part.value
          }
        : accumulator,
    {}
  );
};

const getBangkokDateString = (date = new Date()) => {
  const { year, month, day } = formatDateParts(date);
  return `${year}-${month}-${day}`;
};

const getBangkokTimeString = (date = new Date()) =>
  timeFormatter.format(date).slice(0, 5);

const addDaysToDateString = (value, days) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return value;
  }

  const [, year, month, day] = match;
  const utcDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);

  return [
    utcDate.getUTCFullYear(),
    String(utcDate.getUTCMonth() + 1).padStart(2, "0"),
    String(utcDate.getUTCDate()).padStart(2, "0")
  ].join("-");
};

const formatTimeList = (times, maxItems = 6) => {
  if (!times.length) {
    return "";
  }

  const visibleTimes = times.slice(0, maxItems).join(", ");

  if (times.length <= maxItems) {
    return visibleTimes;
  }

  return `${visibleTimes} และอีก ${times.length - maxItems} ช่วงเวลา`;
};

const toBookingSelection = (option) => ({
  optionValue: trimText(option?.value),
  label: trimText(option?.label),
  source: trimText(option?.source),
  treatmentId: trimText(option?.treatment_id),
  treatmentItemText: trimText(option?.treatment_item_text),
  packageId: trimText(option?.package_id)
});

const formatDateText = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const formatTimeText = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

const formatDisplayDateFromPicker = (value) => {
  if (!value) {
    return "";
  }

  const [year, month, day] = value.split("-");
  return [day, month, year].filter(Boolean).join("/");
};

const formatPickerDateFromDisplay = (value) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);

  if (!match) {
    return "";
  }

  const [, day, month, year] = match;
  const dayNumber = Number(day);
  const monthNumber = Number(month);

  if (
    Number.isNaN(dayNumber) ||
    Number.isNaN(monthNumber) ||
    dayNumber < 1 ||
    dayNumber > 31 ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    return "";
  }

  return `${year}-${month}-${day}`;
};

const formatPickerTimeFromDisplay = (value) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return "";
  }

  const [, hours, minutes] = match;
  const hourNumber = Number(hours);
  const minuteNumber = Number(minutes);

  if (
    Number.isNaN(hourNumber) ||
    Number.isNaN(minuteNumber) ||
    hourNumber > 23 ||
    minuteNumber > 59
  ) {
    return "";
  }

  return `${hours}:${minutes}`;
};

const getDraftScheduledAtParts = (scheduledAt) => {
  if (!trimText(scheduledAt)) {
    return {
      bookingDateText: "",
      bookingDatePicker: "",
      bookingTimeText: "",
      bookingTimePicker: ""
    };
  }

  const parsedDate = new Date(scheduledAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return {
      bookingDateText: "",
      bookingDatePicker: "",
      bookingTimeText: "",
      bookingTimePicker: ""
    };
  }

  const bookingDatePicker = getBangkokDateString(parsedDate);
  const bookingTimePicker = getBangkokTimeString(parsedDate);

  return {
    bookingDateText: formatDisplayDateFromPicker(bookingDatePicker),
    bookingDatePicker,
    bookingTimeText: bookingTimePicker,
    bookingTimePicker
  };
};

const createFormValuesFromDraft = (draft, defaultBranchId = "") => ({
  ...createInitialFormValues(defaultBranchId),
  ...getDraftScheduledAtParts(draft?.scheduled_at),
  name: trimText(draft?.customer_full_name),
  phone: trimText(draft?.phone),
  branchId: trimText(draft?.branch_id) || defaultBranchId,
  bookingOptionValue: extractDraftBookingOptionValue(draft),
  provider: trimText(draft?.staff_name)
});

const createBookingSelectionFromDraft = (draft) => ({
  optionValue: extractDraftBookingOptionValue(draft),
  label: trimText(draft?.treatment_item_text),
  source: extractDraftBookingOptionSource(draft),
  treatmentId: trimText(draft?.treatment_id),
  treatmentItemText: trimText(draft?.treatment_item_text),
  packageId: trimText(draft?.package_id)
});

const createReceiptOcrResultFromDraft = (draft) => {
  const receiptEvidence = isPlainObject(draft?.receipt_evidence)
    ? draft.receipt_evidence
    : null;

  if (!receiptEvidence) {
    return null;
  }

  const totalAmountValue =
    typeof receiptEvidence.total_amount_thb === "number" &&
    Number.isFinite(receiptEvidence.total_amount_thb)
      ? receiptEvidence.total_amount_thb
      : null;

  return {
    source: "api",
    rawText: trimText(receiptEvidence.ocr_raw_text),
    ocrText: trimText(receiptEvidence.ocr_raw_text),
    receiptLine:
      trimText(receiptEvidence.receipt_line) ||
      trimText(receiptEvidence.receipt_number) ||
      "ไม่พบเลขที่ใบเสร็จ",
    receiptLines: trimText(receiptEvidence.ocr_raw_text)
      ? trimText(receiptEvidence.ocr_raw_text).split(/\r?\n/).filter(Boolean)
      : [],
    totalAmount:
      totalAmountValue === null
        ? "ไม่พบราคาสินค้า"
        : `${totalAmountValue} THB`,
    totalAmountValue,
    receiptDate: "",
    receiptTime: "",
    merchant: "",
    merchantName: "",
    receiptNumber: trimText(receiptEvidence.receipt_number),
    receiptIdentifier: trimText(receiptEvidence.receipt_identifier),
    receiptImageRef: trimText(receiptEvidence.receipt_image_ref),
    ocrStatus: trimText(receiptEvidence.ocr_status),
    ocrMetadata: isPlainObject(receiptEvidence.ocr_metadata)
      ? receiptEvidence.ocr_metadata
      : null,
    errorCode: "",
    errorMessage: "",
    statusNote: ""
  };
};

const getReceiptErrorMessage = (error) => {
  if (error instanceof ReceiptOcrApiError) {
    if (error.reason === "route_not_found") {
      return "Backend ปลายทางนี้ยังไม่มี route /api/ocr/receipt กรุณาตรวจสอบ OCR base URL หรือ deployment ของ backend";
    }

    if (error.reason === "network_error") {
      return "เชื่อมต่อ backend OCR ไม่ได้ กรุณาตรวจสอบเครือข่ายหรือ CORS แล้วลองใหม่";
    }

    if (error.reason === "timeout") {
      return "OCR request ใช้เวลานานเกินกำหนด กรุณาลองใหม่หรือตรวจสอบ downstream OCR service";
    }

    if (error.reason === "service_unavailable") {
      return "OCR downstream service ยังไม่พร้อมใช้งาน แม้ backend route จะตอบแล้ว กรุณาตรวจสอบ Python OCR service";
    }

    if (error.reason === "malformed_response") {
      return "OCR backend ตอบกลับมาไม่ครบ จึงยังอ่านข้อมูลใบเสร็จไม่ได้";
    }

    if (error.reason === "auth_required") {
      return "ยังไม่ได้เข้าสู่ระบบพนักงาน จึงเรียก OCR backend ไม่ได้";
    }

    return error.message || "ไม่สามารถอ่านข้อมูลจากใบเสร็จได้ ลองใช้รูปใหม่อีกครั้ง";
  }

  return error?.message || "ไม่สามารถอ่านข้อมูลจากใบเสร็จได้ ลองใช้รูปใหม่อีกครั้ง";
};

const formatBuildStamp = () => {
  const normalizedVersion = trimText(buildVersion) || "unversioned";
  const shortVersion =
    normalizedVersion.length > 14
      ? normalizedVersion.slice(0, 7)
      : normalizedVersion;
  const normalizedBuildTime = trimText(buildTimeUtc);

  if (!normalizedBuildTime) {
    return `UI build ${shortVersion}`;
  }

  return `UI build ${shortVersion} | ${normalizedBuildTime}`;
};

const getBookingOptionsErrorMessage = (error) => {
  if (error instanceof AppointmentsApiError && error.status === 401) {
    return "ยังไม่ได้เข้าสู่ระบบพนักงาน กรุณาเข้าสู่ระบบใหม่";
  }

  return "โหลดรายการบริการไม่สำเร็จ กรุณาลองใหม่";
};

const getCalendarDaysErrorMessage = (error) => {
  if (error instanceof AppointmentsApiError && error.status === 401) {
    return "ยังไม่ได้เข้าสู่ระบบพนักงาน จึงโหลดข้อมูลปฏิทินไม่ได้";
  }

  return "โหลดข้อมูลปฏิทินไม่สำเร็จ ระบบจะตรวจสอบอีกครั้งตอนบันทึก";
};

const getQueueErrorMessage = (error) => {
  if (error instanceof AppointmentsApiError && error.status === 401) {
    return "ยังไม่ได้เข้าสู่ระบบพนักงาน จึงตรวจสอบคิวปัจจุบันไม่ได้";
  }

  return "โหลดข้อมูลคิวปัจจุบันไม่สำเร็จ ระบบจะตรวจสอบอีกครั้งตอนบันทึก";
};

const getCreateAppointmentErrorMessage = (error) => {
  if (!(error instanceof AppointmentsApiError)) {
    return "ไม่สามารถบันทึกการจองได้ กรุณาลองใหม่อีกครั้ง";
  }

  const details = isPlainObject(error.details) ? error.details : null;
  const message = trimText(error.message);
  const messageLower = message.toLowerCase();

  if (error.status === 401 || error.status === 403) {
    return "ยังไม่ได้เข้าสู่ระบบพนักงาน กรุณาเข้าสู่ระบบใหม่";
  }

  if (error.status === 409) {
    return "ช่วงเวลานี้ถูกจองไปแล้ว กรุณาเลือกวันหรือเวลาใหม่";
  }

  if (error.status === 400) {
    if (
      details?.scheduled_at ||
      details?.visit_date ||
      details?.visit_time_text ||
      /scheduled_at|date|time|datetime/.test(messageLower)
    ) {
      return "วันเวลาที่เลือกไม่ถูกต้อง กรุณาตรวจสอบใหม่";
    }

    if (details?.branch_id || /branch/.test(messageLower)) {
      return "สาขาที่เลือกไม่ถูกต้อง กรุณาเลือกใหม่";
    }

    if (details?.receipt_evidence || /receipt/.test(messageLower)) {
      return "ข้อมูลใบเสร็จยังไม่ถูกต้องหรือยังไม่ครบ จึงแนบหลักฐานไม่ได้";
    }

    if (details?.phone || /phone/.test(messageLower)) {
      return "เบอร์โทรไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
    }

    if (details?.treatment_id || details?.package_id || /treatment|package/.test(messageLower)) {
      return "ข้อมูลบริการไม่ถูกต้อง กรุณาเลือกบริการใหม่";
    }

    return message || "ข้อมูลไม่ครบหรือไม่ถูกต้อง กรุณาตรวจสอบใหม่";
  }

  if (error.status === 422) {
    if (details?.package_id || /package/.test(messageLower)) {
      return "บริการที่เลือกต้องใช้แพ็กเกจที่ถูกต้อง กรุณาเลือกบริการใหม่";
    }

    if (/customer|phone/.test(messageLower)) {
      return "ไม่สามารถจับคู่ข้อมูลลูกค้าจากเบอร์โทรนี้ได้ กรุณาตรวจสอบอีกครั้ง";
    }

    if (/treatment/.test(messageLower)) {
      return "ระบบไม่สามารถจับคู่บริการที่เลือกได้ กรุณาเลือกใหม่";
    }

    return message || "ระบบไม่สามารถบันทึกการจองชุดนี้ได้ กรุณาตรวจสอบข้อมูลอีกครั้ง";
  }

  if (error.status === 500) {
    if (error.code === "SSOT_STAFF_MISSING" || /ssot_staff_missing|staff/.test(messageLower)) {
      return "ไม่พบข้อมูลผู้ให้บริการในระบบ กรุณาเลือกผู้ให้บริการใหม่หรือติดต่อแอดมิน";
    }

    return "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง";
  }

  return message || "ไม่สามารถบันทึกการจองได้ กรุณาลองใหม่อีกครั้ง";
};

const getDraftActionErrorMessage = (error) => {
  const status = typeof error?.status === "number" ? error.status : 0;
  const details = isPlainObject(error?.details) ? error.details : null;
  const message = trimText(error?.message);
  const messageLower = message.toLowerCase();

  if (status === 401 || status === 403) {
    return "ยังไม่ได้เข้าสู่ระบบพนักงาน กรุณาเข้าสู่ระบบใหม่";
  }

  if (status === 404) {
    return "ไม่พบข้อมูลร่างนี้แล้ว กรุณาเริ่มบันทึกใหม่";
  }

  if (status === 409) {
    if (/submitted/.test(messageLower)) {
      return "ร่างนี้ถูกยืนยันจองไปแล้ว";
    }

    if (/cancelled/.test(messageLower)) {
      return "ร่างนี้ถูกยกเลิกแล้ว ไม่สามารถยืนยันจองได้";
    }

    return "ไม่สามารถทำรายการกับร่างนี้ได้ กรุณาตรวจสอบสถานะอีกครั้ง";
  }

  if (status === 422) {
    if (Array.isArray(details?.missing_fields) && details.missing_fields.length) {
      return `ร่างนี้ยังขาดข้อมูลก่อนยืนยันนัด: ${details.missing_fields.join(", ")}`;
    }

    return message || "ข้อมูลร่างยังไม่ครบสำหรับยืนยันนัด";
  }

  if (status === 400) {
    if (/no changes detected/.test(messageLower)) {
      return "ข้อมูลร่างยังไม่เปลี่ยนแปลง";
    }

    if (/scheduled_at|date|time|datetime/.test(messageLower)) {
      return "วันเวลาที่เลือกสำหรับร่างไม่ถูกต้อง กรุณาตรวจสอบใหม่";
    }

    if (details?.branch_id || /branch/.test(messageLower)) {
      return "สาขาที่เลือกสำหรับร่างไม่ถูกต้อง กรุณาเลือกใหม่";
    }

    if (details?.receipt_evidence || /receipt/.test(messageLower)) {
      return "ข้อมูลใบเสร็จของร่างยังไม่ถูกต้อง กรุณาตรวจสอบใหม่";
    }

    if (details?.phone || /phone/.test(messageLower)) {
      return "เบอร์โทรสำหรับร่างไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
    }

    if (details?.treatment_id || details?.package_id || /treatment|package/.test(messageLower)) {
      return "ข้อมูลบริการของร่างไม่ถูกต้อง กรุณาเลือกใหม่";
    }

    if (details?.flow_metadata || /flow_metadata/.test(messageLower)) {
      return "ข้อมูลประกอบของร่างไม่ถูกต้อง กรุณาลองใหม่";
    }

    return message || "ไม่สามารถบันทึกร่างได้ กรุณาตรวจสอบข้อมูลอีกครั้ง";
  }

  if (error instanceof AppointmentDraftApiError) {
    return message || "ไม่สามารถบันทึกร่างได้ กรุณาลองใหม่อีกครั้ง";
  }

  return message || "ไม่สามารถบันทึกร่างได้ กรุณาลองใหม่อีกครั้ง";
};

const getCreateSuccessMessage = ({
  response,
  requestedReceiptEvidence,
  hadReceiptAttempt
}) => {
  if (response?.receipt_evidence) {
    return "บันทึกนัดหมายและแนบข้อมูลใบเสร็จแล้ว";
  }

  if (requestedReceiptEvidence) {
    return "บันทึกนัดหมายแล้ว แต่ระบบยังไม่ยืนยันการแนบข้อมูลใบเสร็จ";
  }

  if (hadReceiptAttempt) {
    return "บันทึกนัดหมายแล้ว แต่ยังไม่มีข้อมูลใบเสร็จที่รองรับสำหรับแนบ";
  }

  return "บันทึกนัดหมายแล้ว";
};

const getSelectionSubnote = (bookingSelection) => {
  if (!bookingSelection.optionValue) {
    return "";
  }

  if (bookingSelection.packageId) {
    return "เก็บค่า treatment_id และ package_id จาก booking options แล้ว";
  }

  return "เก็บค่า treatment_id จาก booking options แล้ว";
};

const renderRequiredLabel = (label) => (
  <>
    {label}
    <span className="new-bill-recipient-modal__required" aria-hidden="true">
      *
    </span>
  </>
);

function NewBillRecipientModal({
  open,
  onClose,
  defaultBranchId = "",
  onDraftChange,
  initialDraft = null
}) {
  const buildStamp = formatBuildStamp();
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const submitCloseTimerRef = useRef(null);
  const submitRequestIdRef = useRef(0);
  const [formValues, setFormValues] = useState(() =>
    createInitialFormValues(defaultBranchId)
  );
  const [bookingSelection, setBookingSelection] = useState(() =>
    createEmptyBookingSelection()
  );
  const [receiptStage, setReceiptStage] = useState("idle");
  const [selectedReceiptFile, setSelectedReceiptFile] = useState(null);
  const [selectedReceiptPreviewUrl, setSelectedReceiptPreviewUrl] = useState("");
  const [receiptOcrResult, setReceiptOcrResult] = useState(null);
  const [receiptOcrError, setReceiptOcrError] = useState("");
  const [bookingOptions, setBookingOptions] = useState([]);
  const [bookingOptionsStatus, setBookingOptionsStatus] = useState("idle");
  const [bookingOptionsError, setBookingOptionsError] = useState("");
  const [calendarDays, setCalendarDays] = useState([]);
  const [calendarDaysStatus, setCalendarDaysStatus] = useState("idle");
  const [calendarDaysError, setCalendarDaysError] = useState("");
  const [occupiedTimes, setOccupiedTimes] = useState([]);
  const [occupiedTimesStatus, setOccupiedTimesStatus] = useState("idle");
  const [occupiedTimesError, setOccupiedTimesError] = useState("");
  const [currentDraft, setCurrentDraft] = useState(null);
  const currentDraftId = trimText(currentDraft?.id);
  const [activeAction, setActiveAction] = useState("");
  const [submitStatus, setSubmitStatus] = useState("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  const clearSubmitCloseTimer = () => {
    if (submitCloseTimerRef.current) {
      clearTimeout(submitCloseTimerRef.current);
      submitCloseTimerRef.current = null;
    }
  };

  const clearSubmitFeedback = () => {
    setActiveAction("");
    setSubmitStatus("idle");
    setSubmitMessage("");
  };

  const publishDraftChange = (draft) => {
    if (typeof onDraftChange === "function" && draft) {
      onDraftChange(draft);
    }
  };

  const resetModalState = () => {
    setFormValues(createInitialFormValues(defaultBranchId));
    setBookingSelection(createEmptyBookingSelection());
    setReceiptStage("idle");
    setSelectedReceiptFile(null);
    setSelectedReceiptPreviewUrl("");
    setReceiptOcrResult(null);
    setReceiptOcrError("");
    setBookingOptions([]);
    setBookingOptionsStatus("idle");
    setBookingOptionsError("");
    setCalendarDays([]);
    setCalendarDaysStatus("idle");
    setCalendarDaysError("");
    setOccupiedTimes([]);
    setOccupiedTimesStatus("idle");
    setOccupiedTimesError("");
    setCurrentDraft(null);
    clearSubmitFeedback();
  };

  useEffect(() => {
    if (open) {
      return;
    }

    submitRequestIdRef.current += 1;
    clearSubmitCloseTimer();
    resetModalState();
  }, [defaultBranchId, open]);

  useEffect(
    () => () => {
      submitRequestIdRef.current += 1;
      clearSubmitCloseTimer();
    },
    []
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    if (open) {
      document.body.classList.add("modal-open");
      return () => {
        document.body.classList.remove("modal-open");
      };
    }

    document.body.classList.remove("modal-open");
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!defaultBranchId) {
      return;
    }

    setFormValues((current) =>
      current.branchId
        ? current
        : {
            ...current,
            branchId: defaultBranchId
          }
    );
  }, [defaultBranchId]);

  useEffect(() => {
    if (!open || !trimText(initialDraft?.id) || currentDraftId) {
      return;
    }

    const hydratedReceiptResult = createReceiptOcrResultFromDraft(initialDraft);

    clearSubmitCloseTimer();
    clearSubmitFeedback();
    setCurrentDraft(initialDraft);
    setFormValues(createFormValuesFromDraft(initialDraft, defaultBranchId));
    setBookingSelection(createBookingSelectionFromDraft(initialDraft));
    setSelectedReceiptFile(null);
    setSelectedReceiptPreviewUrl("");
    setReceiptOcrResult(hydratedReceiptResult);
    setReceiptOcrError("");
    setReceiptStage(hydratedReceiptResult ? "success" : "idle");
  }, [currentDraftId, defaultBranchId, initialDraft, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let isActive = true;
    setBookingOptionsStatus("loading");
    setBookingOptionsError("");

    const loadBookingOptions = async () => {
      try {
        const options = await getBookingOptions();

        if (!isActive) {
          return;
        }

        setBookingOptions(options);
        setBookingOptionsStatus("ready");
      } catch (error) {
        if (!isActive) {
          return;
        }

        setBookingOptions([]);
        setBookingOptionsStatus("error");
        setBookingOptionsError(getBookingOptionsErrorMessage(error));
        setBookingSelection(createEmptyBookingSelection());
        setFormValues((current) => ({
          ...current,
          bookingOptionValue: ""
        }));
      }
    };

    loadBookingOptions();

    return () => {
      isActive = false;
    };
  }, [open]);

  useEffect(() => {
    const hasHydratedDraftSelection =
      Boolean(currentDraftId) && Boolean(trimText(bookingSelection.treatmentId));

    if (!formValues.bookingOptionValue) {
      if (hasHydratedDraftSelection) {
        return;
      }

      setBookingSelection(createEmptyBookingSelection());
      return;
    }

    const selectedOption = bookingOptions.find(
      (option) => option.value === formValues.bookingOptionValue
    );

    if (selectedOption) {
      setBookingSelection(toBookingSelection(selectedOption));
      return;
    }

    if (hasHydratedDraftSelection) {
      return;
    }

    if (bookingOptionsStatus === "ready" || bookingOptionsStatus === "error") {
      setBookingSelection(createEmptyBookingSelection());
      setFormValues((current) =>
        current.bookingOptionValue
          ? {
              ...current,
              bookingOptionValue: ""
            }
          : current
      );
    }
  }, [
    bookingOptions,
    bookingOptionsStatus,
    bookingSelection.treatmentId,
    currentDraftId,
    formValues.bookingOptionValue
  ]);

  const bangkokToday = getBangkokDateString();
  const bangkokNowTime = getBangkokTimeString();
  const selectedDate = formValues.bookingDatePicker;
  const branchOptions = getBookingBranchOptions(formValues.branchId);
  const normalizedBranch = normalizeCanonicalBranch(formValues.branchId);
  const defaultCalendarRangeEnd = addDaysToDateString(
    bangkokToday,
    DEFAULT_CALENDAR_RANGE_DAYS
  );
  const calendarRangeEnd =
    selectedDate && selectedDate > defaultCalendarRangeEnd
      ? addDaysToDateString(selectedDate, CALENDAR_LOOKAHEAD_DAYS)
      : defaultCalendarRangeEnd;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let isActive = true;
    setCalendarDaysStatus("loading");
    setCalendarDaysError("");

    const loadCalendarDays = async () => {
      try {
        const days = await getCalendarDays({
          from: bangkokToday,
          to: calendarRangeEnd,
          branchValue: normalizedBranch.rawValue || undefined
        });

        if (!isActive) {
          return;
        }

        setCalendarDays(days);
        setCalendarDaysStatus("ready");
      } catch (error) {
        if (!isActive) {
          return;
        }

        setCalendarDays([]);
        setCalendarDaysStatus("error");
        setCalendarDaysError(getCalendarDaysErrorMessage(error));
      }
    };

    loadCalendarDays();

    return () => {
      isActive = false;
    };
  }, [
    open,
    bangkokToday,
    calendarRangeEnd,
    normalizedBranch.availabilityBranchId,
    normalizedBranch.availabilityMode
  ]);

  useEffect(() => {
    const canCheckQueue =
      open &&
      Boolean(trimText(formValues.branchId)) &&
      Boolean(selectedDate) &&
      selectedDate >= bangkokToday;

    if (!canCheckQueue) {
      setOccupiedTimes([]);
      setOccupiedTimesStatus("idle");
      setOccupiedTimesError("");
      return undefined;
    }

    let isActive = true;
    setOccupiedTimesStatus("loading");
    setOccupiedTimesError("");

    const loadOccupiedTimes = async () => {
      try {
        const rows = await getAppointmentsQueue({
          date: selectedDate,
          branchValue: normalizedBranch.rawValue || undefined
        });

        if (!isActive) {
          return;
        }

        setOccupiedTimes(collectOccupiedTimesFromQueueRows(rows, formValues.branchId));
        setOccupiedTimesStatus("ready");
      } catch (error) {
        if (!isActive) {
          return;
        }

        setOccupiedTimes([]);
        setOccupiedTimesStatus("error");
        setOccupiedTimesError(getQueueErrorMessage(error));
      }
    };

    loadOccupiedTimes();

    return () => {
      isActive = false;
    };
  }, [
    open,
    formValues.branchId,
    selectedDate,
    bangkokToday,
    normalizedBranch.availabilityBranchId,
    normalizedBranch.availabilityMode
  ]);

  useEffect(() => {
    if (!selectedReceiptFile || typeof URL === "undefined") {
      setSelectedReceiptPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedReceiptFile);
    setSelectedReceiptPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedReceiptFile]);

  const updateField = (key, value) => {
    clearSubmitFeedback();
    setFormValues((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleBookingOptionChange = (event) => {
    const bookingOptionValue = event.target.value;
    const selectedOption = bookingOptions.find(
      (option) => option.value === bookingOptionValue
    );

    clearSubmitFeedback();
    setFormValues((current) => ({
      ...current,
      bookingOptionValue
    }));
    setBookingSelection(
      selectedOption
        ? toBookingSelection(selectedOption)
        : createEmptyBookingSelection()
    );
  };

  const handleDateTextChange = (event) => {
    const bookingDateText = formatDateText(event.target.value);

    clearSubmitFeedback();
    setFormValues((current) => ({
      ...current,
      bookingDateText,
      bookingDatePicker: formatPickerDateFromDisplay(bookingDateText)
    }));
  };

  const handleDatePickerChange = (event) => {
    const bookingDatePicker = event.target.value;

    clearSubmitFeedback();
    setFormValues((current) => ({
      ...current,
      bookingDatePicker,
      bookingDateText: formatDisplayDateFromPicker(bookingDatePicker)
    }));
  };

  const handleTimeTextChange = (event) => {
    const bookingTimeText = formatTimeText(event.target.value);

    clearSubmitFeedback();
    setFormValues((current) => ({
      ...current,
      bookingTimeText,
      bookingTimePicker: formatPickerTimeFromDisplay(bookingTimeText)
    }));
  };

  const handleTimePickerChange = (event) => {
    const bookingTimePicker = event.target.value;

    clearSubmitFeedback();
    setFormValues((current) => ({
      ...current,
      bookingTimePicker,
      bookingTimeText: bookingTimePicker
    }));
  };

  const openGalleryPicker = () => {
    galleryInputRef.current?.click();
  };

  const openCameraPicker = () => {
    cameraInputRef.current?.click();
  };

  const handleUploadPanelKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openGalleryPicker();
    }
  };

  const handleReceiptFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile || !selectedFile.type.startsWith("image/")) {
      return;
    }

    clearSubmitFeedback();
    setSelectedReceiptFile(selectedFile);
    setReceiptStage("previewSelected");
    setReceiptOcrResult(null);
    setReceiptOcrError("");
  };

  const handleProcessReceipt = async () => {
    if (!selectedReceiptFile || receiptStage === "processing") {
      return;
    }

    clearSubmitFeedback();
    setReceiptStage("processing");
    setReceiptOcrError("");

    try {
      const result = await processReceiptImage(selectedReceiptFile);
      setReceiptOcrResult(result);
      setReceiptStage(result?.source === "mock" ? "mock" : "success");
    } catch (error) {
      setReceiptOcrResult(null);
      setReceiptOcrError(getReceiptErrorMessage(error));
      setReceiptStage("error");
    }
  };

  const renderReceiptIntakePanel = () => {
    if ((receiptStage === "success" || receiptStage === "mock") && receiptOcrResult) {
      return (
        <div className="new-bill-recipient-modal__receipt-summary">
          <div className="new-bill-recipient-modal__proof-tile">
            {selectedReceiptPreviewUrl ? (
              <img
                src={selectedReceiptPreviewUrl}
                alt="รูปใบเสร็จที่แนบไว้"
                className="new-bill-recipient-modal__proof-image"
              />
            ) : null}
            <div className="new-bill-recipient-modal__proof-label">
              <span>รูปภาพ</span>
              <span>หลักฐาน</span>
            </div>
          </div>

          <div className="new-bill-recipient-modal__receipt-details">
            <div className="new-bill-recipient-modal__receipt-row">
              <span className="new-bill-recipient-modal__receipt-key">
                เลขที่ใบเสร็จ :
              </span>
              <span className="new-bill-recipient-modal__receipt-value">
                {receiptOcrResult.receiptLine}
              </span>
            </div>
            <div className="new-bill-recipient-modal__receipt-row">
              <span className="new-bill-recipient-modal__receipt-key">
                ราคาสินค้า :
              </span>
              <span className="new-bill-recipient-modal__receipt-value">
                {receiptOcrResult.totalAmount}
              </span>
            </div>
            {receiptOcrResult.merchant ? (
              <div className="new-bill-recipient-modal__receipt-row">
                <span className="new-bill-recipient-modal__receipt-key">
                  ร้านค้า :
                </span>
                <span className="new-bill-recipient-modal__receipt-value">
                  {receiptOcrResult.merchant}
                </span>
              </div>
            ) : null}
            {receiptOcrResult.receiptDate || receiptOcrResult.receiptTime ? (
              <div className="new-bill-recipient-modal__receipt-row">
                <span className="new-bill-recipient-modal__receipt-key">
                  วันที่เวลา :
                </span>
                <span className="new-bill-recipient-modal__receipt-value">
                  {[receiptOcrResult.receiptDate, receiptOcrResult.receiptTime]
                    .filter(Boolean)
                    .join(" ")}
                </span>
              </div>
            ) : null}
            {receiptOcrResult.statusNote ? (
              <p className="new-bill-recipient-modal__receipt-note">
                {receiptOcrResult.statusNote}
              </p>
            ) : null}
          </div>

          <div className="new-bill-recipient-modal__retake-area">
            <button
              type="button"
              className="new-bill-recipient-modal__retake-button"
              onClick={openCameraPicker}
            >
              <span
                className="new-bill-recipient-modal__mini-camera"
                aria-hidden="true"
              />
              <span>ถ่ายรูปใหม่</span>
            </button>
            <button
              type="button"
              className="new-bill-recipient-modal__link-button"
              onClick={openGalleryPicker}
            >
              เลือกรูปจากคลัง
            </button>
          </div>
        </div>
      );
    }

    if (receiptStage === "processing") {
      return (
        <div className="new-bill-recipient-modal__upload-panel new-bill-recipient-modal__upload-panel--status">
          <div
            className="new-bill-recipient-modal__camera-icon"
            aria-hidden="true"
          >
            <span className="new-bill-recipient-modal__camera-top" />
            <span className="new-bill-recipient-modal__camera-lens" />
          </div>
          <h2
            id="new-bill-recipient-modal-title"
            className="new-bill-recipient-modal__title"
          >
            กำลังประมวลผลใบเสร็จ
          </h2>
          <p className="new-bill-recipient-modal__helper">
            กำลังเตรียมข้อมูล OCR สำหรับใบเสร็จที่เลือก
          </p>
        </div>
      );
    }

    if (
      (receiptStage === "previewSelected" || receiptStage === "error") &&
      selectedReceiptFile
    ) {
      return (
        <div className="new-bill-recipient-modal__upload-panel new-bill-recipient-modal__upload-panel--preview">
          <div className="new-bill-recipient-modal__preview-media">
            {selectedReceiptPreviewUrl ? (
              <img
                src={selectedReceiptPreviewUrl}
                alt="ตัวอย่างใบเสร็จก่อนยืนยัน"
                className="new-bill-recipient-modal__preview-image"
              />
            ) : null}
          </div>

          <div className="new-bill-recipient-modal__preview-content">
            <h2
              id="new-bill-recipient-modal-title"
              className="new-bill-recipient-modal__title"
            >
              {receiptStage === "error" ? "ลองใช้รูปใหม่" : "ยืนยันรูปใบเสร็จ"}
              <span className="new-bill-recipient-modal__required">***</span>
            </h2>
            <p className="new-bill-recipient-modal__helper">
              {receiptStage === "error"
                ? receiptOcrError
                : "ตรวจสอบรูปให้ชัดเจนก่อนเริ่มอ่านข้อมูลจากใบเสร็จ"}
            </p>
            <div className="new-bill-recipient-modal__upload-actions">
              <button
                type="button"
                className="new-bill-recipient-modal__upload-action new-bill-recipient-modal__upload-action--primary"
                onClick={handleProcessReceipt}
              >
                ใช้รูปนี้
              </button>
              <button
                type="button"
                className="new-bill-recipient-modal__upload-action"
                onClick={openCameraPicker}
              >
                ถ่ายรูปใหม่
              </button>
              <button
                type="button"
                className="new-bill-recipient-modal__upload-action"
                onClick={openGalleryPicker}
              >
                เลือกรูปใหม่
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className="new-bill-recipient-modal__upload-panel new-bill-recipient-modal__upload-panel--interactive"
        role="button"
        tabIndex={0}
        onClick={openGalleryPicker}
        onKeyDown={handleUploadPanelKeyDown}
      >
        <div
          className="new-bill-recipient-modal__camera-icon"
          aria-hidden="true"
        >
          <span className="new-bill-recipient-modal__camera-top" />
          <span className="new-bill-recipient-modal__camera-lens" />
        </div>

        <h2
          id="new-bill-recipient-modal-title"
          className="new-bill-recipient-modal__title"
        >
          ถ่ายรูปใบเสร็จ
          <span className="new-bill-recipient-modal__required">***</span>
        </h2>

        <p className="new-bill-recipient-modal__helper">
          แตะพื้นที่นี้เพื่อเลือกรูป หรือใช้ปุ่มด้านล่างเพื่อเปิดกล้องมือถือ
        </p>

        <div className="new-bill-recipient-modal__upload-actions new-bill-recipient-modal__upload-actions--picker">
          <button
            type="button"
            className="new-bill-recipient-modal__upload-action new-bill-recipient-modal__upload-action--primary"
            onClick={(event) => {
              event.stopPropagation();
              openCameraPicker();
            }}
          >
            เปิดกล้อง
          </button>
          <button
            type="button"
            className="new-bill-recipient-modal__upload-action"
            onClick={(event) => {
              event.stopPropagation();
              openGalleryPicker();
            }}
          >
            เลือกรูปจากคลัง
          </button>
        </div>
      </div>
    );
  };

  if (!open) {
    return null;
  }

  const selectionSubnote = getSelectionSubnote(bookingSelection);
  const isSelectedDatePast = Boolean(selectedDate && selectedDate < bangkokToday);
  const isTodaySelected = selectedDate === bangkokToday;
  const isSelectedTimePast = Boolean(
    isTodaySelected &&
      formValues.bookingTimePicker &&
      formValues.bookingTimePicker <= bangkokNowTime
  );
  const hasSelectedTimeConflict =
    Boolean(formValues.bookingTimePicker) &&
    occupiedTimes.includes(formValues.bookingTimePicker);
  const selectedCalendarDay =
    selectedDate && calendarDays.find((day) => day.date === selectedDate);
  const hasCalendarCoverage =
    Boolean(selectedDate) &&
    selectedDate >= bangkokToday &&
    selectedDate <= calendarRangeEnd;

  const dateValidationMessage =
    formValues.bookingDateText && !selectedDate
      ? "กรุณากรอกวันที่ให้ครบในรูปแบบ DD/MM/YYYY"
      : isSelectedDatePast
        ? "เลือกวันที่ปัจจุบันหรือวันถัดไปเท่านั้น"
        : "";

  const calendarHintMessage =
    !selectedDate || dateValidationMessage
      ? ""
      : calendarDaysStatus === "loading"
        ? "กำลังโหลดความหนาแน่นของคิวรายวัน..."
        : calendarDaysStatus === "error"
          ? calendarDaysError
          : hasCalendarCoverage
            ? selectedCalendarDay
              ? `วันที่เลือกมีคิวในระบบ ${selectedCalendarDay.count} รายการ ใช้เป็นข้อมูลช่วยเลือกวันเบื้องต้น`
              : "วันที่เลือกยังไม่พบคิวในข้อมูลปฏิทินช่วงที่โหลดไว้ ระบบจะตรวจสอบอีกครั้งตอนบันทึก"
            : "วันที่เลือกอยู่นอกช่วงข้อมูลปฏิทินที่โหลดไว้";

  const timeValidationMessage =
    formValues.bookingTimeText && !formValues.bookingTimePicker
      ? "กรุณากรอกเวลาให้ครบในรูปแบบ HH:MM"
      : isSelectedTimePast
        ? "เลือกเวลาหลังเวลาปัจจุบันตามเวลาไทย"
        : hasSelectedTimeConflict
          ? "เวลานี้มีคิวแล้วในข้อมูลคิวปัจจุบัน เลือกเวลาอื่นเพื่อลดโอกาสชนคิว"
          : "";

  const queueHintMessage =
    !selectedDate || dateValidationMessage
      ? ""
      : !trimText(formValues.branchId)
        ? "เลือกสาขาก่อนตรวจสอบเวลาที่มีคิวแล้ว"
        : occupiedTimesStatus === "loading"
          ? "กำลังตรวจสอบเวลาที่มีคิวแล้วจากข้อมูลคิวปัจจุบัน..."
          : occupiedTimesStatus === "error"
            ? occupiedTimesError
            : occupiedTimes.length
              ? `เวลาที่มีคิวแล้ว: ${formatTimeList(occupiedTimes)}`
              : "";

  const isActionBusy = submitStatus === "submitting";
  const isSubmitBusy =
    isActionBusy &&
    (activeAction === "booking-create" || activeAction === "draft-submit");
  const isDraftBusy = isActionBusy && activeAction === "draft-save";
  const isSubmitLocked =
    isActionBusy || (submitStatus === "success" && activeAction !== "draft-save");
  const isReceiptOcrResolved =
    receiptStage === "success" || receiptStage === "mock";
  const hasReceiptAttempt = Boolean(selectedReceiptFile);
  const currentDraftDisplayStatus = currentDraftId
    ? getAppointmentDraftDisplayStatus(
        buildAppointmentDraftReadinessRecord({
          formValues,
          bookingSelection,
          status: currentDraft?.status || "draft"
        })
      )
    : null;
  const currentDraftStatusNote = currentDraftDisplayStatus
    ? `สถานะร่างตอนนี้: ${currentDraftDisplayStatus.label}`
    : "";

  const getSubmitValidationMessage = () => {
    const customerFullName = trimText(formValues.name);
    const phoneDigits = normalizePhoneDigits(formValues.phone);

    if (receiptStage === "processing") {
      return "กรุณารอให้ระบบอ่านข้อมูลใบเสร็จให้เสร็จก่อน";
    }

    if (selectedReceiptFile && !isReceiptOcrResolved) {
      return "กรุณายืนยันข้อมูลใบเสร็จให้เสร็จก่อนบันทึก";
    }

    if (!customerFullName) {
      return "กรุณากรอกชื่อ-นามสกุล";
    }

    if (phoneDigits.length < 9) {
      return "กรุณากรอกเบอร์โทรอย่างน้อย 9 หลัก";
    }

    if (!trimText(formValues.branchId)) {
      return "กรุณาเลือกสาขา";
    }

    if (bookingOptionsStatus === "loading" && !bookingSelection.treatmentId) {
      return "กรุณารอโหลดรายการบริการให้เสร็จก่อน";
    }

    if (!bookingSelection.treatmentId) {
      return "กรุณาเลือกโปรโมชั่นหรือบริการ";
    }

    if (bookingSelection.source === "package" && !bookingSelection.packageId) {
      return "บริการที่เลือกยังไม่มีข้อมูลแพ็กเกจที่ถูกต้อง กรุณาเลือกใหม่";
    }

    if (!selectedDate) {
      return "กรุณาเลือกวันที่จอง";
    }

    if (dateValidationMessage) {
      return dateValidationMessage;
    }

    if (!formValues.bookingTimePicker) {
      return "กรุณาเลือกเวลาที่นัดหมาย";
    }

    if (timeValidationMessage) {
      return timeValidationMessage;
    }

    if (!trimText(formValues.provider)) {
      return "กรุณาเลือกผู้ให้บริการ";
    }

    return "";
  };

  const getDraftValidationMessage = () => {
    const customerFullName = trimText(formValues.name);
    const phoneDigits = normalizePhoneDigits(formValues.phone);

    if (receiptStage === "processing") {
      return "กรุณารอให้ระบบอ่านข้อมูลใบเสร็จให้เสร็จก่อน";
    }

    if (selectedReceiptFile && !isReceiptOcrResolved) {
      return "กรุณายืนยันข้อมูลใบเสร็จให้เสร็จก่อนบันทึกร่าง";
    }

    if (!customerFullName) {
      return "กรุณากรอกชื่อ-นามสกุลก่อนบันทึกร่าง";
    }

    if (phoneDigits.length < 9) {
      return "กรุณากรอกเบอร์โทรอย่างน้อย 9 หลักก่อนบันทึกร่าง";
    }

    if (!trimText(formValues.branchId)) {
      return "กรุณาเลือกสาขาก่อนบันทึกร่าง";
    }

    if (bookingOptionsStatus === "loading" && !bookingSelection.treatmentId) {
      return "กรุณารอโหลดรายการบริการให้เสร็จก่อน";
    }

    if (!bookingSelection.treatmentId) {
      return "กรุณาเลือกโปรโมชั่นหรือบริการก่อนบันทึกร่าง";
    }

    if (bookingSelection.source === "package" && !bookingSelection.packageId) {
      return "บริการที่เลือกยังไม่มีข้อมูลแพ็กเกจที่ถูกต้อง กรุณาเลือกใหม่";
    }

    return "";
  };

  const submitValidationMessage = getSubmitValidationMessage();
  const isFormComplete = !submitValidationMessage;
  const isSubmitDisabled = isSubmitLocked || !isFormComplete;
  const hasDiscardableData = Boolean(
    trimText(formValues.name) ||
      trimText(formValues.phone) ||
      (trimText(formValues.branchId) &&
        trimText(formValues.branchId) !== trimText(defaultBranchId)) ||
      trimText(formValues.bookingOptionValue) ||
      trimText(formValues.bookingDateText) ||
      trimText(formValues.bookingDatePicker) ||
      trimText(formValues.bookingTimeText) ||
      trimText(formValues.bookingTimePicker) ||
      trimText(formValues.provider) ||
      trimText(bookingSelection.treatmentId) ||
      selectedReceiptFile ||
      receiptOcrResult ||
      receiptStage !== "idle" ||
      currentDraftId
  );

  const handleRequestClose = () => {
    if (isActionBusy) {
      return;
    }

    if (
      hasDiscardableData &&
      typeof window !== "undefined" &&
      typeof window.confirm === "function"
    ) {
      const confirmed = window.confirm(
        "ยืนยันการยกเลิกหรือไม่ ข้อมูลที่กรอกไว้จะหายไป"
      );

      if (!confirmed) {
        return;
      }
    }

    onClose();
  };

  const handleSaveDraft = async () => {
    if (isActionBusy) {
      return;
    }

    const validationMessage = getDraftValidationMessage();

    if (validationMessage) {
      setActiveAction("draft-save");
      setSubmitStatus("error");
      setSubmitMessage(validationMessage);
      return;
    }

    const submitRequestId = submitRequestIdRef.current + 1;
    submitRequestIdRef.current = submitRequestId;
    clearSubmitCloseTimer();
    setActiveAction("draft-save");
    setSubmitStatus("submitting");
    setSubmitMessage("");

    try {
      let response = null;

      if (currentDraftId) {
        const { payload } = buildCanonicalAppointmentDraftPatchPayload({
          formValues,
          bookingSelection,
          receiptOcrResult,
          currentDraft
        });

        if (!Object.keys(payload).length) {
          if (submitRequestIdRef.current !== submitRequestId) {
            return;
          }

          setSubmitStatus("success");
          setSubmitMessage("ข้อมูลร่างยังไม่เปลี่ยนแปลง");
          return;
        }

        response = await updateAppointmentDraft(currentDraftId, payload);
      } else {
        const { payload } = buildCanonicalAppointmentDraftCreatePayload({
          formValues,
          bookingSelection,
          receiptOcrResult
        });

        response = await createAppointmentDraft(payload);
      }

      if (submitRequestIdRef.current !== submitRequestId) {
        return;
      }

      const nextDraft = response?.draft || null;

      if (nextDraft) {
        setCurrentDraft(nextDraft);
        publishDraftChange(nextDraft);
      }

      setSubmitStatus("success");
      setSubmitMessage(currentDraftId ? "อัปเดตร่างแล้ว" : "บันทึกร่างแล้ว");
    } catch (error) {
      if (submitRequestIdRef.current !== submitRequestId) {
        return;
      }

      setSubmitStatus("error");
      setSubmitMessage(getDraftActionErrorMessage(error));
    }
  };

  const handleSubmit = async () => {
    if (isSubmitDisabled) {
      return;
    }

    const validationMessage = submitValidationMessage;

    if (validationMessage) {
      setActiveAction(currentDraftId ? "draft-submit" : "booking-create");
      setSubmitStatus("error");
      setSubmitMessage(validationMessage);
      return;
    }

    const submitRequestId = submitRequestIdRef.current + 1;
    submitRequestIdRef.current = submitRequestId;
    clearSubmitCloseTimer();
    setActiveAction(currentDraftId ? "draft-submit" : "booking-create");
    setSubmitStatus("submitting");
    setSubmitMessage("");

    try {
      let response = null;
      let requestedReceiptEvidence = null;

      if (currentDraftId) {
        const {
          payload: draftPatchPayload,
          receiptEvidence
        } = buildCanonicalAppointmentDraftPatchPayload({
          formValues,
          bookingSelection,
          receiptOcrResult,
          currentDraft
        });
        requestedReceiptEvidence = receiptEvidence;

        if (Object.keys(draftPatchPayload).length) {
          const patchResponse = await updateAppointmentDraft(
            currentDraftId,
            draftPatchPayload
          );

          if (submitRequestIdRef.current !== submitRequestId) {
            return;
          }

          if (patchResponse?.draft) {
            setCurrentDraft(patchResponse.draft);
            publishDraftChange(patchResponse.draft);
          }
        }

        response = await submitAppointmentDraft(currentDraftId);
      } else {
        const { payload, receiptEvidence } = buildCanonicalAppointmentCreatePayload({
          formValues,
          bookingSelection,
          receiptOcrResult
        });
        requestedReceiptEvidence = receiptEvidence;
        response = await createAppointment(payload);
      }

      if (submitRequestIdRef.current !== submitRequestId) {
        return;
      }

      if (response?.draft) {
        setCurrentDraft(response.draft);
        publishDraftChange(response.draft);
      }

      const appointmentResponse = response?.appointment || response;

      setSubmitStatus("success");
      setSubmitMessage(
        getCreateSuccessMessage({
          response: appointmentResponse,
          requestedReceiptEvidence,
          hadReceiptAttempt: hasReceiptAttempt
        })
      );

      submitCloseTimerRef.current = setTimeout(() => {
        if (submitRequestIdRef.current !== submitRequestId) {
          return;
        }

        onClose();
      }, CREATE_SUCCESS_CLOSE_DELAY_MS);
    } catch (error) {
      if (submitRequestIdRef.current !== submitRequestId) {
        return;
      }

      setSubmitStatus("error");
      setSubmitMessage(
        currentDraftId
          ? getDraftActionErrorMessage(error)
          : getCreateAppointmentErrorMessage(error)
      );
    }
  };

  const modalBody = (
    <div
      className="new-bill-recipient-modal__backdrop"
      onClick={handleRequestClose}
      role="presentation"
    >
      <div
        className="new-bill-recipient-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-bill-recipient-modal-title"
        aria-busy={isActionBusy}
        onClick={(event) => event.stopPropagation()}
      >
        <input
          ref={cameraInputRef}
          className="new-bill-recipient-modal__file-input"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleReceiptFileChange}
        />
        <input
          ref={galleryInputRef}
          className="new-bill-recipient-modal__file-input"
          type="file"
          accept="image/*"
          onChange={handleReceiptFileChange}
        />

        <button
          type="button"
          className="new-bill-recipient-modal__close"
          onClick={handleRequestClose}
          aria-label="ปิดหน้าต่างผู้รับสิทธิ์ใหม่"
        >
          X
        </button>

        {renderReceiptIntakePanel()}

        <div className="new-bill-recipient-modal__scroll">
          <div className="new-bill-recipient-modal__fields">
            {recipientFields.map((field) => (
              <div key={field.id} className="new-bill-recipient-modal__row">
                <label
                  htmlFor={field.id}
                  className="new-bill-recipient-modal__label"
                >
                  {renderRequiredLabel(field.label)}
                </label>
                <input
                  id={field.id}
                  className="new-bill-recipient-modal__input"
                  type="text"
                  value={formValues[field.key]}
                  onChange={(event) => updateField(field.key, event.target.value)}
                />
              </div>
            ))}

            <div className="new-bill-recipient-modal__row">
              <label
                htmlFor="recipient-branch"
                className="new-bill-recipient-modal__label"
              >
                {renderRequiredLabel("สาขา")}
              </label>
              <select
                id="recipient-branch"
                className="new-bill-recipient-modal__input new-bill-recipient-modal__select"
                value={formValues.branchId}
                onChange={(event) => updateField("branchId", event.target.value)}
              >
                <option value="">เลือกสาขา</option>
                {branchOptions.map((branch) => (
                  <option
                    key={branch.id}
                    value={branch.id}
                    disabled={branch.disabled}
                  >
                    {branch.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="new-bill-recipient-modal__row">
              <label
                htmlFor="recipient-booking-option"
                className="new-bill-recipient-modal__label"
              >
                {renderRequiredLabel("โปรโมชั่น / บริการ")}
              </label>
              <div className="new-bill-recipient-modal__stack">
                <select
                  id="recipient-booking-option"
                  className="new-bill-recipient-modal__input new-bill-recipient-modal__select"
                  value={formValues.bookingOptionValue}
                  onChange={handleBookingOptionChange}
                  disabled={bookingOptionsStatus === "loading" || !bookingOptions.length}
                >
                  <option value="">
                    {bookingOptionsStatus === "loading"
                      ? "กำลังโหลดรายการบริการ..."
                      : "เลือกโปรโมชั่นหรือบริการ"}
                  </option>
                  {bookingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {bookingOptionsError ? (
                  <p className="new-bill-recipient-modal__feedback new-bill-recipient-modal__feedback--error">
                    {bookingOptionsError}
                  </p>
                ) : null}
                {selectionSubnote ? (
                  <p className="new-bill-recipient-modal__subnote">
                    {selectionSubnote}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="new-bill-recipient-modal__row">
              <label
                htmlFor="recipient-booking-date"
                className="new-bill-recipient-modal__label"
              >
                {renderRequiredLabel("วันที่จอง")}
              </label>
              <div className="new-bill-recipient-modal__stack">
                <div className="new-bill-recipient-modal__hybrid">
                  <input
                    id="recipient-booking-date"
                    className="new-bill-recipient-modal__input"
                    type="text"
                    inputMode="numeric"
                    placeholder="DD/MM/YYYY"
                    value={formValues.bookingDateText}
                    onChange={handleDateTextChange}
                  />
                  <input
                    className="new-bill-recipient-modal__picker"
                    type="date"
                    value={formValues.bookingDatePicker}
                    onChange={handleDatePickerChange}
                    min={bangkokToday}
                    aria-label="เลือกวันที่จอง"
                  />
                </div>
                {dateValidationMessage ? (
                  <p className="new-bill-recipient-modal__feedback new-bill-recipient-modal__feedback--error">
                    {dateValidationMessage}
                  </p>
                ) : null}
                {calendarHintMessage ? (
                  <p
                    className={`new-bill-recipient-modal__${ 
                      calendarDaysStatus === "error" ? "feedback" : "subnote"
                    }${
                      calendarDaysStatus === "error"
                        ? " new-bill-recipient-modal__feedback--error"
                        : ""
                    }`}
                  >
                    {calendarHintMessage}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="new-bill-recipient-modal__row">
              <label
                htmlFor="recipient-booking-time"
                className="new-bill-recipient-modal__label"
              >
                {renderRequiredLabel("เวลาที่นัดจองนวดหน้า")}
              </label>
              <div className="new-bill-recipient-modal__stack">
                <div className="new-bill-recipient-modal__hybrid">
                  <input
                    id="recipient-booking-time"
                    className="new-bill-recipient-modal__input"
                    type="text"
                    inputMode="numeric"
                    placeholder="HH:MM"
                    value={formValues.bookingTimeText}
                    onChange={handleTimeTextChange}
                  />
                  <input
                    className="new-bill-recipient-modal__picker"
                    type="time"
                    value={formValues.bookingTimePicker}
                    onChange={handleTimePickerChange}
                    min={isTodaySelected ? bangkokNowTime : undefined}
                    aria-label="เลือกเวลาที่นัดจองนวดหน้า"
                  />
                </div>
                {timeValidationMessage ? (
                  <p className="new-bill-recipient-modal__feedback new-bill-recipient-modal__feedback--error">
                    {timeValidationMessage}
                  </p>
                ) : null}
                {queueHintMessage ? (
                  <p
                    className={`new-bill-recipient-modal__${ 
                      occupiedTimesStatus === "error" ? "feedback" : "subnote"
                    }${
                      occupiedTimesStatus === "error"
                        ? " new-bill-recipient-modal__feedback--error"
                        : ""
                    }`}
                  >
                    {queueHintMessage}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="new-bill-recipient-modal__row">
              <label
                htmlFor="recipient-provider"
                className="new-bill-recipient-modal__label"
              >
                {renderRequiredLabel("ชื่อผู้ให้บริการ")}
              </label>
              <select
                id="recipient-provider"
                className="new-bill-recipient-modal__input new-bill-recipient-modal__select"
                value={formValues.provider}
                onChange={(event) => updateField("provider", event.target.value)}
              >
                <option value="">เลือกผู้ให้บริการ</option>
                {providerOptions.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {currentDraftStatusNote ? (
          <p className="new-bill-recipient-modal__subnote">
            {currentDraftStatusNote}
          </p>
        ) : null}

        {submitMessage ? (
          <p
            className={`new-bill-recipient-modal__feedback new-bill-recipient-modal__footer-message ${
              submitStatus === "success"
                ? "new-bill-recipient-modal__feedback--success"
                : "new-bill-recipient-modal__feedback--error"
            }`}
            aria-live="polite"
          >
            {submitMessage}
          </p>
        ) : null}

        <div className="new-bill-recipient-modal__footer">
          <button
            type="button"
            className="new-bill-recipient-modal__action new-bill-recipient-modal__action--secondary"
            onClick={handleSaveDraft}
            disabled={isActionBusy}
          >
            {isDraftBusy ? "กำลังบันทึกร่าง..." : "บันทึกร่าง"}
          </button>
          <button
            type="button"
            className="new-bill-recipient-modal__action new-bill-recipient-modal__action--ghost"
            onClick={handleRequestClose}
            disabled={isActionBusy}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="new-bill-recipient-modal__action new-bill-recipient-modal__action--primary"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
          >
            {submitStatus === "success"
              ? "บันทึกแล้ว"
              : isSubmitBusy
                ? "กำลังบันทึก..."
                : "บันทึก"}
          </button>
        </div>
        <p
          className="new-bill-recipient-modal__build-stamp"
          aria-label="Frontend build version"
        >
          {buildStamp}
        </p>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return modalBody;
  }

  return createPortal(modalBody, document.body);
}

export default NewBillRecipientModal;
