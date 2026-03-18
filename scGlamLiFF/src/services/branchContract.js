const UUID_BRANCH_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const trimText = (value) =>
  value === null || value === undefined ? "" : String(value).trim();

export const normalizeBranchWriteValue = (value) => trimText(value);

export const isUuidBranchId = (value) =>
  UUID_BRANCH_ID_PATTERN.test(normalizeBranchWriteValue(value));

// Mirrors the current backend branch contract in scGlamLiff-reception:
// - write paths keep opaque non-empty text branch values as-is
// - queue/calendar filters only accept UUID-shaped branch IDs
// - the frontend must not invent a UUID remapping for values such as `branch-003`
export const normalizeCanonicalBranch = (value) => {
  const rawValue = normalizeBranchWriteValue(value);
  const isUuid = isUuidBranchId(rawValue);

  return {
    rawValue,
    isUuid,
    writeBranchId: rawValue,
    availabilityBranchId: isUuid ? rawValue : "",
    availabilityMode: rawValue
      ? isUuid
        ? "uuid_query"
        : "omit_non_uuid_query"
      : "unset",
    requiresClientSideQueueFilter: Boolean(rawValue) && !isUuid
  };
};
