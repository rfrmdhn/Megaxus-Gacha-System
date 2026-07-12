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

  it("pullMany runs N sequential pulls and reports the final balance", async () => {
    let coins = 100;
    mockedApiFetch.mockImplementation(async () => pullResult("x", (coins -= 10)));
    const res = await pullMany("ev1", 3);
    expect(res.results).toHaveLength(3);
    expect(res.remainingCoins).toBe(70);
    expect(mockedApiFetch).toHaveBeenCalledTimes(3);
  });

  it("stops early and keeps partial results on an ApiError mid-batch", async () => {
    let call = 0;
    mockedApiFetch.mockImplementation(async () => {
      call++;
      if (call === 3) throw new api.ApiError("Insufficient coins", 400);
      return pullResult(String(call), 100 - call * 10);
    });
    const res = await pullMany("ev1", 10);
    expect(res.results).toHaveLength(2);
    expect(res.remainingCoins).toBe(80);
  });

  it("rethrows an ApiError on the very first pull", async () => {
    mockedApiFetch.mockRejectedValue(new api.ApiError("Insufficient coins", 400));
    await expect(pullMany("ev1", 10)).rejects.toBeInstanceOf(api.ApiError);
  });

  it("rethrows non-ApiError failures", async () => {
    mockedApiFetch
      .mockResolvedValueOnce(pullResult("1", 90))
      .mockRejectedValueOnce(new Error("network"));
    await expect(pullMany("ev1", 10)).rejects.toThrow("network");
  });

  it("returns a zero balance when count is zero", async () => {
    const res = await pullMany("ev1", 0);
    expect(res.results).toHaveLength(0);
    expect(res.remainingCoins).toBe(0);
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });
});
