import { apiFetch } from "@/lib/api";

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
}

export function login(credentials: AuthCredentials): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function register(credentials: AuthCredentials): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}
