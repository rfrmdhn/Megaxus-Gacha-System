"use client";

import { TrophyOutlined } from "@ant-design/icons";
import { Card } from "@/components/molecules/Card";
import { LeaderboardEntry } from "../types";

// Distinct accents for the podium; everyone else gets a muted rank chip.
const MEDAL_CLASSES = [
  "bg-amber-100 text-amber-700",
  "bg-slate-200 text-slate-600",
  "bg-orange-100 text-orange-700",
];

export function LeaderboardCard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <TrophyOutlined className="text-amber-500" />
        Top players by pulls
      </h2>
      {entries.length === 0 ? (
        <p className="text-sm text-black/40">No pulls recorded yet.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((entry, index) => (
            <li key={entry.userId} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  MEDAL_CLASSES[index] ?? "bg-black/5 text-black/50"
                }`}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">{entry.email ?? "(deleted user)"}</span>
              <span className="font-medium">{entry.pullCount}</span>
              <span className="text-black/40">{entry.coinsSpent} coins</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
