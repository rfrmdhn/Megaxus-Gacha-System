"use client";

import { CSSProperties, useMemo, useState } from "react";
import { getItemIcon, getItemImageSrc } from "@/lib/itemIcon";

interface ItemImageItem {
  id: string;
  rarity: string;
  imageKey: string | null;
}

interface ItemImageProps {
  item: ItemImageItem;
  className?: string;
  style?: CSSProperties;
  alt?: string;
}

/**
 * Item artwork with graceful fallback: shows the admin-uploaded image when one
 * is set, and falls back to the per-rarity icon both when no image is set and
 * when a set image fails to load (missing object, network error).
 */
export function ItemImage({ item, className, style, alt = "" }: ItemImageProps) {
  const [errored, setErrored] = useState(false);
  const src = useMemo(() => getItemImageSrc(item), [item.id, item.imageKey, item.rarity]);

  const fallback = getItemIcon(item.rarity);
  const shownSrc = errored ? fallback : src;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- served from the API / static assets, not an optimizable Next asset
    <img
      src={shownSrc}
      alt={alt}
      className={className}
      style={style}
      onError={() => {
        if (!errored) setErrored(true);
      }}
    />
  );
}
