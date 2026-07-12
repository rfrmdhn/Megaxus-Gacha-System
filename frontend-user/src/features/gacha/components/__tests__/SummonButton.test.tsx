import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SummonButton } from "../SummonButton";

describe("SummonButton", () => {
  it("fires onClick when enabled (primary)", () => {
    const onClick = vi.fn();
    render(<SummonButton onClick={onClick}>Summon</SummonButton>);
    fireEvent.click(screen.getByRole("button", { name: "Summon" }));
    expect(onClick).toHaveBeenCalled();
  });

  it("renders the multi variant and is disabled", () => {
    const onClick = vi.fn();
    render(
      <SummonButton variant="multi" disabled onClick={onClick}>
        Summon 10x
      </SummonButton>,
    );
    expect(screen.getByRole("button", { name: "Summon 10x" })).toBeDisabled();
  });
});
