import { apiFetch } from "@/lib/api";
import { AdminEvent } from "./types";

export interface EventInput {
  name: string;
  startsAt: string;
  endsAt: string;
}

export function listEvents(): Promise<AdminEvent[]> {
  return apiFetch<AdminEvent[]>("/admin/events");
}

export function createEvent(body: EventInput): Promise<AdminEvent> {
  return apiFetch<AdminEvent>("/admin/events", { method: "POST", body: JSON.stringify(body) });
}

export function updateEvent(id: string, body: Partial<EventInput & { isActive: boolean }>): Promise<AdminEvent> {
  return apiFetch<AdminEvent>(`/admin/events/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export function deleteEvent(id: string): Promise<void> {
  return apiFetch<void>(`/admin/events/${id}`, { method: "DELETE" });
}

export function addEventItem(
  eventId: string,
  body: { name: string; rarity: string; dropRate: number },
): Promise<void> {
  return apiFetch<void>(`/admin/events/${eventId}/items`, { method: "POST", body: JSON.stringify(body) });
}

export function deleteItem(itemId: string): Promise<void> {
  return apiFetch<void>(`/admin/items/${itemId}`, { method: "DELETE" });
}
