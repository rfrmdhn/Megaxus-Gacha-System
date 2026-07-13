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
      ? "from-brand-gray-900 via-brand-red-700 to-brand-red-600"
      : "from-brand-red-600 via-brand-red-700 to-brand-red-900";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      animate={disabled ? { boxShadow: "0 0 0px rgba(207,18,20,0)" } : { boxShadow: ["0 0 16px rgba(207,18,20,0.5)", "0 0 34px rgba(207,18,20,0.85)", "0 0 16px rgba(207,18,20,0.5)"] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className={`relative rounded-full bg-gradient-to-r ${gradient} px-10 py-4 text-lg font-bold uppercase tracking-wider text-white transition-opacity disabled:opacity-50`}
    >
      {children}
    </motion.button>
  );
}
