import { InputHTMLAttributes, forwardRef } from "react";

type InputSize = "sm" | "md";

const SIZE_CLASSES: Record<InputSize, string> = {
  md: "rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30",
  sm: "rounded-lg border border-black/15 px-2 py-1.5 text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30",
};

export const Input = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & { size?: InputSize }
>(function Input({ size = "md", className = "", ...props }, ref) {
  return <input ref={ref} className={`${SIZE_CLASSES[size]}${className ? ` ${className}` : ""}`} {...props} />;
});
