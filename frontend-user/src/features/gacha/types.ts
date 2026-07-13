export interface GachaEvent {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  imageKey: string | null;
}

export interface EventItem {
  id: string;
  name: string;
  rarity: string;
  dropRate: string;
  imageKey: string | null;
}

export interface PullResult {
  item: { id: string; name: string; rarity: string; imageKey: string | null };
  remainingCoins: number;
}

// Result of a bulk summon (backend `POST /gacha/pull-bulk`). `results` holds
// every pulled item; `bestRarity` is the rarity of the rarest pull, decided by
// the backend (lowest drop rate) so the client never interprets rarity labels.
export interface MultiPullResult {
  results: PullResult[];
  bestRarity: string;
  remainingCoins: number;
}
