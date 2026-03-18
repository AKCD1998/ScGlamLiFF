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

    const payload = await getMyBranchDeviceRegistration();

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
    expect(payload.success).toBe(true);
    expect(payload.registered).toBe(true);
    expect(payload.active).toBe(true);
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

  it("posts explicit staff fallback credentials when provided for registration", async () => {
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
      branch_id: "branch-003",
      device_label: "Auu003",
      staff_username: " staff003 ",
      staff_password: "password-003",
      authPath: "explicit_credentials"
    });

    const [, options] = fetchMock.mock.calls[0];

    expect(JSON.parse(options.body)).toEqual({
      branch_id: "branch-003",
      device_label: "Auu003",
      staff_username: "staff003",
      staff_password: "password-003",
      liff_app_id: "1650000000-test"
    });
  });

  it("normalizes the canonical GET /me response shape from backend reason fields", async () => {
    getLiffIdentityTokensMock.mockResolvedValue({
      idToken: "line-id-token",
      accessToken: "line-access-token",
      liffAppId: "1650000000-test"
    });
    fetchMock.mockResolvedValue(
      createResponse({
        ok: true,
        status: 200,
        payload: {
          success: true,
          registered: false,
          active: null,
          reason: "not_registered",
          branchId: null,
          registrationId: null,
          lineIdentity: {
            line_user_id: "U1234567890"
          }
        }
      })
    );

    const payload = await getMyBranchDeviceRegistration();

    expect(payload.success).toBe(true);
    expect(payload.registered).toBe(false);
    expect(payload.active).toBe(null);
    expect(payload.reason).toBe("not_registered");
    expect(payload.branchId).toBe(null);
    expect(payload.lineIdentity).toEqual({
      line_user_id: "U1234567890"
    });
  });

  it("fails before fetch when LIFF returns no id token and no access token", async () => {
    getLiffIdentityTokensMock.mockResolvedValue({
      idToken: "",
      accessToken: "",
      liffAppId: "1650000000-test"
    });

    await expect(getMyBranchDeviceRegistration()).rejects.toMatchObject({
      status: 400,
      reason: "missing_token"
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
