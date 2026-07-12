import { describe, it, expect } from "vitest";
import {
  RARITIES,
  RARITY_TREATMENTS,
  normalizeRarity,
  getTreatment,
  getRevealTimeline,
} from "../rarity";

describe("normalizeRarity", () => {
  it("passes through known lowercase rarities", () => {
    expect(normalizeRarity("legendary")).toBe("legendary");
    expect(normalizeRarity("rare")).toBe("rare");
  });

  it("lowercases mixed-case input", () => {
    expect(normalizeRarity("Epic")).toBe("epic");
    expect(normalizeRarity("COMMON")).toBe("common");
  });

  it("falls back to common for unknown strings", () => {
    expect(normalizeRarity("mythic")).toBe("common");
    expect(normalizeRarity("")).toBe("common");
  });
});

describe("getTreatment", () => {
  it("returns the treatment for the normalized rarity", () => {
    expect(getTreatment("Legendary").rarity).toBe("legendary");
    expect(getTreatment("bogus").rarity).toBe("common");
  });
});

describe("RARITY_TREATMENTS", () => {
  it("has reveal durations within the spec bands", () => {
    expect(RARITY_TREATMENTS.common.revealMs).toBeGreaterThanOrEqual(1000);
    expect(RARITY_TREATMENTS.common.revealMs).toBeLessThanOrEqual(2000);
    expect(RARITY_TREATMENTS.rare.revealMs).toBeGreaterThanOrEqual(3000);
    expect(RARITY_TREATMENTS.rare.revealMs).toBeLessThanOrEqual(4000);
    expect(RARITY_TREATMENTS.legendary.revealMs).toBeGreaterThanOrEqual(5000);
    expect(RARITY_TREATMENTS.legendary.revealMs).toBeLessThanOrEqual(7000);
  });

  it("derives revealMs from the timeline sum", () => {
    for (const rarity of RARITIES) {
      const t = RARITY_TREATMENTS[rarity];
      expect(t.timeline.reduce((s, step) => s + step.ms, 0)).toBe(t.revealMs);
    }
  });

  it("orders tiers strictly by rarity", () => {
    expect(RARITY_TREATMENTS.common.tier).toBeLessThan(RARITY_TREATMENTS.rare.tier);
    expect(RARITY_TREATMENTS.rare.tier).toBeLessThan(RARITY_TREATMENTS.epic.tier);
    expect(RARITY_TREATMENTS.epic.tier).toBeLessThan(RARITY_TREATMENTS.legendary.tier);
  });
});

describe("getRevealTimeline", () => {
  it("returns the rarity's timeline starting with charging", () => {
    expect(getRevealTimeline("common")[0].phase).toBe("charging");
    expect(getRevealTimeline("legendary").some((s) => s.phase === "pillars")).toBe(true);
  });
});
