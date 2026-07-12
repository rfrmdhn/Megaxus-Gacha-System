import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { mockPush } from "../../../../__tests__/setup";
import * as api from "@/lib/api";
import * as gachaApi from "../../api";
import * as profileApi from "@/features/profile/api";
import * as requireAuth from "@/lib/useRequireAuth";
import { useGacha } from "../useGacha";

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));
vi.mock("../../api", () => ({
  listEvents: vi.fn(),
  getEvent: vi.fn(),
  pull: vi.fn(),
  pullMany: vi.fn(),
}));
vi.mock("@/features/profile/api", () => ({ getProfile: vi.fn() }));
vi.mock("@/lib/useRequireAuth", () => ({ useRequireAuth: vi.fn(() => ({ user: null, checking: false })) }));

const events = [
  { id: "ev1", name: "One", startsAt: "", endsAt: "" },
  { id: "ev2", name: "Two", startsAt: "", endsAt: "" },
];
const single = { item: { id: "i1", name: "Sword", rarity: "rare", imageKey: null }, remainingCoins: 90 };
const multi = {
  results: [
    { item: { id: "a", name: "A", rarity: "common", imageKey: null }, remainingCoins: 90 },
    { item: { id: "b", name: "B", rarity: "legendary", imageKey: null }, remainingCoins: 0 },
  ],
  bestRarity: "legendary",
  remainingCoins: 0,
};

function primeHappyPath(coins = 100) {
  vi.mocked(profileApi.getProfile).mockResolvedValue({ id: "1", email: "e@e.com", coins });
  vi.mocked(gachaApi.listEvents).mockResolvedValue(events);
  vi.mocked(gachaApi.getEvent).mockResolvedValue({ items: [] });
  vi.mocked(gachaApi.pull).mockResolvedValue(single);
  vi.mocked(gachaApi.pullMany).mockResolvedValue(multi);
}

async function renderReady(initial?: string | null) {
  const hook = renderHook(() => useGacha(initial));
  await waitFor(() => expect(hook.result.current.profile).not.toBeNull());
  return hook;
}

