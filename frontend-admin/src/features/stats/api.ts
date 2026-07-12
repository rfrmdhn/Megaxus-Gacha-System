import { apiFetch } from "@/lib/api";
import { AdminStats } from "./types";

export function getStats(): Promise<AdminStats> {
  return apiFetch<AdminStats>("/admin/stats");
}
