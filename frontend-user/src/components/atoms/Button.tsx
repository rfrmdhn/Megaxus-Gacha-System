import { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary";

// Only the classes that are identical across every usage of a variant live
// here. Sizing/shape classes (rounded, padding, text size) differ between
// call sites (e.g. login/register submit vs. the gacha pull button), so
// callers pass those via `className`.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-brand-cyan via-brand-purple to-brand-pink text-white shadow-md shadow-brand-purple/30 transition-opacity hover:opacity-90 disabled:opacity-50",
  secondary: "border border-black/20 transition-colors hover:border-brand-purple/50",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return <button className={`${VARIANT_CLASSES[variant]} ${className}`} {...props} />;
}
