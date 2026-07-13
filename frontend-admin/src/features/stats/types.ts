export interface AdminStats {
  totalUsers: number;
  activeEvents: number;
  totalEvents: number;
  pullsToday: number;
  totalPulls: number;
  totalCoinsSpent: number;
}

export interface LeaderboardEntry {
  userId: string;
  email: string | null;
  pullCount: number;
  coinsSpent: number;
}

export interface RarityBreakdown {
  rarity: string;
  count: number;
}
