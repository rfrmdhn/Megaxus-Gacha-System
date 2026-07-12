import { getItemIcon } from "@/lib/itemIcon";
import { EventItem } from "../types";

interface DropRateListProps {
  items: EventItem[];
}

export function DropRateList({ items }: DropRateListProps) {
  return (
    <div className="rounded border border-black/10 p-4">
      <h2 className="mb-2 font-medium">Drop rates</h2>
      <ul className="flex flex-col gap-1 text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getItemIcon(item.rarity)} alt={item.rarity} className="h-6 w-6" />
              {item.name} <span className="text-black/50">({item.rarity})</span>
            </span>
            <span>{item.dropRate}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
