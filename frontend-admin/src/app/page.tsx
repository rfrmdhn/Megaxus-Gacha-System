"use client";

import { useRequireAdmin } from "@/lib/useRequireAdmin";
import { StatCard } from "@/components/molecules/StatCard";
import { Skeleton } from "@/components/atoms/Skeleton";
import { useStats } from "@/features/stats/hooks/useStats";

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-black/10">
            <div className="h-1 bg-black/10" />
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, checking } = useRequireAdmin();
  const { stats, loading, error } = useStats(user);

  if (checking) return <DashboardSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="border-l-4 border-brand-purple pl-3 text-2xl font-semibold">Dashboard</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-black/50">Loading stats…</p>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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
