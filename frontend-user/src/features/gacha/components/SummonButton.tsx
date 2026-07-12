"use client";

import { motion } from "motion/react";

interface SummonButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** Secondary treatment for the 10x button. */
  variant?: "primary" | "multi";
}

/** Premium pulsing/glowing summon button; reacts to hover and touch. */
export function SummonButton({ children, onClick, disabled = false, variant = "primary" }: SummonButtonProps) {
  const gradient =
    variant === "multi"
      ? "from-brand-yellow via-brand-pink to-brand-purple"
      : "from-brand-cyan via-brand-purple to-brand-pink";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      animate={disabled ? { boxShadow: "0 0 0px rgba(147,51,234,0)" } : { boxShadow: ["0 0 16px rgba(147,51,234,0.5)", "0 0 34px rgba(147,51,234,0.85)", "0 0 16px rgba(147,51,234,0.5)"] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className={`relative rounded-full bg-gradient-to-r ${gradient} px-10 py-4 text-lg font-bold uppercase tracking-wider text-white transition-opacity disabled:opacity-50`}
    >
      {children}
    </motion.button>
  );
}
