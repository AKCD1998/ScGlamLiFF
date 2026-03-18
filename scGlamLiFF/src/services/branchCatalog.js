import { normalizeBranchWriteValue } from "./branchContract";

const RAW_BOOKING_BRANCH_OPTIONS = [
  { id: "branch-003", label: "ศิริชัยเภสัช สาขาวัดช่องลม (003)", disabled: false },
  {
    id: "branch-mk",
    label: "ศิริชัยเภสัช สาขาตลาดแม่กลอง (ยังไม่พร้อมให้บริการ)",
    disabled: true
  },
  {
    id: "branch-bn",
    label: "ศิริชัยเภสัช สาขาตลาดบางน้อย (ยังไม่พร้อมให้บริการ)",
    disabled: true
  }
];

export const BOOKING_BRANCH_OPTIONS = Object.freeze(
  RAW_BOOKING_BRANCH_OPTIONS.map((branch) => Object.freeze({ ...branch }))
);

export const DEFAULT_BOOKING_BRANCH_ID =
  BOOKING_BRANCH_OPTIONS.find((branch) => !branch.disabled)?.id || "";

const createInjectedBranchOption = (branchId) =>
  Object.freeze({
    id: branchId,
    label: `สาขาที่บันทึกไว้ (${branchId})`,
    disabled: false
  });

export const getBookingBranchOption = (value) => {
  const normalizedValue = normalizeBranchWriteValue(value);

  if (!normalizedValue) {
    return null;
  }

  return BOOKING_BRANCH_OPTIONS.find((branch) => branch.id === normalizedValue) || null;
};

export const getBookingBranchLabel = (value) =>
  getBookingBranchOption(value)?.label || normalizeBranchWriteValue(value);

export const getBookingBranchOptions = (currentValue) => {
  const normalizedValue = normalizeBranchWriteValue(currentValue);

  if (!normalizedValue || getBookingBranchOption(normalizedValue)) {
    return BOOKING_BRANCH_OPTIONS;
  }

  return [...BOOKING_BRANCH_OPTIONS, createInjectedBranchOption(normalizedValue)];
};
