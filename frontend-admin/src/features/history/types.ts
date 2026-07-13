export interface HistoryItem {
  id: string;
  userId: string;
  userEmail: string;
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

export interface LivePullEvent {
  userEmail: string;
  eventName: string;
  itemName: string;
  rarity: string;
  createdAt: string;
}
