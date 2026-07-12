import { describe, it, expect } from "vitest";
import { getItemIcon } from "../itemIcon";

describe("getItemIcon", () => {
  it("returns common icon for 'common'", () => {
    expect(getItemIcon("common")).toBe("/assets/items/common.svg");
  });

  it("returns rare icon for 'rare'", () => {
    expect(getItemIcon("rare")).toBe("/assets/items/rare.svg");
  });

  it("returns legendary icon for 'legendary'", () => {
    expect(getItemIcon("legendary")).toBe("/assets/items/legendary.svg");
  });

  it("is case-insensitive", () => {
    expect(getItemIcon("Common")).toBe("/assets/items/common.svg");
    expect(getItemIcon("RARE")).toBe("/assets/items/rare.svg");
    expect(getItemIcon("LEGENDARY")).toBe("/assets/items/legendary.svg");
  });

  it("matches a known tier keyword inside a free-form label", () => {
    expect(getItemIcon("Rare Rarity")).toBe("/assets/items/rare.svg");
    expect(getItemIcon("Legendary drop")).toBe("/assets/items/legendary.svg");
  });

  it("returns the default icon for unknown rarity", () => {
    expect(getItemIcon("unknown")).toBe("/assets/items/default.svg");
    expect(getItemIcon("mythic")).toBe("/assets/items/default.svg");
    expect(getItemIcon("epic")).toBe("/assets/items/default.svg");
  });

  it("returns the default icon for empty string", () => {
    expect(getItemIcon("")).toBe("/assets/items/default.svg");
  });
});
