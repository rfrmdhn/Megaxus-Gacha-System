"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useRequireAdmin } from "@/lib/useRequireAdmin";
import { StatCard } from "@/components/StatCard";

interface AdminStats {
  totalUsers: number;
  activeEvents: number;
  totalEvents: number;
  pullsToday: number;
  totalPulls: number;
  totalCoinsSpent: number;
}

export default function DashboardPage() {
  const user = useRequireAdmin();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadStats() {
    try {
      const data = await apiFetch<AdminStats>("/admin/stats");
      setStats(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // loadStats' setState calls happen after an await, not synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) void loadStats();
  }, [user]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="border-l-4 border-brand-purple pl-3 text-2xl font-semibold">Dashboard</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-black/50 dark:text-white/50">Loading stats…</p>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Total users" value={stats.totalUsers} />
          <StatCard label="Active events" value={stats.activeEvents} />
          <StatCard label="Total events" value={stats.totalEvents} />
          <StatCard label="Pulls today" value={stats.pullsToday} />
          <StatCard label="Total pulls" value={stats.totalPulls} />
          <StatCard label="Coins spent total" value={stats.totalCoinsSpent} />
        </div>
      ) : null}
    </div>
  );
}
