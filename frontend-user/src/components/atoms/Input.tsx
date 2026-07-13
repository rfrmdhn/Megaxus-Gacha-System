import { InputHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-brand-red-600 focus:ring-2 focus:ring-brand-red-600/30 ${className}`}
    />
  );
}
