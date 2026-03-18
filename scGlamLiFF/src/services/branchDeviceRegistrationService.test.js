import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createBranchDeviceRegistration,
  getMyBranchDeviceRegistration
} from "./branchDeviceRegistrationService";

const { getLiffIdentityTokensMock } = vi.hoisted(() => ({
  getLiffIdentityTokensMock: vi.fn()
}));

vi.mock("../utils/liffIdentity", () => ({
  getLiffIdentityTokens: getLiffIdentityTokensMock,
  buildLiffIdentityHeaders: ({
    idToken = "",
    accessToken = "",
    liffAppId = ""
  } = {}) => {
    const headers = {};

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
      headers["X-Line-Access-Token"] = accessToken;
    }

    if (idToken) {
      headers["X-Line-Id-Token"] = idToken;
    }

    if (liffAppId) {
      headers["X-Liff-App-Id"] = liffAppId;
    }

    return headers;
  }
}));

const createResponse = ({ ok, status, payload }) => ({
  ok,
  status,
  text: vi.fn().mockResolvedValue(
    payload === undefined ? "" : JSON.stringify(payload)
  )
});

const parseRequestUrl = (value) => new URL(value, "https://example.test");

describe("branchDeviceRegistrationService", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    getLiffIdentityTokensMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends LIFF verification headers to the device registration lookup endpoint", async () => {
    getLiffIdentityTokensMock.mockResolvedValue({
      idToken: "line-id-token",
      accessToken: "line-access-token",
      liffAppId: "1650000000-test"
    });
    fetchMock.mockResolvedValue(
      createResponse({
        ok: true,
        status: 200,
        payload: { ok: true, registered: true, active: true }
      })
    );

    await getMyBranchDeviceRegistration();

    const [url, options] = fetchMock.mock.calls[0];
    const requestUrl = parseRequestUrl(url);

    expect(requestUrl.pathname).toBe("/api/branch-device-registrations/me");
    expect(options.method).toBe("GET");
    expect(options.credentials).toBe("include");
    expect(options.headers).toEqual({
      Authorization: "Bearer line-access-token",
      "X-Line-Access-Token": "line-access-token",
      "X-Line-Id-Token": "line-id-token",
      "X-Liff-App-Id": "1650000000-test"
    });
  });

  it("posts the branch registration payload with LIFF headers and app metadata", async () => {
    getLiffIdentityTokensMock.mockResolvedValue({
      idToken: "line-id-token",
      accessToken: "line-access-token",
      liffAppId: "1650000000-test"
    });
    fetchMock.mockResolvedValue(
      createResponse({
        ok: true,
        status: 201,
        payload: {
          ok: true,
          action: "created",
          registration: { id: "registration-uuid" }
        }
      })
    );

    await createBranchDeviceRegistration({
      branch_id: " branch-003 ",
      device_label: " Front Desk iPhone "
    });

    const [url, options] = fetchMock.mock.calls[0];
    const requestUrl = parseRequestUrl(url);

    expect(requestUrl.pathname).toBe("/api/branch-device-registrations");
    expect(options.method).toBe("POST");
    expect(options.credentials).toBe("include");
    expect(options.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer line-access-token",
      "X-Line-Access-Token": "line-access-token",
      "X-Line-Id-Token": "line-id-token",
      "X-Liff-App-Id": "1650000000-test"
    });
    expect(JSON.parse(options.body)).toEqual({
      branch_id: "branch-003",
      device_label: "Front Desk iPhone",
      liff_app_id: "1650000000-test"
    });
  });
});
