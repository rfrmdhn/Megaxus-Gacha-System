import { saveToken, clearToken, getToken, decodeToken, getCurrentUser } from "./auth";

const TOKEN_KEY = "gacha_token";

function makeToken(overrides: any = {}): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: "user-1",
      email: "admin@test.com",
      role: "admin",
      iat: 1,
      exp: 9999999999,
      ...overrides,
    }),
  );
  return `${header}.${payload}.signature`;
}

beforeEach(() => {
  localStorage.clear();
});

describe("saveToken", () => {
  it("stores token in localStorage", () => {
    saveToken("test-token");
    expect(localStorage.getItem(TOKEN_KEY)).toBe("test-token");
  });
});

describe("clearToken", () => {
  it("removes token from localStorage", () => {
    localStorage.setItem(TOKEN_KEY, "test");
    clearToken();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});

describe("getToken", () => {
  it("returns token from localStorage", () => {
    localStorage.setItem(TOKEN_KEY, "my-token");
    expect(getToken()).toBe("my-token");
  });

  it("returns null when no token", () => {
    expect(getToken()).toBeNull();
  });

  it("returns null when window is undefined", () => {
    const origWindow = global.window;
    (global as any).window = undefined;
    expect(getToken()).toBeNull();
    (global as any).window = origWindow;
  });
});

describe("decodeToken", () => {
  it("decodes valid token", () => {
    const token = makeToken({ email: "admin@test.com", role: "admin" });
    const result = decodeToken(token);
    expect(result).not.toBeNull();
    expect(result!.email).toBe("admin@test.com");
    expect(result!.role).toBe("admin");
  });

  it("returns null for invalid token", () => {
    expect(decodeToken("invalid.token.here")).toBeNull();
  });

  it("returns null for malformed base64", () => {
    expect(decodeToken("header.%%%.signature")).toBeNull();
  });

  it("returns null for non-json payload", () => {
    const t = `${btoa("header")}.${btoa("not-json")}.sig`;
    expect(decodeToken(t)).toBeNull();
  });
});

describe("getCurrentUser", () => {
  it("returns null when no token", () => {
    expect(getCurrentUser()).toBeNull();
  });

  it("returns null when token is expired", () => {
    const token = makeToken({ exp: 1 });
    localStorage.setItem(TOKEN_KEY, token);
    expect(getCurrentUser()).toBeNull();
  });

  it("returns user when token is valid", () => {
    const token = makeToken({ email: "admin@test.com" });
    localStorage.setItem(TOKEN_KEY, token);
    const user = getCurrentUser();
    expect(user).not.toBeNull();
    expect(user!.email).toBe("admin@test.com");
  });
});
