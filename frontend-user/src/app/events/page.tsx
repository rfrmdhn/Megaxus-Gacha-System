"use client";

import { Skeleton } from "@/components/Skeleton";
import { useEvents } from "@/features/events/hooks/useEvents";
import { EventCard } from "@/features/events/components/EventCard";

function EventsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded border border-black/10 p-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

export default function EventsPage() {
  const { checking, events, error } = useEvents();

  if (checking) return <EventsSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Events</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {events.length === 0 ? (
        <p className="text-black/60">No active events right now.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
