"use client";

import { useEffect, useRef, useState } from "react";
import { Rarity, RevealPhase, getRevealTimeline } from "../lib/rarity";

export interface RevealSequenceOptions {
  /** The rarity being revealed, or null when idle. */
  rarity: Rarity | null;
  /** Animation speed multiplier (>0). Higher = faster. */
  speed?: number;
  /** Jump straight to the reward, skipping the cinematic. */
  skip?: boolean;
  /** Respect prefers-reduced-motion — also collapses to an instant reveal. */
  reducedMotion?: boolean;
  onComplete?: () => void;
}

export interface RevealSequenceState {
  phase: RevealPhase;
  isRevealed: boolean;
}

/**
 * Drives the reveal phase machine off timers. All timing lives here (fully
 * testable with fake timers); visual components merely react to `phase`.
 */
export function useRevealSequence({
  rarity,
  speed = 1,
  skip = false,
  reducedMotion = false,
  onComplete,
}: RevealSequenceOptions): RevealSequenceState {
  const [phase, setPhase] = useState<RevealPhase>("idle");

  // Keep the latest onComplete without re-running the timer effect when the
  // caller passes a new function identity each render.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  // This effect IS the timer-driven phase machine — setting phase on mount and
  // advancing it on timers is its purpose, not an accidental cascading render.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!rarity) {
      setPhase("idle");
      return;
    }

    if (skip || reducedMotion) {
      setPhase("revealed");
      onCompleteRef.current?.();
      return;
    }

    const timeline = getRevealTimeline(rarity);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;

    setPhase(timeline[0].phase);

    timeline.forEach((step, index) => {
      elapsed += step.ms / speed;
      const next = timeline[index + 1];
      timers.push(
        setTimeout(() => {
          if (next) {
            setPhase(next.phase);
          } else {
            setPhase("revealed");
            onCompleteRef.current?.();
          }
        }, elapsed),
      );
    });

    return () => timers.forEach(clearTimeout);
  }, [rarity, speed, skip, reducedMotion]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { phase, isRevealed: phase === "revealed" };
}
