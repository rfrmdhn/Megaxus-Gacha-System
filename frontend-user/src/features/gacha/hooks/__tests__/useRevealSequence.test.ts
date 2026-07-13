import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useRevealSequence } from "../useRevealSequence";
import { RARITY_TREATMENTS } from "../../lib/rarity";

describe("useRevealSequence", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("stays idle when there is no rarity", () => {
    const { result } = renderHook(() => useRevealSequence({ rarity: null }));
    expect(result.current.phase).toBe("idle");
    expect(result.current.isRevealed).toBe(false);
  });

  it("progresses through the timeline and completes", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useRevealSequence({ rarity: "common", onComplete }),
    );

    expect(result.current.phase).toBe("charging");

    act(() => {
      vi.advanceTimersByTime(RARITY_TREATMENTS.common.revealMs);
    });

    expect(result.current.phase).toBe("revealed");
    expect(result.current.isRevealed).toBe(true);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("passes through an intermediate phase", () => {
    const { result } = renderHook(() => useRevealSequence({ rarity: "rare" }));
    expect(result.current.phase).toBe("charging");
    act(() => {
      vi.advanceTimersByTime(RARITY_TREATMENTS.rare.timeline[0].ms);
    });
    expect(result.current.phase).toBe("portal");
  });

  it("scales timing by the speed multiplier", () => {
    const onComplete = vi.fn();
    renderHook(() => useRevealSequence({ rarity: "common", speed: 2, onComplete }));
    act(() => {
      vi.advanceTimersByTime(RARITY_TREATMENTS.common.revealMs / 2);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("skips straight to revealed when skip is set", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useRevealSequence({ rarity: "legendary", skip: true, onComplete }),
    );
    expect(result.current.phase).toBe("revealed");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("collapses to revealed under reduced motion", () => {
    const { result } = renderHook(() =>
      useRevealSequence({ rarity: "legendary", reducedMotion: true }),
    );
    expect(result.current.phase).toBe("revealed");
  });

  it("does not throw when onComplete is omitted", () => {
    const { result } = renderHook(() => useRevealSequence({ rarity: "common" }));
    act(() => {
      vi.advanceTimersByTime(RARITY_TREATMENTS.common.revealMs);
    });
    expect(result.current.isRevealed).toBe(true);
  });

  it("clears timers on unmount", () => {
    const onComplete = vi.fn();
    const { unmount } = renderHook(() => useRevealSequence({ rarity: "legendary", onComplete }));
    unmount();
    act(() => {
      vi.advanceTimersByTime(RARITY_TREATMENTS.legendary.revealMs);
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("resets to idle when rarity clears", () => {
    const { result, rerender } = renderHook(
      ({ rarity }: { rarity: "common" | null }) => useRevealSequence({ rarity }),
      { initialProps: { rarity: "common" as "common" | null } },
    );
    expect(result.current.phase).toBe("charging");
    rerender({ rarity: null });
    expect(result.current.phase).toBe("idle");
  });
});
