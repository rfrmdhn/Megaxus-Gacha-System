"use client";

import { Skeleton } from "@/components/Skeleton";
import { useEvents } from "@/features/events/hooks/useEvents";
import { EventCard } from "@/features/events/components/EventCard";

function EventsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-black/10">
          <Skeleton className="h-32 w-full sm:h-36" />
          <div className="p-4">
            <Skeleton className="h-5 w-32" />
          </div>
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
      <header className="flex flex-col gap-1">
        <h1 className="bg-gradient-to-r from-brand-red-500 via-brand-red-600 to-brand-red-900 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
          Active Events
        </h1>
        <p className="text-sm text-black/50">Pick a banner and try your luck.</p>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {events.length === 0 ? (
        <p className="text-black/60">No active events right now.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
