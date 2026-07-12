import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { saveToken, clearToken, getToken, decodeToken, getCurrentUser } from "../auth";

function makeToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

describe("saveToken", () => {
  beforeEach(() => localStorage.clear());

  it("stores token in localStorage", () => {
    saveToken("my-token");
    expect(localStorage.getItem("gacha_token")).toBe("my-token");
  });
});

describe("getToken on the server", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns null when window is undefined (SSR)", () => {
    vi.stubGlobal("window", undefined);
    expect(getToken()).toBeNull();
  });
});

describe("clearToken", () => {
  it("removes token from localStorage", () => {
    localStorage.setItem("gacha_token", "to-be-cleared");
    clearToken();
    expect(localStorage.getItem("gacha_token")).toBeNull();
  });
});

describe("getToken", () => {
  it("returns null when no token is stored", () => {
    localStorage.clear();
    expect(getToken()).toBeNull();
  });

  it("returns the stored token", () => {
    localStorage.setItem("gacha_token", "stored-token");
    expect(getToken()).toBe("stored-token");
  });
});

describe("decodeToken", () => {
  it("decodes a valid JWT payload", () => {
    const payload = { sub: "1", email: "a@b.com", role: "user", iat: 1, exp: 9999999999 };
    const token = makeToken(payload);
    expect(decodeToken(token)).toEqual(payload);
  });

  it("handles URL-safe base64 characters", () => {
    const payload = { sub: "1", email: "a+b@c.com", role: "admin", iat: 1, exp: 9999999999, extra: "a/b" };
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    let body = btoa(JSON.stringify(payload));
    body = body.replace(/\+/g, "-").replace(/\//g, "_");
    const token = `${header}.${body}.sig`;
    const decoded = decodeToken(token);
    expect(decoded).toBeTruthy();
    expect((decoded as unknown as { extra: string }).extra).toBe("a/b");
  });

  it("returns null for invalid token", () => {
    expect(decodeToken("invalid")).toBeNull();
  });

  it("returns null for garbage string", () => {
    expect(decodeToken("not.a.jwt.at.all")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(decodeToken("")).toBeNull();
  });
});

describe("getCurrentUser", () => {
  beforeEach(() => localStorage.clear());

  it("returns null when no token exists", () => {
    expect(getCurrentUser()).toBeNull();
  });

  it("returns null for expired token", () => {
    const payload = { sub: "1", email: "a@b.com", role: "user", iat: 1, exp: 1 };
    localStorage.setItem("gacha_token", makeToken(payload));
    expect(getCurrentUser()).toBeNull();
  });

  it("returns the payload for a valid non-expired token", () => {
    const payload = { sub: "1", email: "a@b.com", role: "user", iat: 1, exp: 9999999999 };
    localStorage.setItem("gacha_token", makeToken(payload));
    const user = getCurrentUser();
    expect(user).toBeTruthy();
    expect(user!.email).toBe("a@b.com");
  });

  it("returns null for invalid token in localStorage", () => {
    localStorage.setItem("gacha_token", "not-a-valid-jwt");
    expect(getCurrentUser()).toBeNull();
  });
});
