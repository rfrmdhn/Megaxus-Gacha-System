import { matchRarity, Rarity } from "@/features/gacha/lib/rarity";
import { API_URL } from "@/lib/api";

const ICONS: Record<Rarity, string> = {
  common: "/assets/items/common.svg",
  rare: "/assets/items/rare.svg",
  legendary: "/assets/items/legendary.svg",
};

/**
 * Resolve a per-rarity icon from a free-form backend rarity string. Reuses the
 * gacha tier detection so a recognized tier always gets its own icon
 * (e.g. "Legendary Rarity" → the legendary icon), while a genuinely unknown
 * rarity falls back to the neutral default icon.
 */
export function getItemIcon(rarity: string): string {
  const tier = matchRarity(rarity);
  return tier ? ICONS[tier] : "/assets/items/default.svg";
}

interface ImageResolvable {
  id: string;
  rarity: string;
  imageKey: string | null;
}

/**
 * Resolve the artwork to show for an item: the admin-uploaded image when one is
 * set, otherwise the per-rarity icon. The image is served publicly by the API
 * so it can be used directly as an `<img src>`. Callers should still fall back
 * to `getItemIcon(rarity)` on a load error (see `ItemImage`).
 */
export function getItemImageSrc(item: ImageResolvable): string {
  return item.imageKey
    ? `${API_URL}/events/items/${item.id}/image`
    : getItemIcon(item.rarity);
}

/**
 * URL of an event's banner image, or `null` when the event has none — callers
 * decide the fallback (e.g. a gradient placeholder). Served publicly by the API
 * for direct use as an `<img src>`.
 */
export function getEventImageSrc(event: {
  id: string;
  imageKey: string | null;
}): string | null {
  return event.imageKey ? `${API_URL}/events/${event.id}/image` : null;
}
