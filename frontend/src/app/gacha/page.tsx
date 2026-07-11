"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

interface GachaEvent {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
}

interface EventItem {
  id: string;
  name: string;
  rarity: string;
  dropRate: string;
}

interface Profile {
  id: string;
  email: string;
  coins: number;
}

interface PullResult {
  item: { id: string; name: string; rarity: string };
  remainingCoins: number;
}

export default function GachaPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<GachaEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [items, setItems] = useState<EventItem[]>([]);
  const [pulling, setPulling] = useState(false);
  const [result, setResult] = useState<PullResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getCurrentUser()) {
      router.push("/login");
      return;
    }
    void refreshProfile();
    void loadEvents();
  }, [router]);

  useEffect(() => {
    if (!selectedEventId) return;
    apiFetch<{ items: EventItem[] }>(`/events/${selectedEventId}`)
      .then((event) => setItems(event.items))
      .catch(() => setItems([]));
  }, [selectedEventId]);

  async function refreshProfile() {
    try {
      const p = await apiFetch<Profile>("/user/profile");
      setProfile(p);
    } catch {
      router.push("/login");
    }
  }

  async function loadEvents() {
    try {
      const list = await apiFetch<GachaEvent[]>("/events");
      setEvents(list);
      if (list.length > 0) setSelectedEventId(list[0].id);
    } catch {
      setEvents([]);
    }
  }

  async function pull() {
    if (!selectedEventId) return;
    setPulling(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiFetch<PullResult>("/gacha/pull", {
        method: "POST",
        body: JSON.stringify({ eventId: selectedEventId }),
      });
      setResult(res);
      setProfile((p) => (p ? { ...p, coins: res.remainingCoins } : p));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Pull failed");
    } finally {
      setPulling(false);
    }
  }

  if (!profile) return <p>Loading...</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between rounded border border-black/10 p-4 dark:border-white/10">
        <span>
          Signed in as <strong>{profile.email}</strong>
        </span>
        <span className="text-lg font-semibold">{profile.coins} coins</span>
      </div>

      {events.length === 0 ? (
        <p className="text-black/60 dark:text-white/60">No active gacha events right now.</p>
      ) : (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium">Event</label>
            <select
              value={selectedEventId ?? ""}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/20"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          {items.length > 0 && (
            <div className="rounded border border-black/10 p-4 dark:border-white/10">
              <h2 className="mb-2 font-medium">Drop rates</h2>
              <ul className="flex flex-col gap-1 text-sm">
                {items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>
                      {item.name} <span className="text-black/50 dark:text-white/50">({item.rarity})</span>
                    </span>
                    <span>{item.dropRate}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={pull}
            disabled={pulling}
            className="rounded bg-black px-6 py-3 text-lg font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {pulling ? "Pulling..." : "Pull (10 coins)"}
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {result && (
            <div className="rounded border border-black/10 p-4 dark:border-white/10">
              <p className="text-sm text-black/60 dark:text-white/60">You got:</p>
              <p className="text-xl font-semibold">{result.item.name}</p>
              <p className="text-sm capitalize text-black/60 dark:text-white/60">
                {result.item.rarity}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
