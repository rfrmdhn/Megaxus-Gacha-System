"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, sseUrl } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

interface HistoryItem {
  id: string;
  userId: string;
  userEmail: string;
  eventName: string;
  itemName: string;
  rarity: string;
  coinsSpent: number;
  createdAt: string;
}

interface HistoryPage {
  items: HistoryItem[];
  nextCursor: string | null;
}

interface LivePullEvent {
  userEmail: string;
  eventName: string;
  itemName: string;
  rarity: string;
  createdAt: string;
}

export default function AdminHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [live, setLive] = useState<LivePullEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

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

    void loadPage(null, true);

    const es = new EventSource(sseUrl("/admin/history/stream"));
    eventSourceRef.current = es;
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.addEventListener("pull", (event: MessageEvent) => {
      const data: LivePullEvent = JSON.parse(event.data);
      setLive((prev) => [data, ...prev].slice(0, 20));
    });

    return () => es.close();
  }, [router]);

  async function loadPage(after: string | null, replace: boolean) {
    const qs = after ? `?cursor=${after}&limit=20` : "?limit=20";
    const page = await apiFetch<HistoryPage>(`/admin/history${qs}`);
    setHistory((prev) => (replace ? page.items : [...prev, ...page.items]));
    setCursor(page.nextCursor);
    setHasMore(page.nextCursor !== null);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Admin: Live gacha history</h1>

      <div className="rounded border border-black/10 p-4 dark:border-white/10">
        <div className="mb-2 flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
          />
          <span className="text-sm">{connected ? "Live" : "Disconnected"}</span>
        </div>
        {live.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            Waiting for pulls — this list updates in real time as users pull.
          </p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {live.map((event, i) => (
              <li key={i}>
                <strong>{event.userEmail}</strong> pulled <strong>{event.itemName}</strong> (
                {event.rarity}) from {event.eventName} —{" "}
                {new Date(event.createdAt).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">All history (paginated)</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left dark:border-white/10">
              <th className="py-2">User</th>
              <th className="py-2">Event</th>
              <th className="py-2">Item</th>
              <th className="py-2">Rarity</th>
              <th className="py-2">Cost</th>
              <th className="py-2">When</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} className="border-b border-black/5 dark:border-white/5">
                <td className="py-2">{h.userEmail}</td>
                <td className="py-2">{h.eventName}</td>
                <td className="py-2">{h.itemName}</td>
                <td className="py-2 capitalize">{h.rarity}</td>
                <td className="py-2">{h.coinsSpent}</td>
                <td className="py-2 text-black/50 dark:text-white/50">
                  {new Date(h.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {hasMore && (
          <button
            onClick={() => loadPage(cursor, false)}
            className="mt-4 rounded border border-black/20 px-4 py-2 text-sm dark:border-white/20"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}
