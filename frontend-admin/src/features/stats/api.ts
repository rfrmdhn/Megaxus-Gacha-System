import { apiFetch } from "@/lib/api";
import { AdminStats, LeaderboardEntry, RarityBreakdown } from "./types";

export function getStats(): Promise<AdminStats> {
  return apiFetch<AdminStats>("/admin/stats");
}

export function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return apiFetch<LeaderboardEntry[]>("/admin/stats/leaderboard");
}

export function getRarityBreakdown(eventId?: string): Promise<RarityBreakdown[]> {
  const query = eventId ? `?eventId=${eventId}` : "";
  return apiFetch<RarityBreakdown[]>(`/admin/stats/rarity${query}`);
}
