import Link from "next/link";
import { GachaEvent } from "@/features/gacha/types";

function formatDateRange(startsAt: string, endsAt: string): string {
  const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
  return `${fmt.format(new Date(startsAt))} – ${fmt.format(new Date(endsAt))}`;
}

interface EventCardProps {
  event: GachaEvent;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link
      href={`/gacha?eventId=${event.id}`}
      className="block rounded border border-black/10 p-4 transition hover:border-brand-purple/40 hover:shadow-sm"
    >
      <h2 className="font-semibold">{event.name}</h2>
      <p className="mt-1 text-sm text-black/60">{formatDateRange(event.startsAt, event.endsAt)}</p>
    </Link>
  );
}
