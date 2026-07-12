import { apiFetch } from "@/lib/api";
import { AdminUser, AdminUserDetail, UsersListResponse } from "./types";

export function listUsers(query: { limit: number; cursor?: string | null; email?: string }): Promise<UsersListResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(query.limit));
  if (query.cursor) params.set("cursor", query.cursor);
  if (query.email) params.set("email", query.email);
  return apiFetch<UsersListResponse>(`/admin/users?${params.toString()}`);
}

export function getUserDetail(id: string): Promise<AdminUserDetail> {
  return apiFetch<AdminUserDetail>(`/admin/users/${id}`);
}

export function updateUser(
  id: string,
  body: Partial<Pick<AdminUser, "coins" | "role" | "isBanned">>,
): Promise<void> {
  return apiFetch<void>(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export function createUser(body: {
  email: string;
  password: string;
  role: "user" | "admin";
  coins?: number;
}): Promise<void> {
  return apiFetch<void>("/admin/users", { method: "POST", body: JSON.stringify(body) });
}
