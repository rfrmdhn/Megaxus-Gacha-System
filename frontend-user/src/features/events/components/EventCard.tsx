"use client";

import Link from "next/link";
import { useState } from "react";
import { GachaEvent } from "@/features/gacha/types";
import { getEventImageSrc } from "@/lib/itemIcon";

function formatDateRange(startsAt: string, endsAt: string): string {
  const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
  return `${fmt.format(new Date(startsAt))} – ${fmt.format(new Date(endsAt))}`;
}

interface EventCardProps {
  event: GachaEvent;
}

export function EventCard({ event }: EventCardProps) {
  const imageSrc = getEventImageSrc(event);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = imageSrc && !imageFailed;

  return (
    <Link
      href={`/gacha?eventId=${event.id}`}
      className="group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-brand-red-400 via-brand-red-600 to-brand-red-900 p-[1.5px] shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-red-600/20"
    >
      <div className="overflow-hidden rounded-[calc(1rem-1px)] bg-white">
        {/* Banner: uploaded artwork, or a branded gradient placeholder. */}
        <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-brand-red-400/20 via-brand-red-600/20 to-brand-red-900/20 sm:h-36">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- public API image, not an optimizable asset
            <img
              src={imageSrc}
              alt=""
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl font-black text-brand-red-600/30">
              {event.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
            {formatDateRange(event.startsAt, event.endsAt)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 p-4">
          <h2 className="truncate font-semibold">{event.name}</h2>
          <span className="shrink-0 text-sm font-medium text-brand-red-600 transition-transform group-hover:translate-x-0.5">
            Pull →
          </span>
        </div>
      </div>
    </Link>
  );
}
