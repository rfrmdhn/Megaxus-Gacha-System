"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RarityBreakdown } from "../types";

// Deterministic palette keyed by rarity name; unknown rarities fall back to grey.
const RARITY_COLORS: Record<string, string> = {
  common: "#94a3b8",
  rare: "#38bdf8",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

function colorFor(rarity: string): string {
  return RARITY_COLORS[rarity.toLowerCase()] ?? "#cbd5e1";
}

export function RarityChart({ data }: { data: RarityBreakdown[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-black/40">
        No pulls recorded yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <XAxis dataKey="rarity" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} fontSize={12} />
        <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.rarity} fill={colorFor(entry.rarity)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
