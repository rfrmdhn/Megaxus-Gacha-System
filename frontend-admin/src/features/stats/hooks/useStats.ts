"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, sseUrl } from "@/lib/api";
import { getConfig, SystemConfig } from "@/lib/config";
import { JwtPayload } from "@/lib/auth";
import { AdminStats, LeaderboardEntry, RarityBreakdown } from "../types";
import { getLeaderboard, getRarityBreakdown, getStats } from "../api";

interface PullEvent {
  eventId: string;
  rarity: string;
}

const DEFAULT_REFRESH_DEBOUNCE_MS = 500;

export type EventFilter = string | null;

/**
 * Dashboard data with a live feed: the initial load fetches stats + leaderboard
 * plus the all-time rarity breakdown (optionally scoped to `eventFilter`), then
 * the same SSE stream that powers the history live feed drives real-time
 * updates — each pull that matches the current event filter increments the
 * rarity chart in place and triggers a debounced refetch of the aggregate
 * numbers so the cards and leaderboard stay current.
 */
export function useStats(user: JwtPayload | null) {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [rarityCounts, setRarityCounts] = useState<RarityBreakdown[]>([]);
  const [eventFilter, setEventFilter] = useState<EventFilter>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventFilterRef = useRef(eventFilter);
  useEffect(() => {
    eventFilterRef.current = eventFilter;
  }, [eventFilter]);

  async function load() {
    try {
      const [cfg, s, lb] = await Promise.all([
        getConfig(),
        getStats(),
        getLeaderboard(),
      ]);
      setConfig(cfg);
      setStats(s);
      setLeaderboard(lb);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    try {
      const [s, lb] = await Promise.all([getStats(), getLeaderboard()]);
      setStats(s);
      setLeaderboard(lb);
    } catch {
      /* keep previous values */
    }
  }

  async function loadRarityBreakdown(filter: EventFilter) {
    try {
      const breakdown = await getRarityBreakdown(filter ?? undefined);
      setRarityCounts(breakdown);
    } catch {
      /* keep previous values */
    }
  }

  useEffect(() => {
    if (!user) return;
    void loadRarityBreakdown(eventFilter);
  }, [user, eventFilter]);

  useEffect(() => {
    if (!user) return;

    void load();

    const es = new EventSource(sseUrl("/admin/history/stream"));
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.addEventListener("pull", (event: MessageEvent) => {
      const data = JSON.parse(event.data) as PullEvent;
      const filter = eventFilterRef.current;
      if (filter === null || data.eventId === filter) {
        setRarityCounts((prev) => {
          const existing = prev.find((entry) => entry.rarity === data.rarity);
          if (!existing) return [...prev, { rarity: data.rarity, count: 1 }];
          return prev.map((entry) =>
            entry.rarity === data.rarity ? { ...entry, count: entry.count + 1 } : entry,
          );
        });
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const debounceMs = config?.REFRESH_DEBOUNCE_MS ?? DEFAULT_REFRESH_DEBOUNCE_MS;
      debounceRef.current = setTimeout(() => void refresh(), debounceMs);
    });

    return () => {
      es.close();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    stats,
    leaderboard,
    rarityCounts,
    eventFilter,
    setEventFilter,
    connected,
    loading,
    error,
    load,
  };
}
