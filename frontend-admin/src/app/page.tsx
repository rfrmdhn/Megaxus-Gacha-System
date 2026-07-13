"use client";

import { useRequireAdmin } from "@/lib/useRequireAdmin";
import { StatCard } from "@/components/molecules/StatCard";
import { Card } from "@/components/molecules/Card";
import { Select } from "@/components/atoms/Select";
import { Skeleton } from "@/components/atoms/Skeleton";
import { useStats } from "@/features/stats/hooks/useStats";
import { useEvents } from "@/features/events/hooks/useEvents";
import { RarityChart } from "@/features/stats/components/RarityChart";
import { LeaderboardCard } from "@/features/stats/components/LeaderboardCard";

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

function LiveBadge({ connected }: { connected: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-black/50">
      <span
        className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-black/20"}`}
        aria-hidden="true"
      />
      {connected ? "Live" : "Offline"}
    </span>
  );
}

export default function DashboardPage() {
  const { user, checking } = useRequireAdmin();
  const { stats, leaderboard, rarityCounts, eventFilter, setEventFilter, connected, loading, error } =
    useStats(user);
  const { events } = useEvents(user);

  if (checking) return <DashboardSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="border-l-4 border-brand-red-600 pl-3 text-2xl font-semibold">Dashboard</h1>
        <LiveBadge connected={connected} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-black/50">Loading stats…</p>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Total users" value={stats.totalUsers} />
            <StatCard label="Active events" value={stats.activeEvents} />
            <StatCard label="Total events" value={stats.totalEvents} />
            <StatCard label="Pulls today" value={stats.pullsToday} />
            <StatCard label="Total pulls" value={stats.totalPulls} />
            <StatCard label="Coins spent total" value={stats.totalCoinsSpent} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Live pulls by rarity</h2>
                <Select
                  size="sm"
                  value={eventFilter ?? ""}
                  onChange={(e) => setEventFilter(e.target.value || null)}
                  aria-label="Filter live pulls by event"
                >
                  <option value="">All events</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </Select>
              </div>
              <RarityChart data={rarityCounts} />
            </Card>
            <LeaderboardCard entries={leaderboard} />
          </div>
        </>
      ) : null}
    </div>
  );
}
