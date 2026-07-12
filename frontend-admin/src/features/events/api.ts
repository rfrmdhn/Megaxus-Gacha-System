import { apiFetch, apiFetchBlob } from "@/lib/api";
import { AdminEvent, AdminItem } from "./types";

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
): Promise<AdminItem> {
  return apiFetch<AdminItem>(`/admin/events/${eventId}/items`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateItem(
  itemId: string,
  body: Partial<{ name: string; rarity: string; dropRate: number }>,
): Promise<AdminItem> {
  return apiFetch<AdminItem>(`/admin/items/${itemId}`, { method: "PUT", body: JSON.stringify(body) });
}

export function deleteItem(itemId: string): Promise<void> {
  return apiFetch<void>(`/admin/items/${itemId}`, { method: "DELETE" });
}

export function uploadItemImage(itemId: string, file: File): Promise<AdminItem> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<AdminItem>(`/admin/items/${itemId}/image`, { method: "POST", body: formData });
}

export function removeItemImage(itemId: string): Promise<void> {
  return apiFetch<void>(`/admin/items/${itemId}/image`, { method: "DELETE" });
}

export function fetchItemImage(itemId: string): Promise<Blob> {
  return apiFetchBlob(`/admin/items/${itemId}/image`);
}
