"use client";

import { useEffect, useRef, useState } from "react";
import { ClockCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { apiFetch, ApiError, sseUrl } from "@/lib/api";
import { useRequireAdmin } from "@/lib/useRequireAdmin";
import { Card } from "@/components/Card";

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
  const user = useRequireAdmin();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<LivePullEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [search, setSearch] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!user) return;

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
  }, [user]);

  async function loadPage(after: string | null, replace: boolean) {
    if (replace) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const qs = after ? `?cursor=${after}&limit=20` : "?limit=20";
      const page = await apiFetch<HistoryPage>(`/admin/history${qs}`);
      setHistory((prev) => (replace ? page.items : [...prev, ...page.items]));
      setCursor(page.nextCursor);
      setHasMore(page.nextCursor !== null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const filteredHistory = history.filter((h) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      h.userEmail.toLowerCase().includes(q) ||
      h.eventName.toLowerCase().includes(q) ||
      h.itemName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 border-l-4 border-brand-purple pl-3 text-2xl font-semibold">
          <ClockCircleOutlined className="text-brand-purple" />
          Live gacha history
        </h1>
        <button
          type="button"
          onClick={() => void loadPage(null, true)}
          className="flex items-center gap-2 rounded-lg border border-black/15 px-4 py-2 text-sm transition-colors hover:border-brand-purple/50"
        >
          <ReloadOutlined /> Reload
        </button>
      </div>

      <Card>
        <div className="mb-2 flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-sm">{connected ? "Live" : "Disconnected"}</span>
        </div>
        {live.length === 0 ? (
          <p className="text-sm text-black/50">
            Waiting for pulls — this list updates in real time as users pull.
          </p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {live.map((event, i) => (
              <li key={i}>
                <strong>{event.userEmail}</strong> pulled <strong>{event.itemName}</strong> ({event.rarity}) from{" "}
                {event.eventName} — {new Date(event.createdAt).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">All history (paginated)</h2>
          <input
            placeholder="Filter by user, event, or item"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-black/50">Loading history…</p>
        ) : filteredHistory.length === 0 ? (
          <p className="text-sm text-black/50">No history found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left">
                  <th className="py-2">User</th>
                  <th className="py-2">Event</th>
                  <th className="py-2">Item</th>
                  <th className="py-2">Rarity</th>
                  <th className="py-2">Cost</th>
                  <th className="py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((h) => (
                  <tr key={h.id} className="border-b border-black/5">
                    <td className="py-2">{h.userEmail}</td>
                    <td className="py-2">{h.eventName}</td>
                    <td className="py-2">{h.itemName}</td>
                    <td className="py-2 capitalize">{h.rarity}</td>
                    <td className="py-2">{h.coinsSpent}</td>
                    <td className="py-2 text-black/50">{new Date(h.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {hasMore && (
          <button
            onClick={() => loadPage(cursor, false)}
            disabled={loadingMore}
            className="self-start rounded-lg border border-black/15 px-4 py-2 text-sm transition-colors hover:border-brand-purple/50 disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        )}
      </Card>
    </div>
  );
}
