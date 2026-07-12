import { apiFetch } from "@/lib/api";
import { Profile, HistoryPage } from "./types";

export function getProfile(): Promise<Profile> {
  return apiFetch<Profile>("/user/profile");
}

export function getHistory(after: string | null): Promise<HistoryPage> {
  const qs = after ? `?cursor=${after}&limit=20` : "?limit=20";
  return apiFetch<HistoryPage>(`/user/history${qs}`);
}
