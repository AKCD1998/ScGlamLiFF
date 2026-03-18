import { describe, expect, it } from "vitest";
import {
  isUuidBranchId,
  normalizeBranchWriteValue,
  normalizeCanonicalBranch
} from "./branchContract";

describe("branchContract", () => {
  it("preserves opaque text branch values for write paths and does not invent UUID filters", () => {
    const normalizedBranch = normalizeCanonicalBranch(" branch-003 ");

    expect(normalizeBranchWriteValue(" branch-003 ")).toBe("branch-003");
    expect(normalizedBranch.writeBranchId).toBe("branch-003");
    expect(normalizedBranch.availabilityBranchId).toBe("");
    expect(normalizedBranch.requiresClientSideQueueFilter).toBe(true);
  });

  it("reuses UUID-shaped branch values for both write and availability paths", () => {
    const branchId = "99999999-9999-4999-8999-999999999999";
    const normalizedBranch = normalizeCanonicalBranch(` ${branchId} `);

    expect(isUuidBranchId(branchId)).toBe(true);
    expect(normalizedBranch.writeBranchId).toBe(branchId);
    expect(normalizedBranch.availabilityBranchId).toBe(branchId);
    expect(normalizedBranch.requiresClientSideQueueFilter).toBe(false);
  });
});
