export interface Profile {
  id: string;
  email: string;
  coins: number;
}

export interface HistoryItem {
  id: string;
  eventName: string;
  itemName: string;
  rarity: string;
  coinsSpent: number;
  createdAt: string;
}

export interface HistoryPage {
  items: HistoryItem[];
  nextCursor: string | null;
}