describe("useGacha", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth.useRequireAuth).mockReturnValue({ user: null, checking: false });
    primeHappyPath();
  });

  it("loads profile and selects the first event by default", async () => {
    const { result } = await renderReady();
    await waitFor(() => expect(result.current.selectedEventId).toBe("ev1"));
    expect(result.current.profile?.coins).toBe(100);
  });

  it("pre-selects a matching initialEventId", async () => {
    const { result } = await renderReady("ev2");
    await waitFor(() => expect(result.current.selectedEventId).toBe("ev2"));
  });

  it("falls back to the first event for a non-matching initialEventId", async () => {
    const { result } = await renderReady("nope");
    await waitFor(() => expect(result.current.selectedEventId).toBe("ev1"));
  });

  it("redirects to /login when the profile fetch fails", async () => {
    vi.mocked(profileApi.getProfile).mockRejectedValue(new Error("401"));
    renderHook(() => useGacha());
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/login"));
  });

  it("clears events when the list fetch fails", async () => {
    vi.mocked(gachaApi.listEvents).mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useGacha());
    await waitFor(() => expect(result.current.events).toEqual([]));
  });

  it("clears items when the event detail fetch fails", async () => {
    vi.mocked(gachaApi.getEvent).mockRejectedValue(new Error("fail"));
    const { result } = await renderReady();
    await waitFor(() => expect(result.current.items).toEqual([]));
  });

  it("reveals a single pull, then commits and dismisses", async () => {
    const { result } = await renderReady();
    await act(async () => {
      await result.current.pull();
    });
    expect(result.current.revealing).toBe(true);
    expect(result.current.pending).toEqual({ type: "single", result: single });
    expect(result.current.result).toBeNull();

    act(() => result.current.commitReveal());
    expect(result.current.result).toEqual(single);
    expect(result.current.profile?.coins).toBe(90);

    act(() => result.current.dismissReveal());
    expect(result.current.revealing).toBe(false);
  });

  it("applies a single pull immediately when skipping", async () => {
    const { result } = await renderReady();
    act(() => result.current.setSkipAnimation(true));
    await act(async () => {
      await result.current.pull();
    });
    expect(result.current.revealing).toBe(false);
    expect(result.current.result).toEqual(single);
  });

  it("surfaces an ApiError message from a failed pull", async () => {
    vi.mocked(gachaApi.pull).mockRejectedValue(new api.ApiError("Insufficient coins", 400));
    const { result } = await renderReady();
    await act(async () => {
      await result.current.pull();
    });
    expect(result.current.error).toBe("Insufficient coins");
  });

  it("shows a generic message for a non-ApiError pull failure", async () => {
    vi.mocked(gachaApi.pull).mockRejectedValue(new Error("boom"));
    const { result } = await renderReady();
    await act(async () => {
      await result.current.pull();
    });
    expect(result.current.error).toBe("Pull failed");
  });

  it("does nothing on pull without a selected event", async () => {
    vi.mocked(gachaApi.listEvents).mockResolvedValue([]);
    const { result } = renderHook(() => useGacha());
    await waitFor(() => expect(result.current.profile).not.toBeNull());
    await act(async () => {
      await result.current.pull();
    });
    expect(gachaApi.pull).not.toHaveBeenCalled();
  });

  it("reveals a 10x pull carrying the full batch for the animation", async () => {
    const { result } = await renderReady();
    await act(async () => {
      await result.current.pullTen();
    });
    expect(result.current.pending).toEqual({ type: "multi", data: multi });
    act(() => result.current.commitReveal());
    expect(result.current.multiResult?.results).toHaveLength(2);
    expect(result.current.profile?.coins).toBe(0);
  });

  it("applies a 10x pull immediately when skipping", async () => {
    const { result } = await renderReady();
    act(() => result.current.setSkipAnimation(true));
    await act(async () => {
      await result.current.pullTen();
    });
    expect(result.current.multiResult?.results).toHaveLength(2);
    expect(result.current.revealing).toBe(false);
  });

  it("surfaces errors from a failed 10x pull", async () => {
    vi.mocked(gachaApi.pullMany).mockRejectedValue(new api.ApiError("Insufficient coins", 400));
    const { result } = await renderReady();
    await act(async () => {
      await result.current.pullTen();
    });
    expect(result.current.error).toBe("Insufficient coins");
  });

  it("uses the generic message for a non-ApiError 10x failure", async () => {
    vi.mocked(gachaApi.pullMany).mockRejectedValue(new Error("x"));
    const { result } = await renderReady();
    await act(async () => {
      await result.current.pullTen();
    });
    expect(result.current.error).toBe("Pull failed");
  });

  it("does nothing on 10x pull without a selected event", async () => {
    vi.mocked(gachaApi.listEvents).mockResolvedValue([]);
    const { result } = renderHook(() => useGacha());
    await waitFor(() => expect(result.current.profile).not.toBeNull());
    await act(async () => {
      await result.current.pullTen();
    });
    expect(gachaApi.pullMany).not.toHaveBeenCalled();
  });

  it("replays the last reveal without committing again", async () => {
    const { result } = await renderReady();
    await act(async () => {
      await result.current.pull();
    });
    act(() => result.current.commitReveal());
    act(() => result.current.dismissReveal());
    const coinsBefore = result.current.profile?.coins;

    expect(result.current.canReplay).toBe(true);
    act(() => result.current.replay());
    expect(result.current.revealing).toBe(true);
    act(() => result.current.commitReveal()); // replay commits nothing
    expect(result.current.profile?.coins).toBe(coinsBefore);
  });

  it("commitReveal is a no-op when nothing is pending", async () => {
    const { result } = await renderReady();
    act(() => result.current.commitReveal());
    expect(result.current.result).toBeNull();
  });

  it("cannot replay before any pull", async () => {
    const { result } = await renderReady();
    expect(result.current.canReplay).toBe(false);
    act(() => result.current.replay());
    expect(result.current.revealing).toBe(false);
  });

  it("clears persisted results", async () => {
    const { result } = await renderReady();
    act(() => result.current.setSkipAnimation(true));
    await act(async () => {
      await result.current.pull();
    });
    expect(result.current.result).toEqual(single);
    act(() => result.current.clearResults());
    expect(result.current.result).toBeNull();
  });

  it("toggles auto summon", async () => {
    const { result } = await renderReady();
    act(() => result.current.toggleAuto());
    expect(result.current.auto).toBe(true);
    act(() => result.current.toggleAuto());
    expect(result.current.auto).toBe(false);
  });

  it("stops auto summon when coins run out", async () => {
    primeHappyPath(5);
    const { result } = await renderReady();
    act(() => result.current.toggleAuto());
    await waitFor(() => expect(result.current.auto).toBe(false));
  });

  it("keeps handling coin updates when the profile is absent", async () => {
    // Profile never resolves, so it stays null while events still load.
    vi.mocked(profileApi.getProfile).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useGacha());
    await waitFor(() => expect(result.current.selectedEventId).toBe("ev1"));
    await act(async () => {
      await result.current.pull();
    });
    act(() => result.current.commitReveal());
    expect(result.current.profile).toBeNull();
    expect(result.current.result).toEqual(single);
  });

  it("does not auto-pull without a selected event", async () => {
    vi.mocked(gachaApi.listEvents).mockResolvedValue([]);
    const { result } = renderHook(() => useGacha());
    await waitFor(() => expect(result.current.profile).not.toBeNull());
    act(() => result.current.toggleAuto());
    await act(async () => {
      await Promise.resolve();
    });
    expect(gachaApi.pull).not.toHaveBeenCalled();
  });

  it("does not auto-pull without a profile", async () => {
    vi.mocked(profileApi.getProfile).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useGacha());
    await waitFor(() => expect(result.current.selectedEventId).toBe("ev1"));
    act(() => result.current.toggleAuto());
    await act(async () => {
      await Promise.resolve();
    });
    expect(gachaApi.pull).not.toHaveBeenCalled();
  });

  it("does not auto-pull while a reveal is pending", async () => {
    const { result } = await renderReady();
    await act(async () => {
      await result.current.pull();
    });
    expect(result.current.revealing).toBe(true);
    act(() => result.current.toggleAuto());
    await act(async () => {
      await Promise.resolve();
    });
    // Only the manual pull happened; auto did not schedule another.
    expect(gachaApi.pull).toHaveBeenCalledTimes(1);
  });

  it("applies pulls immediately under reduced motion", async () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      media: "",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
    try {
      const { result } = await renderReady();
      await waitFor(() => expect(result.current.reducedMotion).toBe(true));
      await act(async () => {
        await result.current.pull();
      });
      expect(result.current.revealing).toBe(false);
      expect(result.current.result).toEqual(single);
    } finally {
      window.matchMedia = original;
    }
  });
});

describe("useGacha auto-summon loop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth.useRequireAuth).mockReturnValue({ user: null, checking: false });
    primeHappyPath(100);
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("performs an immediate pull while auto is on", async () => {
    const { result } = renderHook(() => useGacha());
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.selectedEventId).toBe("ev1");
    act(() => result.current.toggleAuto());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(gachaApi.pull).toHaveBeenCalled();
  });
});
