"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { getItemIcon } from "@/lib/itemIcon";
import { PullResult } from "../types";
import { getTreatment } from "../lib/rarity";

interface RewardCardProps {
  result: PullResult;
  /** Enable pointer-driven 3D tilt (off for grids / reduced motion). */
  interactive?: boolean;
  /** Smaller layout for the multi-summon grid. */
  compact?: boolean;
  showContinue?: boolean;
  onContinue?: () => void;
}

const MAX_TILT_DEG = 14;

export function RewardCard({
  result,
  interactive = false,
  compact = false,
  showContinue = false,
  onContinue,
}: RewardCardProps) {
  const treatment = getTreatment(result.item.rarity);
  const { palette } = treatment;
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Pointer events unify mouse + touch + pen, so one handler covers all inputs.
  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!interactive) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    setTilt({ x: (0.5 - py) * MAX_TILT_DEG, y: (px - 0.5) * MAX_TILT_DEG });
  }

  function handlePointerLeave() {
    setTilt({ x: 0, y: 0 });
  }

  const artworkSize = compact ? "h-14 w-14" : "h-28 w-28";

  return (
    <div style={{ perspective: 900 }} data-testid="reward-card">
      <motion.div
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 20 }}
        style={{
          rotateX: tilt.x,
          rotateY: tilt.y,
          boxShadow: `0 0 40px ${palette.glow}, 0 0 90px ${palette.glow}`,
          backgroundImage: `linear-gradient(120deg, ${palette.from}, ${palette.via}, ${palette.to})`,
        }}
        className="animate-border-shimmer rounded-3xl p-[3px]"
      >
        <div
          className={`animate-float-slow flex flex-col items-center gap-3 rounded-[calc(1.5rem-3px)] bg-brand-ink/95 text-center text-white ${
            compact ? "px-4 py-4" : "px-8 py-8"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getItemIcon(result.item.rarity)}
            alt={result.item.rarity}
            className={`${artworkSize} drop-shadow-[0_0_18px_var(--glow)]`}
            style={{ ["--glow" as string]: palette.glow }}
          />
          <p className="text-sm text-white/60">You got:</p>
          <p className={compact ? "text-base font-semibold" : "text-2xl font-bold"}>{result.item.name}</p>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest"
            style={{ backgroundColor: palette.glow, color: "#fff" }}
          >
            <span className="capitalize">{result.item.rarity}</span>
          </span>
          {showContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="mt-2 rounded-full bg-white/15 px-6 py-2 text-sm font-semibold transition-colors hover:bg-white/25"
            >
              Continue
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
