"use client";

import { CoinBadge } from "@/components/molecules/CoinBadge";
import { Button } from "@/components/atoms/Button";
import { Skeleton } from "@/components/Skeleton";
import { useGacha } from "@/features/gacha/hooks/useGacha";
import { EventSelector } from "@/features/gacha/components/EventSelector";
import { DropRateList } from "@/features/gacha/components/DropRateList";
import { PullResultCard } from "@/features/gacha/components/PullResultCard";

function GachaSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between rounded border border-black/10 p-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <div>
        <Skeleton className="mb-1 h-4 w-16" />
        <Skeleton className="h-10 w-full rounded" />
      </div>
      <div className="rounded border border-black/10 p-4">
        <Skeleton className="mb-2 h-5 w-28" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="h-12 w-48 rounded" />
    </div>
  );
}

export default function GachaPage() {
  const {
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
  } = useGacha();

  if (checking || !profile) return <GachaSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between rounded border border-black/10 p-4">
        <span>
          Signed in as <strong>{profile.email}</strong>
        </span>
        <CoinBadge coins={profile.coins} />
      </div>

      {events.length === 0 ? (
        <p className="text-black/60">No active gacha events right now.</p>
      ) : (
        <>
          <EventSelector events={events} selectedEventId={selectedEventId} onChange={setSelectedEventId} />

          {items.length > 0 && <DropRateList items={items} />}

          <Button onClick={pull} disabled={pulling} className="rounded px-6 py-3 text-lg font-semibold">
            {pulling ? "Pulling..." : "Pull (10 coins)"}
          </Button>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {result && <PullResultCard result={result} />}
        </>
      )}
    </div>
  );
}
