import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RewardCard } from "../RewardCard";

const result = { item: { id: "i1", name: "Excalibur", rarity: "legendary" }, remainingCoins: 90 };

describe("RewardCard", () => {
  it("renders the reward with rarity badge and continue button", () => {
    const onContinue = vi.fn();
    render(<RewardCard result={result} interactive showContinue onContinue={onContinue} />);
    expect(screen.getByText("You got:")).toBeInTheDocument();
    expect(screen.getByText("Excalibur")).toBeInTheDocument();
    expect(screen.getByText("legendary")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onContinue).toHaveBeenCalled();
  });

  it("tilts on pointer move when interactive and resets on leave", () => {
    render(<RewardCard result={result} interactive />);
    const name = screen.getByText("Excalibur");
    fireEvent.pointerMove(name, { clientX: 10, clientY: 10 });
    fireEvent.pointerLeave(name);
    expect(name).toBeInTheDocument();
  });

  it("ignores pointer move when not interactive, and supports compact mode", () => {
    render(<RewardCard result={{ ...result, item: { ...result.item, rarity: "common" } }} compact />);
    fireEvent.pointerMove(screen.getByText("Excalibur"), { clientX: 5, clientY: 5 });
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();
  });
});
