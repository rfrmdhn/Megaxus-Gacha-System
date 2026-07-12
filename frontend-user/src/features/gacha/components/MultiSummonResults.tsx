"use client";

import { PullResult } from "../types";
import { RARITY_TREATMENTS, highestRarity } from "../lib/rarity";
import { RewardCard } from "./RewardCard";

interface MultiSummonResultsProps {
  results: PullResult[];
  onContinue: () => void;
}

export function MultiSummonResults({ results, onContinue }: MultiSummonResultsProps) {
  const best = highestRarity(results.map((r) => r.item.rarity));
  const bestTreatment = RARITY_TREATMENTS[best];

  return (
    <div
      className="rounded-3xl bg-brand-ink/95 p-6 text-white shadow-2xl"
      style={{ boxShadow: `0 0 60px ${bestTreatment.palette.glow}` }}
      data-testid="multi-summon-results"
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-lg font-bold">Summon results ({results.length})</p>
        <p className="text-sm text-white/70">
          Best pull: <span className="font-semibold capitalize" style={{ color: bestTreatment.palette.via }}>{best}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {results.map((result, i) => (
          <RewardCard key={i} result={result} compact />
        ))}
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="mt-6 w-full rounded-full bg-white/15 py-3 text-sm font-semibold transition-colors hover:bg-white/25"
      >
        Continue
      </button>
    </div>
  );
}
