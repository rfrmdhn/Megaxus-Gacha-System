"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { GachaEvent } from "@/features/gacha/types";
import { listEvents } from "@/features/gacha/api";

export function useEvents() {
  const { checking } = useRequireAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<GachaEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (checking) return;
    void loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking]);

  async function loadEvents() {
    try {
      const list = await listEvents();
      setEvents(list);
    } catch {
      setError("Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  return { checking: checking || loading, events, error };
}
