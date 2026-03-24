import { afterEach, describe, expect, it, vi } from "vitest";

const loadApiBaseModule = async ({ apiBaseUrl = "" } = {}) => {
  vi.resetModules();
  vi.doMock("../config/env", () => ({
    apiBaseUrl
  }));

  return import("./apiBase");
};

describe("apiBase same-origin hosting", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("keeps /api requests relative when no explicit API origin is configured", async () => {
    const { apiUrl, buildApiUrl } = await loadApiBaseModule({
      apiBaseUrl: ""
    });

    expect(apiUrl("/api/auth/me")).toBe("/api/auth/me");
    expect(buildApiUrl("", "/api/auth/login")).toBe("/api/auth/login");
  });

  it("still supports an explicit API origin override for local development", async () => {
    const { apiUrl, buildApiUrl } = await loadApiBaseModule({
      apiBaseUrl: "http://localhost:3001"
    });

    expect(apiUrl("/api/auth/me")).toBe(
      "http://localhost:3001/api/auth/me"
    );
    expect(buildApiUrl("http://localhost:3001", "/api/health")).toBe(
      "http://localhost:3001/api/health"
    );
  });
});
