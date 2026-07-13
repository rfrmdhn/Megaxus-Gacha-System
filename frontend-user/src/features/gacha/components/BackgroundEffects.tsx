"use client";

interface BackgroundEffectsProps {
  /** Darken the backdrop (during an active summon). */
  dimmed?: boolean;
  /** Skip ambient motion for reduced-motion users. */
  reducedMotion?: boolean;
}

// Deterministic pseudo-random layout (index-based) so SSR and client render
// identically and tests are stable — no Math.random().
const STARS = Array.from({ length: 40 }, (_, i) => ({
  left: (i * 53) % 100,
  top: (i * 29) % 100,
  size: 1 + (i % 3),
  delay: (i % 7) * 0.3,
}));

export function BackgroundEffects({ dimmed = false, reducedMotion = false }: BackgroundEffectsProps) {
  const drift = reducedMotion ? "" : "animate-nebula";
  const twinkle = reducedMotion ? "" : "animate-twinkle";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Base space gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,#241b3d,#0b0716_70%)]" />

      {/* Drifting nebula blobs */}
      <div
        className={`absolute -left-1/4 top-0 h-[70%] w-[70%] rounded-full bg-brand-red-600/30 blur-3xl ${drift}`}
      />
      <div
        className={`absolute right-0 top-1/4 h-[60%] w-[60%] rounded-full bg-brand-red-400/20 blur-3xl ${drift}`}
        style={{ animationDelay: "4s" }}
      />
      <div
        className={`absolute bottom-0 left-1/3 h-[55%] w-[55%] rounded-full bg-brand-red-900/20 blur-3xl ${drift}`}
        style={{ animationDelay: "8s" }}
      />

      {/* Floating stars */}
      {STARS.map((star, i) => (
        <span
          key={i}
          className={`absolute rounded-full bg-white ${twinkle}`}
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}

      {/* Dim overlay during summon */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-700"
        style={{ opacity: dimmed ? 0.55 : 0 }}
      />
    </div>
  );
}
