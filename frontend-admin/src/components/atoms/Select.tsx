import { SelectHTMLAttributes, forwardRef } from "react";

type SelectSize = "sm" | "md";

const SIZE_CLASSES: Record<SelectSize, string> = {
  md: "rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand-red-600 focus:ring-2 focus:ring-brand-red-600/30",
  sm: "rounded-lg border border-black/15 px-2 py-1.5 text-sm outline-none focus:border-brand-red-600 focus:ring-2 focus:ring-brand-red-600/30",
};

export const Select = forwardRef<
  HTMLSelectElement,
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & { size?: SelectSize }
>(function Select({ size = "md", className = "", children, ...props }, ref) {
  return (
    <select ref={ref} className={`${SIZE_CLASSES[size]}${className ? ` ${className}` : ""}`} {...props}>
      {children}
    </select>
  );
});
