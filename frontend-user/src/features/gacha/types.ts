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

// Result of a client-side multi-summon (the backend only pulls one at a time).
// `results` holds every pull that succeeded before an error (if any) stopped
// the batch; `remainingCoins` is the balance after the last successful pull.
export interface MultiPullResult {
  results: PullResult[];
  remainingCoins: number;
}
