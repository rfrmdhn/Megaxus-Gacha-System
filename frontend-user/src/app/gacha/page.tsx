"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CoinBadge } from "@/components/molecules/CoinBadge";
import { Button } from "@/components/atoms/Button";
import { Checkbox } from "@/components/atoms/Checkbox";
import { Skeleton } from "@/components/Skeleton";
import { useGacha } from "@/features/gacha/hooks/useGacha";
import { EventSelector } from "@/features/gacha/components/EventSelector";
import { DropRateList } from "@/features/gacha/components/DropRateList";
import { PullResultCard } from "@/features/gacha/components/PullResultCard";
import { PullRevealAnimation } from "@/features/gacha/components/PullRevealAnimation";

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

function GachaPageContent() {
  const eventId = useSearchParams().get("eventId");
  const {
    checking,
    profile,
    events,
    selectedEventId,
    setSelectedEventId,
    items,
    pulling,
    revealing,
    skipAnimation,
    setSkipAnimation,
    result,
    error,
    pull,
  } = useGacha(eventId);

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

          <div className="flex flex-wrap items-center gap-4">
            <Button
              onClick={pull}
              disabled={pulling || revealing}
              className="rounded px-6 py-3 text-lg font-semibold"
            >
              {pulling ? "Pulling..." : revealing ? "Revealing..." : "Pull (10 coins)"}
            </Button>

            <Checkbox
              id="skip-animation"
              label="Skip animation"
              checked={skipAnimation}
              onChange={(e) => setSkipAnimation(e.target.checked)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {revealing && <PullRevealAnimation />}

          {result && <PullResultCard result={result} />}
        </>
      )}
    </div>
  );
}

export default function GachaPage() {
  return (
    <Suspense fallback={<GachaSkeleton />}>
      <GachaPageContent />
    </Suspense>
  );
}
