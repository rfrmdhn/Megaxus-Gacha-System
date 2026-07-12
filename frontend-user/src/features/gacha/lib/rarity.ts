// Rarity model — the single source of truth for how each tier looks, sounds,
// and animates. Pure data + pure functions so it can be unit-tested to 100%
// while the visual components stay thin consumers of these treatments.
//
// The backend stores rarity as a free-form string (no enum) but by convention
// only ever emits these four lowercase values. Anything unexpected degrades
// gracefully to "common" via normalizeRarity.

import { SoundName } from "../hooks/useSoundManager";

export type Rarity = "common" | "rare" | "epic" | "legendary";

export const RARITIES: readonly Rarity[] = ["common", "rare", "epic", "legendary"];

/** Phases a reveal moves through. Not every rarity uses every phase. */
export type RevealPhase =
  | "idle"
  | "charging"
  | "portal"
  | "buildup"
  | "freeze"
  | "spark"
  | "flash"
  | "burst"
  | "pillars"
  | "cardEmerge"
  | "revealed";

export interface RarityPalette {
  /** Tailwind gradient stops (already-resolved color values). */
  from: string;
  via: string;
  to: string;
  /** Glow/shadow color (rgba). */
  glow: string;
  /** Badge/label text color. */
  text: string;
}

export interface RarityEffects {
  bloom: boolean;
  lightning: boolean;
  pillars: boolean;
  shockwave: boolean;
  slowMo: boolean;
  cameraShake: boolean;
  rainbow: boolean;
  feathers: boolean;
}

export interface RevealStep {
  phase: RevealPhase;
  ms: number;
}

export interface RarityTreatment {
  rarity: Rarity;
  /** 0..3 ordering — higher is rarer. */
  tier: number;
  label: string;
  palette: RarityPalette;
  particleCount: number;
  /** Total reveal duration in ms at 1x speed (derived from the timeline). */
  revealMs: number;
  effects: RarityEffects;
  /** navigator.vibrate pattern for the climax. */
  vibration: number[];
  /** Sound played at the reveal climax. */
  sound: SoundName;
  timeline: RevealStep[];
}

const NO_EFFECTS: RarityEffects = {
  bloom: false,
  lightning: false,
  pillars: false,
  shockwave: false,
  slowMo: false,
  cameraShake: false,
  rainbow: false,
  feathers: false,
};

// Per-rarity phase timelines. Duration sums define each tier's reveal length
// and are within the spec's bands (common 1-2s, rare 3-4s, legendary 5-7s).
const TIMELINES: Record<Rarity, RevealStep[]> = {
  common: [
    { phase: "charging", ms: 400 },
    { phase: "portal", ms: 400 },
    { phase: "burst", ms: 300 },
    { phase: "cardEmerge", ms: 400 },
  ],
  rare: [
    { phase: "charging", ms: 500 },
    { phase: "portal", ms: 700 },
    { phase: "buildup", ms: 900 },
    { phase: "flash", ms: 200 },
    { phase: "burst", ms: 500 },
    { phase: "cardEmerge", ms: 700 },
  ],
  epic: [
    { phase: "charging", ms: 500 },
    { phase: "portal", ms: 800 },
    { phase: "buildup", ms: 1200 },
    { phase: "flash", ms: 300 },
    { phase: "burst", ms: 700 },
    { phase: "cardEmerge", ms: 1000 },
  ],
  legendary: [
    { phase: "charging", ms: 600 },
    { phase: "portal", ms: 800 },
    { phase: "freeze", ms: 700 },
    { phase: "spark", ms: 700 },
    { phase: "flash", ms: 400 },
    { phase: "burst", ms: 900 },
    { phase: "pillars", ms: 900 },
    { phase: "cardEmerge", ms: 1000 },
  ],
};

function sum(steps: RevealStep[]): number {
  return steps.reduce((total, step) => total + step.ms, 0);
}

export const RARITY_TREATMENTS: Record<Rarity, RarityTreatment> = {
  common: {
    rarity: "common",
    tier: 0,
    label: "Common",
    palette: {
      from: "#38bdf8",
      via: "#22d3ee",
      to: "#ffffff",
      glow: "rgba(34, 211, 238, 0.55)",
      text: "#0e7490",
    },
    particleCount: 14,
    revealMs: sum(TIMELINES.common),
    effects: { ...NO_EFFECTS },
    vibration: [30],
    sound: "reward",
    timeline: TIMELINES.common,
  },
  rare: {
    rarity: "rare",
    tier: 1,
    label: "Rare",
    palette: {
      from: "#a855f7",
      via: "#8b5cf6",
      to: "#ec4899",
      glow: "rgba(168, 85, 247, 0.6)",
      text: "#7e22ce",
    },
    particleCount: 26,
    revealMs: sum(TIMELINES.rare),
    effects: { ...NO_EFFECTS, lightning: true, shockwave: true, cameraShake: true },
    vibration: [40, 30, 60],
    sound: "rare-reveal",
    timeline: TIMELINES.rare,
  },
  epic: {
    rarity: "epic",
    tier: 2,
    label: "Epic",
    palette: {
      from: "#c026d3",
      via: "#a855f7",
      to: "#fbbf24",
      glow: "rgba(192, 38, 211, 0.65)",
      text: "#a21caf",
    },
    particleCount: 34,
    revealMs: sum(TIMELINES.epic),
    effects: { ...NO_EFFECTS, lightning: true, shockwave: true, cameraShake: true, bloom: true },
    vibration: [50, 30, 80],
    sound: "rare-reveal",
    timeline: TIMELINES.epic,
  },
  legendary: {
    rarity: "legendary",
    tier: 3,
    label: "Legendary",
    palette: {
      from: "#fbbf24",
      via: "#f59e0b",
      to: "#ffffff",
      glow: "rgba(251, 191, 36, 0.75)",
      text: "#b45309",
    },
    particleCount: 60,
    revealMs: sum(TIMELINES.legendary),
    effects: {
      bloom: true,
      lightning: false,
      pillars: true,
      shockwave: true,
      slowMo: true,
      cameraShake: true,
      rainbow: true,
      feathers: true,
    },
    vibration: [80, 40, 120, 40, 200],
    sound: "legendary-reveal",
    timeline: TIMELINES.legendary,
  },
};

/** Coerce any backend rarity string into a known tier, defaulting to common. */
export function normalizeRarity(raw: string): Rarity {
  const key = raw.toLowerCase() as Rarity;
  return RARITIES.includes(key) ? key : "common";
}

/** Convenience accessor with graceful fallback. */
export function getTreatment(raw: string): RarityTreatment {
  return RARITY_TREATMENTS[normalizeRarity(raw)];
}

/** The reveal phase timeline for a rarity (drives useRevealSequence). */
export function getRevealTimeline(rarity: Rarity): RevealStep[] {
  return RARITY_TREATMENTS[rarity].timeline;
}
