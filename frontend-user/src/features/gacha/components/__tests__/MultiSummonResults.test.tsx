import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MultiSummonResults } from "../MultiSummonResults";

const data = {
  results: [
    { item: { id: "a", name: "A", rarity: "Biasa", imageKey: null }, remainingCoins: 90 },
    { item: { id: "b", name: "B", rarity: "Langka", imageKey: null }, remainingCoins: 0 },
    { item: { id: "c", name: "C", rarity: "Biasa", imageKey: null }, remainingCoins: 0 },
  ],
  // Free-form backend label — displayed verbatim, not re-derived on the client.
  bestRarity: "Langka",
  remainingCoins: 0,
};

describe("MultiSummonResults", () => {
  it("shows the count, the backend best rarity verbatim, and every card", () => {
    const onContinue = vi.fn();
    render(<MultiSummonResults data={data} onContinue={onContinue} />);
    expect(screen.getByText("Summon results (3)")).toBeInTheDocument();
    expect(screen.getByText("Best pull:")).toBeInTheDocument();
    // "Langka" shows in the headline and on card B's badge.
    expect(screen.getAllByText("Langka").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByTestId("reward-card")).toHaveLength(3);
    fireEvent.click(screen.getByText("Continue"));
    expect(onContinue).toHaveBeenCalled();
  });
});
