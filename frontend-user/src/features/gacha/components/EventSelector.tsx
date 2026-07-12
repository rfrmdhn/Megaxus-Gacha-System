import { GachaEvent } from "../types";

interface EventSelectorProps {
  events: GachaEvent[];
  selectedEventId: string | null;
  onChange: (eventId: string) => void;
}

export function EventSelector({ events, selectedEventId, onChange }: EventSelectorProps) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">Event</label>
      <select
        value={selectedEventId ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-white outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30"
      >
        {events.map((e) => (
          <option key={e.id} value={e.id} className="text-black">
            {e.name}
          </option>
        ))}
      </select>
    </div>
  );
}
