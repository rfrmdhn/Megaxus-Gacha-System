import { describe, it, expect } from "vitest";
import { getItemIcon, getItemImageSrc, getEventImageSrc } from "../itemIcon";

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

describe("getItemImageSrc", () => {
  it("uses the public item-image URL when the item has an uploaded image", () => {
    expect(
      getItemImageSrc({ id: "item-1", rarity: "rare", imageKey: "items/item-1.png" }),
    ).toBe("http://localhost:3001/api/v1/events/items/item-1/image");
  });

  it("falls back to the rarity icon when the item has no image", () => {
    expect(getItemImageSrc({ id: "item-1", rarity: "legendary", imageKey: null })).toBe(
      "/assets/items/legendary.svg",
    );
  });
});

describe("getEventImageSrc", () => {
  it("builds the public event-image URL when the event has an image", () => {
    expect(getEventImageSrc({ id: "evt-1", imageKey: "events/evt-1.png" })).toBe(
      "http://localhost:3001/api/v1/events/evt-1/image",
    );
  });

  it("returns null when the event has no image", () => {
    expect(getEventImageSrc({ id: "evt-1", imageKey: null })).toBeNull();
  });
});
