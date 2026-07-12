"use client";

import { CoinBadge } from "@/components/molecules/CoinBadge";
import { Button } from "@/components/atoms/Button";
import { Skeleton, TableSkeleton } from "@/components/Skeleton";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { HistoryTable } from "@/features/profile/components/HistoryTable";

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between rounded border border-black/10 p-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <div>
        <Skeleton className="mb-3 h-6 w-40" />
        <TableSkeleton cols={5} />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { checking, profile, history, hasMore, loading, loadMore } = useProfile();

  if (checking || !profile) return <ProfileSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      {profile && (
        <div className="flex items-center justify-between rounded border border-black/10 p-4">
          <span>{profile.email}</span>
          <CoinBadge coins={profile.coins} />
        </div>
      )}

      <div>
        <h1 className="mb-3 border-l-4 border-brand-purple pl-3 text-xl font-semibold">Gacha history</h1>
        {history.length === 0 && !loading ? (
          <p className="text-black/60">No pulls yet.</p>
        ) : (
          <HistoryTable history={history} />
        )}
        {hasMore && (
          <Button
            variant="secondary"
            onClick={loadMore}
            disabled={loading}
            className="mt-4 rounded px-4 py-2 text-sm"
          >
            {loading ? "Loading..." : "Load more"}
          </Button>
        )}
      </div>
    </div>
  );
}
