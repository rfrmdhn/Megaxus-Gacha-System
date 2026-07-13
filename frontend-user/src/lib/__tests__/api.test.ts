import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { apiFetch, ApiError, sseUrl } from "../api";
import * as auth from "../auth";

vi.mock("../auth", () => ({
  getToken: vi.fn(),
  getRefreshToken: vi.fn(),
  saveSession: vi.fn(),
  clearSession: vi.fn(),
}));

const mockedGetToken = vi.mocked(auth.getToken);
const mockedGetRefreshToken = vi.mocked(auth.getRefreshToken);
const mockedSaveSession = vi.mocked(auth.saveSession);
const mockedClearSession = vi.mocked(auth.clearSession);

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(text: string, status = 200): Response {
  return new Response(text, { status, statusText: "Error" });
}

describe("ApiError", () => {
  it("stores message and status", () => {
    const err = new ApiError("not found", 404);
    expect(err.message).toBe("not found");
    expect(err.status).toBe(404);
    expect(err).toBeInstanceOf(Error);
  });
});

describe("apiFetch", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    mockedGetToken.mockReturnValue(null);
    mockedGetRefreshToken.mockReturnValue(null);
    mockedSaveSession.mockReset();
    mockedClearSession.mockReset();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("makes a GET request with JSON content-type header", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const result = await apiFetch("/test");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/test"),
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
    expect(result).toEqual({ ok: true });
  });

  it("attaches Authorization header when token exists", async () => {
    mockedGetToken.mockReturnValue("my-token");
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: 1 }));
    await apiFetch("/authed");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer my-token" }),
      }),
    );
  });

  it("does not attach Authorization header when token is null", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: 1 }));
    await apiFetch("/public");
    const headers = vi.mocked(globalThis.fetch).mock.calls[0][1] as RequestInit;
    expect(headers.headers).not.toHaveProperty("Authorization");
  });

  it("merges custom headers", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    await apiFetch("/test", { headers: { "X-Custom": "yes" } });
    const headers = vi.mocked(globalThis.fetch).mock.calls[0][1] as RequestInit;
    expect(headers.headers).toEqual(
      expect.objectContaining({ "X-Custom": "yes", "Content-Type": "application/json" }),
    );
  });

  it("throws ApiError on non-OK JSON response with array message", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ message: ["error one", "error two"] }, 400),
    );
    await expect(apiFetch("/bad")).rejects.toThrow(ApiError);
  });

  it("joins array messages in ApiError", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ message: ["error one", "error two"] }, 400),
    );
    try {
      await apiFetch("/bad");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).message).toBe("error one, error two");
      expect((err as ApiError).status).toBe(400);
    }
  });

  it("throws ApiError on non-OK JSON response with string message", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ message: "unauthorized" }, 401));
    await expect(apiFetch("/bad")).rejects.toMatchObject({ message: "unauthorized", status: 401 });
  });

  it("throws ApiError with statusText on non-JSON error response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(textResponse("Internal Server Error", 500));
    await expect(apiFetch("/bad")).rejects.toMatchObject({ message: "Error", status: 500 });
  });

  it("throws ApiError with statusText when body has no message", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({}, 422));
    await expect(apiFetch("/bad")).rejects.toMatchObject({ status: 422 });
  });

  it("returns null body for non-JSON response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(textResponse("ok", 200));
    const result = await apiFetch("/health");
    expect(result).toBeNull();
  });

  it("passes through method and body options", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ token: "abc" }));
    await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", password: "123" }),
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({ method: "POST", body: expect.any(String) }),
    );
  });

  it("refreshes the access token on 401 and replays the request", async () => {
    mockedGetRefreshToken.mockReturnValue("u1.secret");
    const fetchMock = vi
      .fn()
      // First call: original request rejected with 401.
      .mockResolvedValueOnce(jsonResponse({ message: "expired" }, 401))
      // Second call: the /auth/refresh request succeeds.
      .mockResolvedValueOnce(jsonResponse({ token: "new", refreshToken: "u1.new" }))
      // Third call: the replayed original request succeeds.
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    globalThis.fetch = fetchMock;

    const result = await apiFetch<{ ok: boolean }>("/protected");

    expect(result).toEqual({ ok: true });
    expect(mockedSaveSession).toHaveBeenCalledWith({ token: "new", refreshToken: "u1.new" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("clears the session when the refresh attempt also fails", async () => {
    mockedGetRefreshToken.mockReturnValue("u1.secret");
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "expired" }, 401))
      // /auth/refresh itself returns 401 → refresh fails.
      .mockResolvedValueOnce(jsonResponse({ message: "nope" }, 401));

    await expect(apiFetch("/protected")).rejects.toMatchObject({ status: 401 });
    expect(mockedClearSession).toHaveBeenCalled();
  });

  it("aborts the refresh when the token vanishes between checks", async () => {
    // Truthy for apiFetch's guard, then null when refreshAccessToken re-reads it.
    mockedGetRefreshToken.mockReturnValueOnce("u1.secret").mockReturnValueOnce(null);
    globalThis.fetch = vi.fn().mockResolvedValueOnce(jsonResponse({ message: "expired" }, 401));

    await expect(apiFetch("/protected")).rejects.toMatchObject({ status: 401 });
    expect(mockedClearSession).toHaveBeenCalled();
  });

  it("clears the session when the refresh request throws", async () => {
    mockedGetRefreshToken.mockReturnValue("u1.secret");
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "expired" }, 401))
      // Network error on the refresh request itself.
      .mockRejectedValueOnce(new Error("network down"));

    await expect(apiFetch("/protected")).rejects.toMatchObject({ status: 401 });
    expect(mockedClearSession).toHaveBeenCalled();
  });
});

describe("sseUrl", () => {
  beforeEach(() => {
    mockedGetToken.mockReturnValue(null);
  });

  it("builds URL without token", () => {
    const url = sseUrl("/events/stream");
    expect(url).toBe("http://localhost:3001/api/v1/events/stream?token=");
  });

  it("builds URL with token", () => {
    mockedGetToken.mockReturnValue("abc123");
    const url = sseUrl("/events/stream");
    expect(url).toContain("/events/stream?token=abc123");
  });

  it("URL-encodes special characters in token", () => {
    mockedGetToken.mockReturnValue("a&b=c");
    const url = sseUrl("/events/stream");
    expect(url).toContain("token=a%26b%3Dc");
  });
});
