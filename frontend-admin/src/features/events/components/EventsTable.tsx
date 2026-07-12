"use client";

import {
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { IconButton } from "@/components/atoms/IconButton";
import { Badge } from "@/components/atoms/Badge";
import { AdminEvent } from "../types";

function itemsTotal(items: AdminEvent["items"]): number {
  return items.reduce((sum, i) => sum + parseFloat(i.dropRate), 0);
}

export function EventsTable({
  events,
  onToggleActive,
  onEdit,
  onManageItems,
  onDelete,
}: {
  events: AdminEvent[];
  onToggleActive: (event: AdminEvent) => void;
  onEdit: (event: AdminEvent) => void;
  onManageItems: (eventId: string) => void;
  onDelete: (eventId: string) => void;
}) {
  return (
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
          {events.map((event) => {
            const total = itemsTotal(event.items);
            return (
              <tr key={event.id} className="border-b border-black/5">
                <td className="py-2">{event.name}</td>
                <td className="py-2">
                  <Badge tone={event.isActive ? "success" : "neutral"}>
                    {event.isActive ? "Active" : "Draft"}
                  </Badge>
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
                      onClick={() => onManageItems(event.id)}
                    />
                    <IconButton icon={<EditOutlined />} label="Edit event" onClick={() => onEdit(event)} />
                    <IconButton
                      icon={event.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
                      label={event.isActive ? "Deactivate" : "Activate"}
                      onClick={() => onToggleActive(event)}
                    />
                    <IconButton
                      icon={<DeleteOutlined />}
                      label="Delete event"
                      danger
                      onClick={() => onDelete(event.id)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
