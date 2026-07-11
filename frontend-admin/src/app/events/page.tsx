"use client";

import { useEffect, useState } from "react";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
  UnorderedListOutlined,
  GiftOutlined,
} from "@ant-design/icons";
import { apiFetch, ApiError } from "@/lib/api";
import { useRequireAdmin } from "@/lib/useRequireAdmin";
import { Card } from "@/components/Card";
import { IconButton } from "@/components/IconButton";
import { AdminEvent, EventFormDialog } from "./EventFormDialog";
import { EventItemsDialog } from "./EventItemsDialog";

function itemsTotal(items: AdminEvent["items"]): number {
  return items.reduce((sum, i) => sum + parseFloat(i.dropRate), 0);
}

type FormDialogState = { mode: "create" } | { mode: "edit"; event: AdminEvent } | null;

export default function EventsPage() {
  const user = useRequireAdmin();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft">("all");
  const [formDialog, setFormDialog] = useState<FormDialogState>(null);
  const [itemsEventId, setItemsEventId] = useState<string | null>(null);

  useEffect(() => {
    if (user) void loadEvents();
  }, [user]);

  async function loadEvents() {
    try {
      const list = await apiFetch<AdminEvent[]>("/admin/events");
      setEvents(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(event: AdminEvent) {
    setError(null);
    try {
      await apiFetch(`/admin/events/${event.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !event.isActive }),
      });
      void loadEvents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update event");
    }
  }

  async function deleteEvent(eventId: string) {
    if (!window.confirm("Delete this event? This cannot be undone.")) return;
    setError(null);
    try {
      await apiFetch(`/admin/events/${eventId}`, { method: "DELETE" });
      void loadEvents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete event");
    }
  }

  const itemsEvent = events.find((e) => e.id === itemsEventId) ?? null;

  const filteredEvents = events.filter((event) => {
    if (statusFilter === "active" && !event.isActive) return false;
    if (statusFilter === "draft" && event.isActive) return false;
    if (search && !event.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 border-l-4 border-brand-purple pl-3 text-2xl font-semibold">
          <GiftOutlined className="text-brand-purple" />
          Events
        </h1>
        <button
          type="button"
          onClick={() => setFormDialog({ mode: "create" })}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-cyan via-brand-purple to-brand-pink px-4 py-2 text-sm font-medium text-white shadow-md shadow-brand-purple/30 transition-opacity hover:opacity-90"
        >
          <PlusOutlined /> New event
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "draft")}
            className="rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-black/50">Loading events…</p>
        ) : filteredEvents.length === 0 ? (
          <p className="text-sm text-black/50">No events found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left">
                  <th className="py-2">Name</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Starts</th>
                  <th className="py-2">Ends</th>
                  <th className="py-2">Drop rate</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => {
                  const total = itemsTotal(event.items);
                  return (
                    <tr key={event.id} className="border-b border-black/5">
                      <td className="py-2">{event.name}</td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            event.isActive ? "bg-green-100 text-green-700" : "bg-black/5 text-black/50"
                          }`}
                        >
                          {event.isActive ? "Active" : "Draft"}
                        </span>
                      </td>
                      <td className="py-2 text-black/60">{new Date(event.startsAt).toLocaleString()}</td>
                      <td className="py-2 text-black/60">{new Date(event.endsAt).toLocaleString()}</td>
                      <td className="py-2">
                        <span className={total !== 100 ? "text-amber-600" : undefined}>{total}%</span>
                      </td>
                      <td className="py-2">
                        <div className="flex justify-end gap-1.5">
                          <IconButton
                            icon={<UnorderedListOutlined />}
                            label="Manage items"
                            onClick={() => setItemsEventId(event.id)}
                          />
                          <IconButton
                            icon={<EditOutlined />}
                            label="Edit event"
                            onClick={() => setFormDialog({ mode: "edit", event })}
                          />
                          <IconButton
                            icon={event.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
                            label={event.isActive ? "Deactivate" : "Activate"}
                            onClick={() => toggleActive(event)}
                          />
                          <IconButton
                            icon={<DeleteOutlined />}
                            label="Delete event"
                            danger
                            onClick={() => deleteEvent(event.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {formDialog && (
        <EventFormDialog
          event={formDialog.mode === "edit" ? formDialog.event : null}
          onClose={() => setFormDialog(null)}
          onSaved={() => void loadEvents()}
        />
      )}

      {itemsEvent && (
        <EventItemsDialog event={itemsEvent} onClose={() => setItemsEventId(null)} onChanged={() => void loadEvents()} />
      )}
    </div>
  );
}
