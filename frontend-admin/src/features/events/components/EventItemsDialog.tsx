"use client";

import { FormEvent, useState } from "react";
import { DeleteOutlined } from "@ant-design/icons";
import { Dialog } from "@/components/molecules/Dialog";
import { IconButton } from "@/components/atoms/IconButton";
import { Input } from "@/components/atoms/Input";
import { ApiError } from "@/lib/api";
import { AdminEvent } from "../types";
import { addEventItem, deleteItem } from "../api";

function itemsTotal(items: AdminEvent["items"]): number {
  return items.reduce((sum, i) => sum + parseFloat(i.dropRate), 0);
}

export function EventItemsDialog({
  event,
  onClose,
  onChanged,
}: {
  event: AdminEvent;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [itemName, setItemName] = useState("");
  const [rarity, setRarity] = useState("");
  const [dropRate, setDropRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = itemsTotal(event.items);

  async function addItem(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await addEventItem(event.id, { name: itemName, rarity, dropRate: parseFloat(dropRate) });
      setItemName("");
      setRarity("");
      setDropRate("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add item");
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(itemId: string) {
    if (!window.confirm("Remove this item?")) return;
    setError(null);
    try {
      await deleteItem(itemId);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete item");
    }
  }

  return (
    <Dialog title={`Items — ${event.name}`} onClose={onClose} widthClassName="max-w-xl">
      <div className="flex flex-col gap-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <p className="text-xs text-black/50">
          Total drop rate:{" "}
          <span className={total !== 100 ? "font-medium text-amber-600" : "font-medium text-green-600"}>
            {total}%
          </span>
        </p>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-black/50">
              <th className="py-1">Item</th>
              <th className="py-1">Rarity</th>
              <th className="py-1">Drop rate</th>
              <th className="py-1"></th>
            </tr>
          </thead>
          <tbody>
            {event.items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-2 text-black/50">
                  No items yet
                </td>
              </tr>
            ) : (
              event.items.map((item) => (
                <tr key={item.id} className="border-t border-black/5">
                  <td className="py-1.5">{item.name}</td>
                  <td className="py-1.5 capitalize">{item.rarity}</td>
                  <td className="py-1.5">{item.dropRate}%</td>
                  <td className="py-1.5 text-right">
                    <IconButton
                      icon={<DeleteOutlined />}
                      label="Remove item"
                      danger
                      onClick={() => removeItem(item.id)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <form onSubmit={addItem} className="flex flex-wrap items-end gap-2 border-t border-black/10 pt-4">
          <Input
            size="sm"
            required
            placeholder="Item name"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
          <Input
            size="sm"
            required
            placeholder="Rarity"
            value={rarity}
            onChange={(e) => setRarity(e.target.value)}
          />
          <Input
            size="sm"
            required
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="Drop rate %"
            value={dropRate}
            onChange={(e) => setDropRate(e.target.value)}
            className="w-28"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg border border-black/15 px-3 py-1.5 text-sm transition-colors hover:border-brand-purple/50 disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add item"}
          </button>
        </form>
      </div>
    </Dialog>
  );
}
