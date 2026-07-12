import { ApiError, apiFetch } from "@/lib/api";
import { GachaEvent, EventItem, PullResult, MultiPullResult } from "./types";

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

// The backend has no batch endpoint, so a multi-summon is N sequential pulls.
// We stop early on an ApiError (e.g. running out of coins mid-batch) and
// return whatever succeeded rather than throwing away the whole run. Any
// non-ApiError (network/unexpected) propagates so the caller shows it.
export async function pullMany(eventId: string, count: number): Promise<MultiPullResult> {
  const results: PullResult[] = [];
  for (let i = 0; i < count; i++) {
    try {
      results.push(await pull(eventId));
    } catch (err) {
      if (err instanceof ApiError && results.length > 0) break;
      throw err;
    }
  }
  return {
    results,
    remainingCoins: results[results.length - 1]?.remainingCoins ?? 0,
  };
}
