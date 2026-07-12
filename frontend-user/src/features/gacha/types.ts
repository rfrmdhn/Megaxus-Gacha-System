export interface GachaEvent {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
}

export interface EventItem {
  id: string;
  name: string;
  rarity: string;
  dropRate: string;
}

export interface PullResult {
  item: { id: string; name: string; rarity: string };
  remainingCoins: number;
}
