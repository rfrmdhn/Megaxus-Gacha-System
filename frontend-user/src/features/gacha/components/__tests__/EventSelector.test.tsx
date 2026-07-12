import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EventSelector } from "../EventSelector";

const events = [
  { id: "ev1", name: "One", startsAt: "", endsAt: "" },
  { id: "ev2", name: "Two", startsAt: "", endsAt: "" },
];

describe("EventSelector", () => {
  it("renders options and reports changes", () => {
    const onChange = vi.fn();
    render(<EventSelector events={events} selectedEventId="ev1" onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "ev2" } });
    expect(onChange).toHaveBeenCalledWith("ev2");
  });

  it("renders with no selection without crashing", () => {
    render(<EventSelector events={events} selectedEventId={null} onChange={vi.fn()} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
