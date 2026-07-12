"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { Profile } from "@/features/profile/types";
import { getProfile } from "@/features/profile/api";
import { GachaEvent, EventItem, PullResult } from "../types";
import { listEvents, getEvent, pull as pullApi } from "../api";

export function useGacha() {
  const router = useRouter();
  const { checking } = useRequireAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<GachaEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [items, setItems] = useState<EventItem[]>([]);
  const [pulling, setPulling] = useState(false);
  const [result, setResult] = useState<PullResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (checking) return;
    void refreshProfile();
    void loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking]);

  useEffect(() => {
    if (!selectedEventId) return;
    getEvent(selectedEventId)
      .then((event) => setItems(event.items))
      .catch(() => setItems([]));
  }, [selectedEventId]);

  async function refreshProfile() {
    try {
      const p = await getProfile();
      setProfile(p);
    } catch {
      router.push("/login");
    }
  }

  async function loadEvents() {
    try {
      const list = await listEvents();
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
      const res = await pullApi(selectedEventId);
      setResult(res);
      setProfile((p) => (p ? { ...p, coins: res.remainingCoins } : p));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Pull failed");
    } finally {
      setPulling(false);
    }
  }

  return {
    checking,
    profile,
    events,
    selectedEventId,
    setSelectedEventId,
    items,
    pulling,
    result,
    error,
    pull,
  };
}
