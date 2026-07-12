import { apiFetch } from "@/lib/api";
import { GachaEvent, EventItem, PullResult, MultiPullResult } from "./types";

interface BulkPullResponse {
  items: PullResult["item"][];
  bestRarity: string;
  remainingCoins: number;
}

export function listEvents(): Promise<GachaEvent[]> {
  return apiFetch<GachaEvent[]>("/events");
}

export function getEvent(id: string): Promise<{ items: EventItem[] }> {
  return apiFetch<{ items: EventItem[] }>(`/events/${id}`);
}

export function pull(eventId: string): Promise<PullResult> {
  return apiFetch<PullResult>("/gacha/pull", {
    method: "POST",
    body: JSON.stringify({ eventId }),
  });
}

// One bulk request: the backend charges `count` pulls all-or-nothing and
// returns every pulled item plus the best (rarest) rarity it computed.
export async function pullMany(eventId: string, count: number): Promise<MultiPullResult> {
  const res = await apiFetch<BulkPullResponse>("/gacha/pull-bulk", {
    method: "POST",
    body: JSON.stringify({ eventId, count }),
  });
  return {
    results: res.items.map((item) => ({ item, remainingCoins: res.remainingCoins })),
    bestRarity: res.bestRarity,
    remainingCoins: res.remainingCoins,
  };
}
