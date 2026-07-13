"use client";

import { motion } from "motion/react";
import { RarityTreatment } from "../lib/rarity";

interface ParticleFieldProps {
  treatment: RarityTreatment;
}

/**
 * Reusable radial particle burst. Count and color come from the rarity
 * treatment. Positions are deterministic (index-derived angles), so there are
 * no per-frame React updates and no random hydration mismatch.
 */
export function ParticleField({ treatment }: ParticleFieldProps) {
  const { particleCount, palette } = treatment;
  const particles = Array.from({ length: particleCount }, (_, i) => {
    const angle = (i / particleCount) * Math.PI * 2;
    const distance = 120 + (i % 5) * 40;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      size: 4 + (i % 4) * 2,
      delay: (i % 6) * 0.08,
      color: i % 2 === 0 ? palette.via : palette.from,
    };
  });

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{ width: p.size, height: p.size, backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}` }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
          animate={{ x: p.x, y: p.y, opacity: [0, 1, 0], scale: [0, 1, 0.4] }}
          transition={{ duration: 1.6, delay: p.delay, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
