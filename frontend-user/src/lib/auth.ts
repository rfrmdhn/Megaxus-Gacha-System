const TOKEN_KEY = "gacha_token";
const REFRESH_TOKEN_KEY = "gacha_refresh_token";

export interface JwtPayload {
  sub: string;
  email: string;
  role: "user" | "admin";
  iat: number;
  exp: number;
}

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function saveRefreshToken(token: string) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearRefreshToken() {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/** Store both tokens returned by login/register/refresh. */
export function saveSession(tokens: { token: string; refreshToken: string }) {
  saveToken(tokens.token);
  saveRefreshToken(tokens.refreshToken);
}

/** Clear the whole client session (access + refresh). */
export function clearSession() {
  clearToken();
  clearRefreshToken();
}

// Decodes the JWT payload for display purposes only (role-gating UI). The
// backend independently verifies the signature on every request; this is
// never trusted as an authorization boundary by itself.
export function decodeToken(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getCurrentUser(): JwtPayload | null {
  const token = getToken();
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload || payload.exp * 1000 < Date.now()) return null;
  return payload;
}
