"use client";

import { useState } from "react";
import { ClockCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { useRequireAdmin } from "@/lib/useRequireAdmin";
import { Card } from "@/components/molecules/Card";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Skeleton, TableSkeleton } from "@/components/atoms/Skeleton";
import { useHistoryFeed } from "@/features/history/hooks/useHistoryFeed";
import { HistoryTable } from "@/features/history/components/HistoryTable";
import { LiveFeed } from "@/features/history/components/LiveFeed";

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <Card>
        <Skeleton className="h-4 w-64" />
      </Card>
      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-56 rounded-lg" />
        </div>
        <TableSkeleton cols={6} />
      </Card>
    </div>
  );
}

export default function AdminHistoryPage() {
  const { user, checking } = useRequireAdmin();
  const { history, cursor, hasMore, loading, loadingMore, error, live, connected, loadPage } = useHistoryFeed(user);
  const [search, setSearch] = useState("");

  const filteredHistory = history.filter((h) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      h.userEmail.toLowerCase().includes(q) ||
      h.eventName.toLowerCase().includes(q) ||
      h.itemName.toLowerCase().includes(q)
    );
  });

  if (checking) return <HistorySkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 border-l-4 border-brand-red-600 pl-3 text-2xl font-semibold">
          <ClockCircleOutlined className="text-brand-red-600" />
          Live gacha history
        </h1>
        <Button
          variant="outline"
          onClick={() => void loadPage(null, true)}
          className="flex items-center gap-2 hover:border-brand-red-600/50"
        >
          <ReloadOutlined /> Reload
        </Button>
      </div>

      <Card>
        <LiveFeed connected={connected} events={live} />
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">All history (paginated)</h2>
          <Input
            placeholder="Filter by user, event, or item"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-black/50">Loading history…</p>
        ) : filteredHistory.length === 0 ? (
          <p className="text-sm text-black/50">No history found.</p>
        ) : (
          <HistoryTable items={filteredHistory} />
        )}
        {hasMore && (
          <Button
            variant="outline"
            onClick={() => loadPage(cursor, false)}
            disabled={loadingMore}
            className="self-start hover:border-brand-red-600/50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        )}
      </Card>
    </div>
  );
}
