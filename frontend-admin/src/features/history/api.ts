import { apiFetch } from "@/lib/api";
import { HistoryPage } from "./types";

export function listHistory(cursor: string | null, limit: number): Promise<HistoryPage> {
  const qs = cursor ? `?cursor=${cursor}&limit=${limit}` : `?limit=${limit}`;
  return apiFetch<HistoryPage>(`/admin/history${qs}`);
}
