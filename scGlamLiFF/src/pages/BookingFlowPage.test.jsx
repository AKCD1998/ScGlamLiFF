// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import BookingFlowPage from "./BookingFlowPage";

const { useAuthMock, useBranchDeviceMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useBranchDeviceMock: vi.fn()
}));

vi.mock("../components/AppLayout", () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>
}));

vi.mock("../components/BookingDetailsModal", () => ({
  default: () => null
}));

vi.mock("../components/LoadingOverlay", () => ({
  default: () => null
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: useAuthMock
}));

vi.mock("../context/BranchDeviceContext", () => ({
  useBranchDevice: useBranchDeviceMock
}));

vi.mock("react-day-picker", () => ({
  DayPicker: () => <div data-testid="day-picker" />
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/my-treatments/smooth/booking"]}>
      <BookingFlowPage />
    </MemoryRouter>
  );

describe("BookingFlowPage registered branch behavior", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ items: [] })
    });
    vi.stubGlobal("fetch", fetchMock);
    useAuthMock.mockReturnValue({
      user: {
        lineUserId: "U123"
      }
    });
    useBranchDeviceMock.mockReturnValue({
      branchId: "branch-external-777"
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("prefills and constrains the booking branch to the registered device branch", async () => {
    renderPage();

    const branchSelect = await screen.findByLabelText("สาขา");

    await waitFor(() =>
      expect(branchSelect.value).toBe("branch-external-777")
    );

    expect(branchSelect.disabled).toBe(true);
    expect(
      screen.getByText("อุปกรณ์นี้ผูกกับสาขา branch-external-777")
    ).toBeTruthy();
    expect(
      screen.getByRole("option", {
        name: "สาขาที่บันทึกไว้ (branch-external-777)"
      })
    ).toBeTruthy();
  });
});
