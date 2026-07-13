"use client";

import { motion } from "motion/react";
import { RarityTreatment } from "../lib/rarity";

interface SummonPortalProps {
  treatment: RarityTreatment;
  /** 0..1 charge intensity — scales glow and rotation energy. */
  intensity: number;
}

/** Multi-layer rotating energy portal. Color comes from the rarity treatment. */
export function SummonPortal({ treatment, intensity }: SummonPortalProps) {
  const { palette } = treatment;

  return (
    <motion.div
      className="relative flex items-center justify-center"
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 14 }}
      style={{ width: 280, height: 280 }}
    >
      {/* Outer ring */}
      <div
        className="animate-portal-spin absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, transparent, ${palette.from}, transparent, ${palette.via}, transparent)`,
          filter: `blur(${2 + intensity * 6}px)`,
        }}
      />
      {/* Inner counter-rotating ring */}
      <div
        className="animate-portal-spin-reverse absolute inset-8 rounded-full border-2"
        style={{ borderColor: palette.via, boxShadow: `0 0 ${20 + intensity * 40}px ${palette.glow}` }}
      />
      {/* Pulsing core */}
      <motion.div
        className="absolute inset-[35%] rounded-full"
        style={{ background: `radial-gradient(circle, #fff, ${palette.via})` }}
        animate={{ scale: [1, 1.15 + intensity * 0.3, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}
