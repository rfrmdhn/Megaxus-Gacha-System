import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SummonControls } from "../SummonControls";

function setup(overrides: Partial<React.ComponentProps<typeof SummonControls>> = {}) {
  const props = {
    skip: false,
    onSkipChange: vi.fn(),
    speed: 1,
    onSpeedChange: vi.fn(),
    muted: false,
    onToggleMute: vi.fn(),
    onToggleFullscreen: vi.fn(),
    ...overrides,
  };
  render(<SummonControls {...props} />);
  return props;
}

describe("SummonControls", () => {
  it("toggles skip, speed, mute, and fullscreen", () => {
    const props = setup();
    fireEvent.click(screen.getByLabelText("Skip animation"));
    expect(props.onSkipChange).toHaveBeenCalledWith(true);

    fireEvent.change(screen.getByLabelText("Animation speed"), { target: { value: "2" } });
    expect(props.onSpeedChange).toHaveBeenCalledWith(2);

    fireEvent.click(screen.getByRole("button", { name: "Mute" }));
    expect(props.onToggleMute).toHaveBeenCalled();

    fireEvent.click(screen.getByText("⛶ Fullscreen"));
    expect(props.onToggleFullscreen).toHaveBeenCalled();
  });

  it("reflects the muted state", () => {
    setup({ muted: true });
    expect(screen.getByText("🔇 Sound off")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unmute" })).toBeInTheDocument();
  });
});
