"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { JwtPayload } from "@/lib/auth";
import { AdminStats } from "../types";
import { getStats } from "../api";

export function useStats(user: JwtPayload | null) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await getStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return { stats, loading, error, load };
}
