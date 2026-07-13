"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { fetchEventImage } from "../api";

/**
 * Banner picker for the event form. Shows the current banner (fetched lazily
 * when the event already has one), a freshly-picked file preview, or a
 * placeholder, plus controls to replace or remove the image. Purely controlled:
 * the parent owns the selected `file` and the `removed` intent and performs the
 * actual upload/delete after the event record is saved.
 */
export function EventImageField({
  eventId,
  imageKey,
  file,
  onFileChange,
  removed,
  onRemovedChange,
}: {
  eventId: string | null;
  imageKey: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  removed: boolean;
  onRemovedChange: (removed: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [existingUrl, setExistingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId || !imageKey) return;
    let objectUrl: string | null = null;
    let cancelled = false;

    fetchEventImage(eventId).then((blob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setExistingUrl(objectUrl);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [eventId, imageKey]);

  const [filePreview, setFilePreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setFilePreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setFilePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const hasExisting = Boolean(imageKey) && !removed;
  const previewUrl = filePreview ?? (hasExisting ? existingUrl : null);
  const canRemove = hasExisting && !file;

  function pickFile(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    onFileChange(picked);
    if (picked) onRemovedChange(false);
  }

  return (
    <div className="flex items-center gap-3">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob object URL, not an optimizable asset
        <img src={previewUrl} alt="" className="h-16 w-24 rounded object-cover" />
      ) : (
        <div className="flex h-16 w-24 items-center justify-center rounded border border-dashed border-black/15 text-[10px] text-black/30">
          No image
        </div>
      )}
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={pickFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-black/15 px-3 py-1.5 text-sm transition-colors hover:border-brand-red-600/50"
        >
          {file ? file.name : hasExisting ? "Replace image" : "Choose image"}
        </button>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemovedChange(true)}
            className="text-left text-xs text-red-600 hover:underline"
          >
            Remove image
          </button>
        )}
      </div>
    </div>
  );
}
