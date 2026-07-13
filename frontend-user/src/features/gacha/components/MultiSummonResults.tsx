"use client";

import { MultiPullResult } from "../types";
import { getTreatment } from "../lib/rarity";
import { RewardCard } from "./RewardCard";

interface MultiSummonResultsProps {
  data: MultiPullResult;
  onContinue: () => void;
}

export function MultiSummonResults({ data, onContinue }: MultiSummonResultsProps) {
  const { results, bestRarity, worstRarity } = data;
  // `bestRarity`/`worstRarity` are decided by the backend; we only display them.
  // getTreatment degrades an unknown label's colour gracefully to common.
  const bestTreatment = getTreatment(bestRarity);
  const worstTreatment = getTreatment(worstRarity);

  return (
    <div
      className="rounded-3xl bg-brand-gray-950/95 p-6 text-white shadow-2xl"
      style={{ boxShadow: `0 0 60px ${bestTreatment.palette.glow}` }}
      data-testid="multi-summon-results"
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-lg font-bold">Summon results ({results.length})</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/70">
          <p>
            Best pull:{" "}
            <span className="font-semibold capitalize" style={{ color: bestTreatment.palette.via }}>
              {bestRarity}
            </span>
          </p>
          <p>
            Worst pull:{" "}
            <span className="font-semibold capitalize" style={{ color: worstTreatment.palette.via }}>
              {worstRarity}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {results.map((result, i) => (
          <RewardCard key={i} result={result} compact entranceDelay={i * 0.08} />
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
