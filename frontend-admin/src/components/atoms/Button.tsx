import { ReactNode } from "react";

type ButtonVariant = "primary" | "outline";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "rounded-lg bg-gradient-to-r from-brand-cyan via-brand-purple to-brand-pink px-4 py-2 text-sm font-medium text-white shadow-md shadow-brand-purple/30 transition-opacity hover:opacity-90 disabled:opacity-50",
  outline: "rounded-lg border border-black/15 px-4 py-2 text-sm transition-colors",
};

export function Button({
  variant = "primary",
  type = "button",
  onClick,
  disabled,
  form,
  className = "",
  children,
}: {
  variant?: ButtonVariant;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  form?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      form={form}
      className={`${VARIANT_CLASSES[variant]}${className ? ` ${className}` : ""}`}
    >
      {children}
    </button>
  );
}
