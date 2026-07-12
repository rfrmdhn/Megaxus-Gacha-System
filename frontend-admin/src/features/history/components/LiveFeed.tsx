import { LivePullEvent } from "../types";

export function LiveFeed({ connected, events }: { connected: boolean; events: LivePullEvent[] }) {
  return (
    <>
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
        <span className="text-sm">{connected ? "Live" : "Disconnected"}</span>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-black/50">
          Waiting for pulls — this list updates in real time as users pull.
        </p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {events.map((event, i) => (
            <li key={i}>
              <strong>{event.userEmail}</strong> pulled <strong>{event.itemName}</strong> ({event.rarity}) from{" "}
              {event.eventName} — {new Date(event.createdAt).toLocaleTimeString()}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
