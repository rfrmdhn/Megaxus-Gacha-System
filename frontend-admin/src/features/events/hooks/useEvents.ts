"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { JwtPayload } from "@/lib/auth";
import { AdminEvent } from "../types";
import { listEvents, updateEvent, deleteEvent as deleteEventRequest } from "../api";

export function useEvents(user: JwtPayload | null) {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const list = await listEvents();
      setEvents(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function toggleActive(event: AdminEvent) {
    setError(null);
    try {
      await updateEvent(event.id, { isActive: !event.isActive });
      void load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update event");
    }
  }

  async function deleteEvent(eventId: string) {
    if (!window.confirm("Delete this event? This cannot be undone.")) return;
    setError(null);
    try {
      await deleteEventRequest(eventId);
      void load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete event");
    }
  }

  return { events, loading, error, load, toggleActive, deleteEvent };
}
