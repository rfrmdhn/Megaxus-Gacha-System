const ICONS: Record<string, string> = {
  common: "/assets/items/common.svg",
  rare: "/assets/items/rare.svg",
  epic: "/assets/items/epic.svg",
  legendary: "/assets/items/legendary.svg",
};

export function getItemIcon(rarity: string): string {
  return ICONS[rarity.toLowerCase()] ?? "/assets/items/default.svg";
}
