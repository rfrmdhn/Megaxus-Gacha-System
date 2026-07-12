"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Dialog } from "@/components/molecules/Dialog";
import { IconButton } from "@/components/atoms/IconButton";
import { Input } from "@/components/atoms/Input";
import { ApiError } from "@/lib/api";
import { AdminEvent, AdminItem } from "../types";
import {
  addEventItem,
  deleteItem,
  fetchItemImage,
  removeItemImage,
  updateItem,
  uploadItemImage,
} from "../api";

function itemsTotal(items: AdminEvent["items"]): number {
  return items.reduce((sum, i) => sum + parseFloat(i.dropRate), 0);
}

function ItemThumbnail({ itemId, imageKey }: { itemId: string; imageKey: string | null }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imageKey) {
      // Resets the previously-fetched blob URL when the item's image is removed.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;

    fetchItemImage(itemId).then((blob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [itemId, imageKey]);

  if (!url) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded border border-dashed border-black/15 text-[10px] text-black/30">
        —
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element -- blob object URL, not an optimizable asset
  return <img src={url} alt="" className="h-8 w-8 rounded object-cover" />;
}

function ImageFilePicker({
  file,
  onChange,
  label,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.files?.[0] ?? null)}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-lg border border-black/15 px-3 py-1.5 text-sm transition-colors hover:border-brand-purple/50"
      >
        {file ? file.name : label}
      </button>
    </div>
  );
}

function EditItemRow({
  item,
  onSaved,
  onCancel,
  onError,
}: {
  item: AdminItem;
  onSaved: () => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState(item.name);
  const [rarity, setRarity] = useState(item.rarity);
  const [dropRate, setDropRate] = useState(item.dropRate);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    onError("");
    try {
      await updateItem(item.id, { name, rarity, dropRate: parseFloat(dropRate) });
      if (file) await uploadItemImage(item.id, file);
      onSaved();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Failed to update item");
    } finally {
      setSaving(false);
    }
  }

  async function clearImage() {
    onError("");
    try {
      await removeItemImage(item.id);
      onSaved();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Failed to remove image");
    }
  }

  return (
    <tr className="border-t border-black/5 bg-black/[0.02]">
      <td colSpan={5} className="py-2">
        <form onSubmit={save} className="flex flex-wrap items-end gap-2">
          <Input size="sm" required value={name} onChange={(e) => setName(e.target.value)} />
          <Input size="sm" required value={rarity} onChange={(e) => setRarity(e.target.value)} />
          <Input
            size="sm"
            required
            type="number"
            step="0.01"
            min="0"
            max="100"
            className="w-24"
            value={dropRate}
            onChange={(e) => setDropRate(e.target.value)}
          />
          <ImageFilePicker
            file={file}
            onChange={setFile}
            label={item.imageKey ? "Replace image" : "Add image"}
          />
          {item.imageKey && (
            <button type="button" onClick={clearImage} className="text-xs text-red-600 hover:underline">
              Remove image
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg border border-black/15 px-3 py-1.5 text-sm transition-colors hover:border-brand-purple/50 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onCancel} className="text-xs text-black/50 hover:underline">
            Cancel
          </button>
        </form>
      </td>
    </tr>
  );
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
  const [newItemFile, setNewItemFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const total = itemsTotal(event.items);

  async function addItem(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const created = await addEventItem(event.id, {
        name: itemName,
        rarity,
        dropRate: parseFloat(dropRate),
      });
      if (newItemFile) await uploadItemImage(created.id, newItemFile);
      setItemName("");
      setRarity("");
      setDropRate("");
      setNewItemFile(null);
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
    <Dialog title={`Items — ${event.name}`} onClose={onClose} widthClassName="max-w-2xl">
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
              <th className="py-1">Image</th>
              <th className="py-1">Item</th>
              <th className="py-1">Rarity</th>
              <th className="py-1">Drop rate</th>
              <th className="py-1"></th>
            </tr>
          </thead>
          <tbody>
            {event.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-2 text-black/50">
                  No items yet
                </td>
              </tr>
            ) : (
              event.items.map((item) =>
                editingItemId === item.id ? (
                  <EditItemRow
                    key={item.id}
                    item={item}
                    onSaved={() => {
                      setEditingItemId(null);
                      onChanged();
                    }}
                    onCancel={() => setEditingItemId(null)}
                    onError={(message) => setError(message || null)}
                  />
                ) : (
                  <tr key={item.id} className="border-t border-black/5">
                    <td className="py-1.5">
                      <ItemThumbnail itemId={item.id} imageKey={item.imageKey} />
                    </td>
                    <td className="py-1.5">{item.name}</td>
                    <td className="py-1.5 capitalize">{item.rarity}</td>
                    <td className="py-1.5">{item.dropRate}%</td>
                    <td className="py-1.5 text-right">
                      <div className="flex justify-end gap-1">
                        <IconButton
                          icon={<EditOutlined />}
                          label="Edit item"
                          onClick={() => setEditingItemId(item.id)}
                        />
                        <IconButton
                          icon={<DeleteOutlined />}
                          label="Remove item"
                          danger
                          onClick={() => removeItem(item.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ),
              )
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
          <ImageFilePicker file={newItemFile} onChange={setNewItemFile} label="Add image" />
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
