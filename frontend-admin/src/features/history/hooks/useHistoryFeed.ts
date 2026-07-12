"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, sseUrl } from "@/lib/api";
import { JwtPayload } from "@/lib/auth";
import { HistoryItem, LivePullEvent } from "../types";
import { listHistory } from "../api";

export function useHistoryFeed(user: JwtPayload | null) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<LivePullEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  async function loadPage(after: string | null, replace: boolean) {
    if (replace) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const page = await listHistory(after, 20);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return { history, cursor, hasMore, loading, loadingMore, error, live, connected, loadPage };
}
