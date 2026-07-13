"use client";

import { useState } from "react";
import { PlusOutlined, GiftOutlined } from "@ant-design/icons";
import { useRequireAdmin } from "@/lib/useRequireAdmin";
import { Card } from "@/components/molecules/Card";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { Skeleton, TableSkeleton } from "@/components/atoms/Skeleton";
import { useEvents } from "@/features/events/hooks/useEvents";
import { AdminEvent } from "@/features/events/types";
import { EventsTable } from "@/features/events/components/EventsTable";
import { EventFormDialog } from "@/features/events/components/EventFormDialog";
import { EventItemsDialog } from "@/features/events/components/EventItemsDialog";

type FormDialogState = { mode: "create" } | { mode: "edit"; event: AdminEvent } | null;

function EventsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <TableSkeleton cols={6} />
      </Card>
    </div>
  );
}

export default function EventsPage() {
  const { user, checking } = useRequireAdmin();
  const { events, loading, error, load, toggleActive, deleteEvent } = useEvents(user);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft">("all");
  const [formDialog, setFormDialog] = useState<FormDialogState>(null);
  const [itemsEventId, setItemsEventId] = useState<string | null>(null);

  const itemsEvent = events.find((e) => e.id === itemsEventId) ?? null;

  const filteredEvents = events.filter((event) => {
    if (statusFilter === "active" && !event.isActive) return false;
    if (statusFilter === "draft" && event.isActive) return false;
    if (search && !event.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (checking) return <EventsSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 border-l-4 border-brand-red-600 pl-3 text-2xl font-semibold">
          <GiftOutlined className="text-brand-red-600" />
          Events
        </h1>
        <Button onClick={() => setFormDialog({ mode: "create" })} className="flex items-center gap-2">
          <PlusOutlined /> New event
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs flex-1"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "draft")}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </Select>
        </div>

        {loading ? (
          <p className="text-sm text-black/50">Loading events…</p>
        ) : filteredEvents.length === 0 ? (
          <p className="text-sm text-black/50">No events found.</p>
        ) : (
          <EventsTable
            events={filteredEvents}
            onToggleActive={toggleActive}
            onEdit={(event) => setFormDialog({ mode: "edit", event })}
            onManageItems={(eventId) => setItemsEventId(eventId)}
            onDelete={deleteEvent}
          />
        )}
      </Card>

      {formDialog && (
        <EventFormDialog
          event={formDialog.mode === "edit" ? formDialog.event : null}
          onClose={() => setFormDialog(null)}
          onSaved={() => void load()}
        />
      )}

      {itemsEvent && (
        <EventItemsDialog event={itemsEvent} onClose={() => setItemsEventId(null)} onChanged={() => void load()} />
      )}
    </div>
  );
}
