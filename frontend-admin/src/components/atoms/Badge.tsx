import { ReactNode } from "react";

type BadgeTone = "success" | "neutral";

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: "bg-green-100 text-green-700",
  neutral: "bg-black/5 text-black/50",
};

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs ${TONE_CLASSES[tone]}`}>{children}</span>;
}
