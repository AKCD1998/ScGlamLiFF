import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMyStaffSession,
  loginStaffSession
} from "./branchDeviceStaffAuthService";

const createResponse = ({ ok, status, payload }) => ({
  ok,
  status,
  text: vi.fn().mockResolvedValue(
    payload === undefined ? "" : JSON.stringify(payload)
  )
});

const parseRequestUrl = (value) => new URL(value, "https://example.test");

describe("branchDeviceStaffAuthService", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("checks the staff session with credentials include", async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        ok: true,
        status: 200,
        payload: {
          success: true,
          data: {
            username: "staff003",
            display_name: "SC 003"
          }
        }
      })
    );

    const payload = await getMyStaffSession();

    const [url, options] = fetchMock.mock.calls[0];
    const requestUrl = parseRequestUrl(url);

    expect(url).toBe("/api/auth/me");
    expect(requestUrl.pathname).toBe("/api/auth/me");
    expect(options.method).toBe("GET");
    expect(options.cache).toBe("no-store");
    expect(options.credentials).toBe("include");
    expect(payload.success).toBe(true);
    expect(payload.user).toEqual({
      username: "staff003",
      display_name: "SC 003"
    });
  });

  it("logs staff in with credentials include and a JSON body", async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        ok: true,
        status: 200,
        payload: {
          success: true,
          user: {
            username: "staff003"
          }
        }
      })
    );

    await loginStaffSession({
      username: " staff003 ",
      password: "password-003"
    });

    const [url, options] = fetchMock.mock.calls[0];
    const requestUrl = parseRequestUrl(url);

    expect(url).toBe("/api/auth/login");
    expect(requestUrl.pathname).toBe("/api/auth/login");
    expect(options.method).toBe("POST");
    expect(options.cache).toBe("no-store");
    expect(options.credentials).toBe("include");
    expect(options.headers).toEqual({
      "Content-Type": "application/json"
    });
    expect(JSON.parse(options.body)).toEqual({
      username: "staff003",
      password: "password-003"
    });
  });

  it("maps a missing staff cookie to missing_staff_auth on /api/auth/me", async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        ok: false,
        status: 401,
        payload: {
          error: "Unauthorized"
        }
      })
    );

    await expect(getMyStaffSession()).rejects.toMatchObject({
      status: 401,
      reason: "missing_staff_auth"
    });
  });

  it("maps invalid login credentials to login_failed", async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        ok: false,
        status: 401,
        payload: {
          error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
        }
      })
    );

    await expect(
      loginStaffSession({
        username: "staff003",
        password: "wrong-password"
      })
    ).rejects.toMatchObject({
      status: 401,
      reason: "login_failed"
    });
  });
});
