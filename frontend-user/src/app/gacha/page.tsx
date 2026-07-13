"use client";

import { Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { CoinBadge } from "@/components/molecules/CoinBadge";
import { Skeleton } from "@/components/Skeleton";
import { useGacha } from "@/features/gacha/hooks/useGacha";
import { EventSelector } from "@/features/gacha/components/EventSelector";
import { DropRateList } from "@/features/gacha/components/DropRateList";
import { BackgroundEffects } from "@/features/gacha/components/BackgroundEffects";
import { SummonButton } from "@/features/gacha/components/SummonButton";
import { SummonControls } from "@/features/gacha/components/SummonControls";
import { RarityReveal } from "@/features/gacha/components/RarityReveal";
import { RewardCard } from "@/features/gacha/components/RewardCard";
import { MultiSummonResults } from "@/features/gacha/components/MultiSummonResults";

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
  const stageRef = useRef<HTMLDivElement>(null);
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
    speed,
    setSpeed,
    result,
    multiResult,
    pending,
    error,
    pull,
    pullTen,
    commitReveal,
    dismissReveal,
    clearResults,
    pullCost,
    muted,
    toggleMute,
    onSound,
    reducedMotion,
    toggleFullscreen,
    onVibrate,
  } = useGacha(eventId);

  if (checking || !profile) return <GachaSkeleton />;

  const busy = pulling || revealing;

  return (
    <div
      ref={stageRef}
      className="relative min-h-[75vh] overflow-hidden rounded-3xl bg-brand-gray-950 text-white shadow-2xl"
    >
      <BackgroundEffects dimmed={revealing} reducedMotion={reducedMotion} />

      <div className="relative z-10 flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
          <span>
            Signed in as <strong>{profile.email}</strong>
          </span>
          <CoinBadge coins={profile.coins} />
        </div>

        {events.length === 0 ? (
          <p className="text-white/60">No active gacha events right now.</p>
        ) : (
          <>
            <EventSelector events={events} selectedEventId={selectedEventId} onChange={setSelectedEventId} />

            {items.length > 0 && <DropRateList items={items} />}

            <div className="flex flex-wrap items-center gap-4">
              <SummonButton onClick={pull} disabled={busy}>
                {pulling ? "Pulling..." : revealing ? "Revealing..." : `Pull (${pullCost} coins)`}
              </SummonButton>

              <SummonButton variant="multi" onClick={pullTen} disabled={busy}>
                {`Summon 10x (${pullCost * 10} coins)`}
              </SummonButton>
            </div>

            <SummonControls
              skip={skipAnimation}
              onSkipChange={setSkipAnimation}
              speed={speed}
              onSpeedChange={setSpeed}
              muted={muted}
              onToggleMute={toggleMute}
              onToggleFullscreen={() => toggleFullscreen(stageRef.current!)}
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            {result && !revealing && (
              <div className="flex justify-center">
                <RewardCard result={result} interactive={!reducedMotion} />
              </div>
            )}

            {multiResult && !revealing && (
              <MultiSummonResults data={multiResult} onContinue={clearResults} />
            )}
          </>
        )}
      </div>

      {revealing && pending?.type === "single" && (
        <RarityReveal
          result={pending.result}
          speed={speed}
          reducedMotion={reducedMotion}
          onSound={onSound}
          onVibrate={onVibrate}
          onComplete={commitReveal}
          onContinue={dismissReveal}
        />
      )}

      {revealing && pending?.type === "multi" && (
        <RarityReveal
          multi={pending.data}
          speed={speed}
          reducedMotion={reducedMotion}
          onSound={onSound}
          onVibrate={onVibrate}
          onComplete={commitReveal}
          onContinue={dismissReveal}
        />
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
