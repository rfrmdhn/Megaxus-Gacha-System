"use client";

import { FormEvent, useState } from "react";
import { Dialog } from "@/components/Dialog";
import { apiFetch, ApiError } from "@/lib/api";

export interface AdminItem {
  id: string;
  name: string;
  rarity: string;
  dropRate: string;
}

export interface AdminEvent {
  id: string;
  name: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  items: AdminItem[];
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventFormDialog({
  event,
  onClose,
  onSaved,
}: {
  event: AdminEvent | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(event?.name ?? "");
  const [startsAt, setStartsAt] = useState(event ? toLocalInput(event.startsAt) : "");
  const [endsAt, setEndsAt] = useState(event ? toLocalInput(event.endsAt) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body = {
        name,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      };
      if (event) {
        await apiFetch(`/admin/events/${event.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await apiFetch("/admin/events", { method: "POST", body: JSON.stringify(body) });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save event");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      title={event ? "Edit event" : "New event"}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-black/15 px-4 py-2 text-sm transition-colors hover:border-black/30"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="event-form"
            disabled={saving}
            className="rounded-lg bg-gradient-to-r from-brand-cyan via-brand-purple to-brand-pink px-4 py-2 text-sm font-medium text-white shadow-md shadow-brand-purple/30 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form id="event-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-black/50">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-black/50">Starts</label>
          <input
            type="datetime-local"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-black/50">Ends</label>
          <input
            type="datetime-local"
            required
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30"
          />
        </div>
      </form>
    </Dialog>
  );
}
