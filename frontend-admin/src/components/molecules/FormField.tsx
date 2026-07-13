import { ReactNode } from "react";

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-black/50">{label}</label>
      {children}
    </div>
  );
}
