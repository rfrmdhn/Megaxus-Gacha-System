"use client";

import { FormEvent, useState } from "react";
import { Dialog } from "@/components/molecules/Dialog";
import { FormField } from "@/components/molecules/FormField";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { ApiError } from "@/lib/api";
import { AdminEvent } from "../types";
import {
  createEvent,
  removeEventImage,
  updateEvent,
  uploadEventImage,
} from "../api";
import { EventImageField } from "./EventImageField";

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
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
      // The banner is stored via separate endpoints, so the event record must
      // exist first — create/update, then apply the image change to that id.
      const saved = event ? await updateEvent(event.id, body) : await createEvent(body);
      if (imageFile) {
        await uploadEventImage(saved.id, imageFile);
      } else if (imageRemoved) {
        await removeEventImage(saved.id);
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
          <Button variant="outline" onClick={onClose} className="hover:border-black/30">
            Cancel
          </Button>
          <Button type="submit" form="event-form" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <form id="event-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <FormField label="Name">
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="Starts">
          <Input
            type="datetime-local"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </FormField>
        <FormField label="Ends">
          <Input type="datetime-local" required value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </FormField>
        <FormField label="Banner image">
          <EventImageField
            eventId={event?.id ?? null}
            imageKey={event?.imageKey ?? null}
            file={imageFile}
            onFileChange={setImageFile}
            removed={imageRemoved}
            onRemovedChange={setImageRemoved}
          />
        </FormField>
      </form>
    </Dialog>
  );
}
