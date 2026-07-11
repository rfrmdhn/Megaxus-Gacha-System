"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

interface AdminItem {
  id: string;
  name: string;
  rarity: string;
  dropRate: string;
}

interface AdminEvent {
  id: string;
  name: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  items: AdminItem[];
}

function itemsTotal(items: AdminItem[]): number {
  return items.reduce((sum, i) => sum + parseFloat(i.dropRate), 0);
}

export default function AdminPage() {
  const router = useRouter();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newEventName, setNewEventName] = useState("");
  const [newEventStart, setNewEventStart] = useState("");
  const [newEventEnd, setNewEventEnd] = useState("");

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "admin") {
      router.push("/gacha");
      return;
    }
    void loadEvents();
  }, [router]);

  async function loadEvents() {
    try {
      const list = await apiFetch<AdminEvent[]>("/admin/events");
      setEvents(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load events");
    }
  }

  async function createEvent(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch("/admin/events", {
        method: "POST",
        body: JSON.stringify({
          name: newEventName,
          startsAt: new Date(newEventStart).toISOString(),
          endsAt: new Date(newEventEnd).toISOString(),
        }),
      });
      setNewEventName("");
      setNewEventStart("");
      setNewEventEnd("");
      void loadEvents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create event");
    }
  }

  async function addItem(eventId: string, name: string, rarity: string, dropRate: number) {
    setError(null);
    try {
      await apiFetch(`/admin/events/${eventId}/items`, {
        method: "POST",
        body: JSON.stringify({ name, rarity, dropRate }),
      });
      void loadEvents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add item");
    }
  }

  async function deleteItem(itemId: string) {
    setError(null);
    try {
      await apiFetch(`/admin/items/${itemId}`, { method: "DELETE" });
      void loadEvents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete item");
    }
  }

  async function toggleActive(event: AdminEvent) {
    setError(null);
    try {
      await apiFetch(`/admin/events/${event.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !event.isActive }),
      });
      void loadEvents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update event");
    }
  }

  async function deleteEvent(eventId: string) {
    setError(null);
    try {
      await apiFetch(`/admin/events/${eventId}`, { method: "DELETE" });
      void loadEvents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete event");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin: Events</h1>
        <Link href="/admin/history" className="underline">
          Live history →
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <form onSubmit={createEvent} className="flex flex-wrap items-end gap-3 rounded border border-black/10 p-4 dark:border-white/10">
        <div className="flex flex-col gap-1">
          <label className="text-xs">Name</label>
          <input
            required
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs">Starts</label>
          <input
            type="datetime-local"
            required
            value={newEventStart}
            onChange={(e) => setNewEventStart(e.target.value)}
            className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs">Ends</label>
          <input
            type="datetime-local"
            required
            value={newEventEnd}
            onChange={(e) => setNewEventEnd(e.target.value)}
            className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
          />
        </div>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black">
          New draft event
        </button>
      </form>

      <div className="flex flex-col gap-6">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onAddItem={addItem}
            onDeleteItem={deleteItem}
            onToggleActive={toggleActive}
            onDeleteEvent={deleteEvent}
          />
        ))}
      </div>
    </div>
  );
}

function EventCard({
  event,
  onAddItem,
  onDeleteItem,
  onToggleActive,
  onDeleteEvent,
}: {
  event: AdminEvent;
  onAddItem: (eventId: string, name: string, rarity: string, dropRate: number) => void;
  onDeleteItem: (itemId: string) => void;
  onToggleActive: (event: AdminEvent) => void;
  onDeleteEvent: (eventId: string) => void;
}) {
  const [itemName, setItemName] = useState("");
  const [rarity, setRarity] = useState("");
  const [dropRate, setDropRate] = useState("");
  const total = itemsTotal(event.items);

  function submitItem(e: FormEvent) {
    e.preventDefault();
    onAddItem(event.id, itemName, rarity, parseFloat(dropRate));
    setItemName("");
    setRarity("");
    setDropRate("");
  }

  return (
    <div className="rounded border border-black/10 p-4 dark:border-white/10">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">{event.name}</h2>
          <span
            className={`text-xs ${event.isActive ? "text-green-600" : "text-black/50 dark:text-white/50"}`}
          >
            {event.isActive ? "Active" : "Draft"} · total drop rate: {total}%
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onToggleActive(event)}
            className="rounded border border-black/20 px-3 py-1 text-xs dark:border-white/20"
          >
            {event.isActive ? "Deactivate" : "Activate"}
          </button>
          <button
            onClick={() => onDeleteEvent(event.id)}
            className="rounded border border-red-300 px-3 py-1 text-xs text-red-600"
          >
            Delete event
          </button>
        </div>
      </div>

      <table className="mb-3 w-full text-sm">
        <thead>
          <tr className="text-left text-black/50 dark:text-white/50">
            <th className="py-1">Item</th>
            <th className="py-1">Rarity</th>
            <th className="py-1">Drop rate</th>
            <th className="py-1"></th>
          </tr>
        </thead>
        <tbody>
          {event.items.map((item) => (
            <tr key={item.id} className="border-t border-black/5 dark:border-white/5">
              <td className="py-1">{item.name}</td>
              <td className="py-1 capitalize">{item.rarity}</td>
              <td className="py-1">{item.dropRate}%</td>
              <td className="py-1 text-right">
                <button onClick={() => onDeleteItem(item.id)} className="text-xs text-red-600 underline">
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={submitItem} className="flex flex-wrap items-end gap-2">
        <input
          required
          placeholder="Item name"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          className="rounded border border-black/20 px-2 py-1 text-sm dark:border-white/20"
        />
        <input
          required
          placeholder="Rarity"
          value={rarity}
          onChange={(e) => setRarity(e.target.value)}
          className="rounded border border-black/20 px-2 py-1 text-sm dark:border-white/20"
        />
        <input
          required
          type="number"
          step="0.01"
          min="0"
          max="100"
          placeholder="Drop rate %"
          value={dropRate}
          onChange={(e) => setDropRate(e.target.value)}
          className="w-28 rounded border border-black/20 px-2 py-1 text-sm dark:border-white/20"
        />
        <button type="submit" className="rounded border border-black/20 px-3 py-1 text-sm dark:border-white/20">
          Add item
        </button>
      </form>
    </div>
  );
}
