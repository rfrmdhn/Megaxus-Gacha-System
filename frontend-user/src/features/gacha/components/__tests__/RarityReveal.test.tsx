import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { RarityReveal } from "../RarityReveal";
import { RARITY_TREATMENTS, Rarity } from "../../lib/rarity";

function renderReveal(rarity: Rarity, extra: Partial<React.ComponentProps<typeof RarityReveal>> = {}) {
  const props = {
    result: { item: { id: "x", name: "Relic", rarity }, remainingCoins: 0 },
    speed: 1,
    reducedMotion: false,
    onSound: vi.fn(),
    onVibrate: vi.fn(),
    onComplete: vi.fn(),
    onContinue: vi.fn(),
    ...extra,
  };
  render(<RarityReveal {...(props as React.ComponentProps<typeof RarityReveal>)} />);
  return props;
}

describe("RarityReveal", () => {
  afterEach(() => vi.useRealTimers());

  it.each<Rarity>(["common", "rare", "legendary"])(
    "starts charging and charges the portal sound for %s",
    (rarity) => {
      const props = renderReveal(rarity);
      expect(screen.getByTestId("rarity-reveal")).toHaveAttribute("data-rarity", rarity);
      expect(screen.getByText("Opening...")).toBeInTheDocument();
      expect(props.onSound).toHaveBeenCalledWith("portal-charge");
    },
  );

  // Advance one timeline step at a time so each phase commits separately and
  // its effect runs (React batches multiple timer flushes into one commit).
  function stepThrough(rarity: Rarity) {
    for (const step of RARITY_TREATMENTS[rarity].timeline) {
      act(() => vi.advanceTimersByTime(step.ms));
    }
  }

  it("plays a rare reveal through to the reward", () => {
    vi.useFakeTimers();
    const props = renderReveal("rare");
    stepThrough("rare");
    expect(screen.getByText("You got:")).toBeInTheDocument();
    expect(props.onSound).toHaveBeenCalledWith("rare-reveal");
    expect(props.onSound).toHaveBeenCalledWith("reward");
    expect(props.onVibrate).toHaveBeenCalledWith(RARITY_TREATMENTS.rare.vibration);
    expect(props.onComplete).toHaveBeenCalledTimes(1);
  });

  it("plays a common reveal (no camera shake) to the reward", () => {
    vi.useFakeTimers();
    const props = renderReveal("common");
    stepThrough("common");
    expect(props.onComplete).toHaveBeenCalledTimes(1);
    expect(props.onSound).toHaveBeenCalledWith("reward");
  });

  it("collapses to the reward under reduced motion", () => {
    const props = renderReveal("legendary", { reducedMotion: true });
    expect(screen.getByText("You got:")).toBeInTheDocument();
    expect(props.onComplete).toHaveBeenCalledTimes(1);
  });

  it("fast-forwards when the Skip button is pressed", () => {
    renderReveal("legendary");
    expect(screen.queryByText("You got:")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Skip"));
    expect(screen.getByText("You got:")).toBeInTheDocument();
  });

  it("dismisses via the reward Continue button", () => {
    const props = renderReveal("common", { reducedMotion: true });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(props.onContinue).toHaveBeenCalled();
  });

  const multi = {
    results: [
      { item: { id: "a", name: "A", rarity: "common" }, remainingCoins: 0 },
      { item: { id: "b", name: "B", rarity: "rare" }, remainingCoins: 0 },
    ],
    bestRarity: "rare",
    remainingCoins: 0,
  };

  it("keys a bulk buildup on bestRarity and reveals every card", () => {
    render(
      <RarityReveal
        multi={multi}
        speed={1}
        reducedMotion
        onSound={vi.fn()}
        onVibrate={vi.fn()}
        onComplete={vi.fn()}
        onContinue={vi.fn()}
      />,
    );
    expect(screen.getByTestId("rarity-reveal")).toHaveAttribute("data-rarity", "rare");
    expect(screen.getByTestId("multi-summon-results")).toBeInTheDocument();
    expect(screen.getAllByTestId("reward-card")).toHaveLength(2);
  });

  it("plays a bulk buildup then reveals the grid and dismisses via Continue", () => {
    vi.useFakeTimers();
    const onContinue = vi.fn();
    render(
      <RarityReveal
        multi={multi}
        speed={1}
        reducedMotion={false}
        onSound={vi.fn()}
        onVibrate={vi.fn()}
        onComplete={vi.fn()}
        onContinue={onContinue}
      />,
    );
    expect(screen.getByText("Opening...")).toBeInTheDocument();
    stepThrough("rare");
    expect(screen.getByTestId("multi-summon-results")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onContinue).toHaveBeenCalled();
  });
});
