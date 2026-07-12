import { matchRarity, Rarity } from "@/features/gacha/lib/rarity";

const ICONS: Record<Rarity, string> = {
  common: "/assets/items/common.svg",
  rare: "/assets/items/rare.svg",
  epic: "/assets/items/epic.svg",
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
