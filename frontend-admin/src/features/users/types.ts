export interface AdminUser {
  id: string;
  email: string;
  role: "user" | "admin";
  coins: number;
  isBanned: boolean;
  pullCount: number;
  createdAt: string;
}

export interface RecentHistoryItem {
  id: string;
  eventName: string;
  itemName: string;
  rarity: string;
  coinsSpent: number;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUser {
  recentHistory: RecentHistoryItem[];
}

export interface UsersListResponse {
  items: AdminUser[];
  nextCursor: string | null;
}
