import { apiFetch } from "@/lib/api";
import { GachaEvent, EventItem, PullResult } from "./types";

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
