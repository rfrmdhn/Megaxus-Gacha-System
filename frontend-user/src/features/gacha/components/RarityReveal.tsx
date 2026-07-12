"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MultiPullResult, PullResult } from "../types";
import { RevealPhase, getTreatment } from "../lib/rarity";
import { SoundName } from "../hooks/useSoundManager";
import { useRevealSequence } from "../hooks/useRevealSequence";
import { BackgroundEffects } from "./BackgroundEffects";
import { SummonPortal } from "./SummonPortal";
import { ParticleField } from "./ParticleField";
import { RewardCard } from "./RewardCard";
import { MultiSummonResults } from "./MultiSummonResults";

interface RarityRevealBaseProps {
  speed: number;
  reducedMotion: boolean;
  onSound: (name: SoundName) => void;
  onVibrate: (pattern: number[]) => void;
  /** Fired when the sequence reaches its reward (commit coins/result). */
  onComplete: () => void;
  /** Fired when the user dismisses the reward. */
  onContinue: () => void;
}

// One reveal component, two payloads: a single pull reveals one card; a bulk
// pull plays one buildup (keyed on the backend's bestRarity) then reveals the
// whole grid. Exactly one of `result` / `multi` is provided.
type RarityRevealProps = RarityRevealBaseProps &
  (
    | { result: PullResult; multi?: undefined }
    | { multi: MultiPullResult; result?: undefined }
  );

const INTENSITY: Record<RevealPhase, number> = {
  idle: 0,
  charging: 0.2,
  portal: 0.4,
  buildup: 0.7,
  freeze: 0.5,
  spark: 0.8,
  flash: 1,
  burst: 1,
  pillars: 0.9,
  cardEmerge: 0.5,
  revealed: 0.3,
};

export function RarityReveal({
  result,
  multi,
  speed,
  reducedMotion,
  onSound,
  onVibrate,
  onComplete,
  onContinue,
}: RarityRevealProps) {
  // The buildup is driven by the rarest pull: the backend's bestRarity for a
  // bulk pull, or the single item's rarity otherwise.
  const buildupRarity = multi ? multi.bestRarity : result.item.rarity;
  const treatment = getTreatment(buildupRarity);
  const { palette, effects } = treatment;
  const [skip, setSkip] = useState(false);

  const { phase, isRevealed } = useRevealSequence({
    rarity: treatment.rarity,
    speed,
    skip,
    reducedMotion,
    onComplete,
  });

  // Audio + haptics tied to key moments. Runs on phase changes only.
  useEffect(() => {
    if (phase === "charging") onSound("portal-charge");
    else if (phase === "burst") {
      onSound(treatment.sound);
      onVibrate(treatment.vibration);
    } else if (phase === "revealed") onSound("reward");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const intensity = INTENSITY[phase];
  const shake = effects.cameraShake && (phase === "flash" || phase === "burst");

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      data-testid="rarity-reveal"
      data-rarity={treatment.rarity}
      data-phase={phase}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, x: shake ? [0, -8, 8, -6, 6, 0] : 0 }}
      transition={{ duration: shake ? 0.4 : 0.3 }}
    >
      <BackgroundEffects dimmed reducedMotion={reducedMotion} />

      {/* Rainbow refraction wash (legendary) */}
      {effects.rainbow && (
        <div
          className="pointer-events-none absolute inset-0 mix-blend-screen"
          style={{
            background:
              "conic-gradient(from 0deg, #ff0080, #ff8c00, #ffed00, #00ff87, #00cfff, #a020f0, #ff0080)",
            opacity: 0.18,
          }}
        />
      )}

      {isRevealed ? (
        multi ? (
          <div className="relative z-10 w-full max-w-3xl px-4">
            <MultiSummonResults data={multi} onContinue={onContinue} />
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center gap-4">
            <RewardCard result={result} interactive={!reducedMotion} showContinue onContinue={onContinue} />
          </div>
        )
      ) : (
        <div className="relative z-10 flex flex-col items-center gap-6">
          {/* Golden light pillars (legendary) */}
          {effects.pillars && (
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center gap-3">
              {Array.from({ length: 7 }, (_, i) => (
                <motion.div
                  key={i}
                  className="w-6 rounded-t-full"
                  style={{ background: `linear-gradient(to top, ${palette.via}, transparent)` }}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: [0, 420, 320], opacity: [0, 1, 0.6] }}
                  transition={{ duration: 1.2, delay: i * 0.06, ease: "easeOut" }}
                />
              ))}
            </div>
          )}

          {/* Expanding shockwave ring */}
          {effects.shockwave && (
            <motion.div
              className="pointer-events-none absolute rounded-full border-2"
              style={{ borderColor: palette.from }}
              initial={{ width: 0, height: 0, opacity: 0.8 }}
              animate={{ width: 700, height: 700, opacity: 0 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
            />
          )}

          {/* Lightning bolts (rare) */}
          {effects.lightning && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
              {Array.from({ length: 3 }, (_, i) => (
                <motion.span
                  key={i}
                  className="absolute h-64 w-1"
                  style={{ background: palette.from, rotate: `${(i - 1) * 25}deg`, boxShadow: `0 0 16px ${palette.glow}` }}
                  animate={{ opacity: [0, 1, 0], scaleY: [0.6, 1, 0.6] }}
                  transition={{ duration: 0.5, delay: i * 0.15, repeat: Infinity }}
                />
              ))}
            </div>
          )}

          {/* Central bloom glow (legendary) */}
          {effects.bloom && (
            <motion.div
              className="pointer-events-none absolute rounded-full"
              style={{ width: 360, height: 360, background: `radial-gradient(circle, ${palette.glow}, transparent 70%)` }}
              animate={{ scale: [0.8, 1.2, 0.9], opacity: [0.6, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          {/* Falling golden feathers (legendary) */}
          {effects.feathers && (
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => (
                <motion.span
                  key={i}
                  className="absolute h-4 w-2 rounded-full"
                  style={{ left: `${12 + i * 10}%`, background: palette.via }}
                  initial={{ y: -40, opacity: 0, rotate: 0 }}
                  animate={{ y: 500, opacity: [0, 1, 0], rotate: 180 }}
                  transition={{ duration: 3, delay: i * 0.2, repeat: Infinity, ease: "easeIn" }}
                />
              ))}
            </div>
          )}

          <SummonPortal treatment={treatment} intensity={intensity} />
          <ParticleField treatment={treatment} />

          {phase === "charging" && (
            <p className="relative z-10 text-lg font-semibold uppercase tracking-[0.3em] text-white/80">
              Opening...
            </p>
          )}

          {/* White flash overlay at the climax */}
          <AnimatePresence>
            {phase === "flash" && (
              <motion.div
                className="pointer-events-none absolute inset-0 bg-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setSkip(true)}
            className="absolute bottom-8 right-8 z-20 rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/20"
          >
            Skip
          </button>
        </div>
      )}
    </motion.div>
  );
}
