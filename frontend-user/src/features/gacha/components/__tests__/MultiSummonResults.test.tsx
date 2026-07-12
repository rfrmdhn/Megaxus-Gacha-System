import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MultiSummonResults } from "../MultiSummonResults";

const results = [
  { item: { id: "a", name: "A", rarity: "common" }, remainingCoins: 90 },
  { item: { id: "b", name: "B", rarity: "legendary" }, remainingCoins: 0 },
  { item: { id: "c", name: "C", rarity: "rare" }, remainingCoins: 0 },
];

describe("MultiSummonResults", () => {
  it("shows the count, the best rarity, and every card", () => {
    const onContinue = vi.fn();
    render(<MultiSummonResults results={results} onContinue={onContinue} />);
    expect(screen.getByText("Summon results (3)")).toBeInTheDocument();
    expect(screen.getByText("legendary")).toBeInTheDocument();
    expect(screen.getAllByTestId("reward-card")).toHaveLength(3);
    fireEvent.click(screen.getByText("Continue"));
    expect(onContinue).toHaveBeenCalled();
  });
});
