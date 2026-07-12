import { getItemIcon } from "@/lib/itemIcon";
import { PullResult } from "../types";

interface PullResultCardProps {
  result: PullResult;
}

export function PullResultCard({ result }: PullResultCardProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-brand-cyan via-brand-purple to-brand-pink p-[2px] shadow-lg shadow-brand-purple/20">
      <div className="flex items-center gap-4 rounded-[calc(1rem-2px)] bg-white p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={getItemIcon(result.item.rarity)} alt={result.item.rarity} className="h-16 w-16" />
        <div>
          <p className="text-sm text-black/60">You got:</p>
          <p className="text-xl font-semibold">{result.item.name}</p>
          <p className="text-sm capitalize text-black/60">{result.item.rarity}</p>
        </div>
      </div>
    </div>
  );
}
