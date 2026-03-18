// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BranchDeviceStartupGate from "./BranchDeviceStartupGate";
import { BranchDeviceProvider } from "../context/BranchDeviceContext";
import { BranchDeviceRegistrationApiError } from "../services/branchDeviceRegistrationService";

const {
  useAuthMock,
  getMyBranchDeviceRegistrationMock,
  createBranchDeviceRegistrationMock
} = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  getMyBranchDeviceRegistrationMock: vi.fn(),
  createBranchDeviceRegistrationMock: vi.fn()
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: useAuthMock
}));

vi.mock("./AppLayout", () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>
}));

vi.mock("../services/branchDeviceRegistrationService", () => {
  class BranchDeviceRegistrationApiError extends Error {
    constructor(message, { status, payload } = {}) {
      super(message);
      this.name = "BranchDeviceRegistrationApiError";
      this.status = status ?? 0;
      this.payload = payload ?? null;
      this.code = payload?.code || "";
      this.details = payload?.details || null;
    }
  }

  return {
    BranchDeviceRegistrationApiError,
    getMyBranchDeviceRegistration: getMyBranchDeviceRegistrationMock,
    createBranchDeviceRegistration: createBranchDeviceRegistrationMock
  };
});

const renderGuard = () =>
  render(
    <BranchDeviceProvider>
      <BranchDeviceStartupGate>
        <div data-testid="guard-ready">พร้อมใช้งาน</div>
      </BranchDeviceStartupGate>
    </BranchDeviceProvider>
  );

describe("BranchDeviceStartupGate", () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({ mode: "real" });
    getMyBranchDeviceRegistrationMock.mockReset();
    createBranchDeviceRegistrationMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("allows the app flow to continue for a registered active device", async () => {
    getMyBranchDeviceRegistrationMock.mockResolvedValue({
      ok: true,
      registered: true,
      active: true,
      branch_id: "branch-003",
      registration: {
        id: "registration-uuid",
        branch_id: "branch-003",
        status: "active"
      }
    });

    renderGuard();

    expect(await screen.findByTestId("guard-ready")).toBeTruthy();
    expect(getMyBranchDeviceRegistrationMock).toHaveBeenCalledTimes(1);
  });

  it("shows the registration-required state for an unregistered LIFF device", async () => {
    getMyBranchDeviceRegistrationMock.mockResolvedValue({
      ok: true,
      registered: false,
      active: false,
      line_identity: {
        line_user_id: "U123",
        display_name: "Front Desk Phone"
      }
    });

    renderGuard();

    expect(await screen.findByText("ต้องลงทะเบียนอุปกรณ์")).toBeTruthy();
    expect(screen.getByText("LINE: Front Desk Phone")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "ลงทะเบียนอุปกรณ์" })
    ).toBeTruthy();
  });

  it("shows the inactive state when the current registration is not active", async () => {
    getMyBranchDeviceRegistrationMock.mockResolvedValue({
      ok: true,
      registered: true,
      active: false,
      registration: {
        id: "registration-uuid",
        branch_id: "branch-003",
        status: "inactive"
      }
    });

    renderGuard();

    expect(await screen.findByText("อุปกรณ์ถูกปิดใช้งาน")).toBeTruthy();
    expect(
      screen.getByText(/ศิริชัยเภสัช สาขาวัดช่องลม \(003\)/)
    ).toBeTruthy();
  });

  it("keeps missing LIFF token separate from generic inactive/not-registered states", async () => {
    getMyBranchDeviceRegistrationMock.mockRejectedValue(
      new BranchDeviceRegistrationApiError("Missing LINE LIFF token", {
        status: 400,
        payload: {
          reason: "missing_token"
        }
      })
    );

    renderGuard();

    expect(await screen.findByText("ตรวจสอบอุปกรณ์ไม่สำเร็จ")).toBeTruthy();
    expect(
      screen.getByText("ไม่พบ LIFF token สำหรับยืนยันเครื่องนี้")
    ).toBeTruthy();
  });

  it("keeps outside-LINE runtime as request_never_started instead of pretending a backend failure", async () => {
    getMyBranchDeviceRegistrationMock.mockRejectedValue(
      new Error("LIFF_NOT_IN_CLIENT")
    );

    renderGuard();

    expect(await screen.findByText("ยังไม่เริ่มตรวจสอบอุปกรณ์")).toBeTruthy();
    expect(screen.getByText("กรุณาเปิดผ่าน LINE")).toBeTruthy();
  });

  it("submits first-time registration and refreshes into the ready state", async () => {
    getMyBranchDeviceRegistrationMock
      .mockResolvedValueOnce({
        ok: true,
        registered: false,
        active: false,
        line_identity: {
          line_user_id: "U123",
          display_name: "Front Desk Phone"
        }
      })
      .mockResolvedValueOnce({
        ok: true,
        registered: true,
        active: true,
        branch_id: "branch-003",
        registration: {
          id: "registration-uuid",
          branch_id: "branch-003",
          status: "active",
          device_label: "Front Desk iPhone"
        },
        line_identity: {
          line_user_id: "U123",
          display_name: "Front Desk Phone"
        }
      });
    createBranchDeviceRegistrationMock.mockResolvedValue({
      ok: true,
      action: "created",
      registration: {
        id: "registration-uuid",
        branch_id: "branch-003",
        status: "active"
      }
    });

    renderGuard();

    await screen.findByText("ต้องลงทะเบียนอุปกรณ์");

    fireEvent.change(screen.getByLabelText("ชื่อเครื่อง (ไม่บังคับ)"), {
      target: { value: "Front Desk iPhone" }
    });
    fireEvent.click(screen.getByRole("button", { name: "ลงทะเบียนอุปกรณ์" }));

    await waitFor(() =>
      expect(createBranchDeviceRegistrationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          branch_id: "branch-003",
          device_label: "Front Desk iPhone",
          onEvent: expect.any(Function)
        })
      )
    );
    expect(await screen.findByTestId("guard-ready")).toBeTruthy();
    expect(getMyBranchDeviceRegistrationMock).toHaveBeenCalledTimes(2);
  });
});
