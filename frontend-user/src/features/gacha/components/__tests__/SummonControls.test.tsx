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
    auto: false,
    onToggleAuto: vi.fn(),
    canReplay: false,
    onReplay: vi.fn(),
    onToggleFullscreen: vi.fn(),
    ...overrides,
  };
  render(<SummonControls {...props} />);
  return props;
}

describe("SummonControls", () => {
  it("toggles skip, speed, mute, auto, and fullscreen", () => {
    const props = setup();
    fireEvent.click(screen.getByLabelText("Skip animation"));
    expect(props.onSkipChange).toHaveBeenCalledWith(true);

    fireEvent.change(screen.getByLabelText("Animation speed"), { target: { value: "2" } });
    expect(props.onSpeedChange).toHaveBeenCalledWith(2);

    fireEvent.click(screen.getByRole("button", { name: "Mute" }));
    expect(props.onToggleMute).toHaveBeenCalled();

    fireEvent.click(screen.getByText("♻ Auto summon"));
    expect(props.onToggleAuto).toHaveBeenCalled();

    fireEvent.click(screen.getByText("⛶ Fullscreen"));
    expect(props.onToggleFullscreen).toHaveBeenCalled();

    expect(screen.getByText("↺ Replay")).toBeDisabled();
  });

  it("reflects the muted / auto states and enables replay", () => {
    const props = setup({ muted: true, auto: true, canReplay: true, disabled: true });
    expect(screen.getByText("🔇 Sound off")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unmute" })).toBeInTheDocument();
    expect(screen.getByText("⏹ Stop auto")).toBeDisabled();
    const replay = screen.getByText("↺ Replay");
    expect(replay).not.toBeDisabled();
    fireEvent.click(replay);
    expect(props.onReplay).toHaveBeenCalled();
  });
});
