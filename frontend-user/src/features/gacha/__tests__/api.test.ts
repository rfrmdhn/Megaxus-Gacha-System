import { describe, it, expect, vi, beforeEach } from "vitest";
import * as api from "@/lib/api";
import { pull, pullMany } from "../api";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

const mockedApiFetch = vi.mocked(api.apiFetch);

function pullResult(id: string, coins: number) {
  return { item: { id, name: `Item ${id}`, rarity: "common" }, remainingCoins: coins };
}

describe("gacha api", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pull posts to /gacha/pull with the eventId", async () => {
    mockedApiFetch.mockResolvedValue(pullResult("a", 90));
    await pull("ev1");
    expect(mockedApiFetch).toHaveBeenCalledWith("/gacha/pull", {
      method: "POST",
      body: JSON.stringify({ eventId: "ev1" }),
    });
  });

  it("pullMany posts to /gacha/pull-bulk and maps the bulk response", async () => {
    mockedApiFetch.mockResolvedValue({
      items: [
        { id: "a", name: "A", rarity: "common" },
        { id: "b", name: "B", rarity: "rare" },
      ],
      bestRarity: "rare",
      remainingCoins: 80,
    });

    const res = await pullMany("ev1", 2);

    expect(mockedApiFetch).toHaveBeenCalledWith("/gacha/pull-bulk", {
      method: "POST",
      body: JSON.stringify({ eventId: "ev1", count: 2 }),
    });
    expect(res.results).toEqual([
      { item: { id: "a", name: "A", rarity: "common" }, remainingCoins: 80 },
      { item: { id: "b", name: "B", rarity: "rare" }, remainingCoins: 80 },
    ]);
    expect(res.bestRarity).toBe("rare");
    expect(res.remainingCoins).toBe(80);
  });

  it("propagates errors from the bulk endpoint", async () => {
    mockedApiFetch.mockRejectedValue(new api.ApiError("Insufficient coins", 400));
    await expect(pullMany("ev1", 10)).rejects.toBeInstanceOf(api.ApiError);
  });
});
