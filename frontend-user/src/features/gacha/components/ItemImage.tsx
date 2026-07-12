"use client";

import { CSSProperties, useEffect, useState } from "react";
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
  const [src, setSrc] = useState(() => getItemImageSrc(item));

  // Keep the shown image in sync when the item (or its image) changes.
  useEffect(() => {
    setSrc(getItemImageSrc(item));
  }, [item.id, item.imageKey, item.rarity]);

  const fallback = getItemIcon(item.rarity);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- served from the API / static assets, not an optimizable Next asset
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => {
        if (src !== fallback) setSrc(fallback);
      }}
    />
  );
}
