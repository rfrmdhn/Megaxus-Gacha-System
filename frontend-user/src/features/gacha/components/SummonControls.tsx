"use client";

import { Checkbox } from "@/components/atoms/Checkbox";

interface SummonControlsProps {
  skip: boolean;
  onSkipChange: (value: boolean) => void;
  speed: number;
  onSpeedChange: (value: number) => void;
  muted: boolean;
  onToggleMute: () => void;
  auto: boolean;
  onToggleAuto: () => void;
  canReplay: boolean;
  onReplay: () => void;
  onToggleFullscreen: () => void;
  disabled?: boolean;
}

const SPEED_OPTIONS = [0.5, 1, 1.5, 2];

const controlButton =
  "rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:border-white/50 disabled:opacity-40";

export function SummonControls({
  skip,
  onSkipChange,
  speed,
  onSpeedChange,
  muted,
  onToggleMute,
  auto,
  onToggleAuto,
  canReplay,
  onReplay,
  onToggleFullscreen,
  disabled = false,
}: SummonControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Checkbox
        id="skip-animation"
        label="Skip animation"
        className="text-white/80"
        checked={skip}
        onChange={(e) => onSkipChange(e.target.checked)}
      />

      <label className="flex items-center gap-2 text-sm text-white/80">
        Speed
        <select
          aria-label="Animation speed"
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="rounded border border-white/20 bg-transparent px-2 py-1"
        >
          {SPEED_OPTIONS.map((value) => (
            <option key={value} value={value} className="text-black">
              {value}x
            </option>
          ))}
        </select>
      </label>

      <button type="button" onClick={onToggleMute} className={controlButton} aria-label={muted ? "Unmute" : "Mute"}>
        {muted ? "🔇 Sound off" : "🔊 Sound on"}
      </button>

      <button
        type="button"
        onClick={onToggleAuto}
        className={controlButton}
        disabled={disabled}
        aria-pressed={auto}
      >
        {auto ? "⏹ Stop auto" : "♻ Auto summon"}
      </button>

      <button type="button" onClick={onReplay} className={controlButton} disabled={!canReplay}>
        ↺ Replay
      </button>

      <button type="button" onClick={onToggleFullscreen} className={controlButton}>
        ⛶ Fullscreen
      </button>
    </div>
  );
}
