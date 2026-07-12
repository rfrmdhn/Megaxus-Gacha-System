import { getItemIcon } from "@/lib/itemIcon";
import { EventItem } from "../types";

interface DropRateListProps {
  items: EventItem[];
}

export function DropRateList({ items }: DropRateListProps) {
  return (
    <div className="rounded border border-white/10 bg-white/5 p-4 text-white">
      <h2 className="mb-2 font-medium">Drop rates</h2>
      <ul className="flex flex-col gap-1 text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getItemIcon(item.rarity)} alt="" className="h-6 w-6" />
              {item.name} <span className="capitalize text-white/60">({item.rarity})</span>
            </span>
            <span>{item.dropRate}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
