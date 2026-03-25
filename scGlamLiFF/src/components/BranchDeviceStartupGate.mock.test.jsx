// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BranchDeviceStartupGate from "./BranchDeviceStartupGate";
import { BranchDeviceProvider } from "../context/BranchDeviceContext";

const {
  useAuthMock,
  getMyBranchDeviceRegistrationMock,
  getMyStaffSessionMock
} = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  getMyBranchDeviceRegistrationMock: vi.fn(),
  getMyStaffSessionMock: vi.fn()
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: useAuthMock
}));

vi.mock("./AppLayout", () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>
}));

vi.mock("../services/branchDeviceRegistrationService", () => ({
  BranchDeviceRegistrationApiError: class BranchDeviceRegistrationApiError extends Error {},
  getMyBranchDeviceRegistration: getMyBranchDeviceRegistrationMock,
  createBranchDeviceRegistration: vi.fn()
}));

vi.mock("../services/branchDeviceStaffAuthService", () => ({
  BranchDeviceStaffAuthApiError: class BranchDeviceStaffAuthApiError extends Error {},
  getMyStaffSession: getMyStaffSessionMock,
  loginStaffSession: vi.fn()
}));

describe("BranchDeviceStartupGate mock mode", () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({ mode: "mock" });
    getMyBranchDeviceRegistrationMock.mockReset();
    getMyStaffSessionMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("lets mock mode reach the app routes immediately", async () => {
    render(
      <BranchDeviceProvider>
        <BranchDeviceStartupGate>
          <div data-testid="guard-ready">พร้อมใช้งาน</div>
        </BranchDeviceStartupGate>
      </BranchDeviceProvider>
    );

    expect(await screen.findByTestId("guard-ready")).toBeTruthy();
    expect(getMyBranchDeviceRegistrationMock).not.toHaveBeenCalled();
    expect(getMyStaffSessionMock).not.toHaveBeenCalled();
  });
});
