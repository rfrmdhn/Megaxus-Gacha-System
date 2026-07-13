import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EventCard } from "../EventCard";
import { GachaEvent } from "@/features/gacha/types";

function makeEvent(overrides: Partial<GachaEvent> = {}): GachaEvent {
  return {
    id: "evt-1",
    name: "Summer Splash",
    startsAt: "2026-08-01T00:00:00.000Z",
    endsAt: "2026-08-31T00:00:00.000Z",
    imageKey: null,
    ...overrides,
  };
}

describe("EventCard", () => {
  it("links to the gacha page for the event", () => {
    render(<EventCard event={makeEvent()} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/gacha?eventId=evt-1");
    expect(screen.getByText("Summer Splash")).toBeInTheDocument();
  });

  it("shows a letter placeholder when the event has no image", () => {
    const { container } = render(<EventCard event={makeEvent({ imageKey: null })} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("renders the banner image when the event has one", () => {
    const { container } = render(<EventCard event={makeEvent({ imageKey: "events/evt-1.png" })} />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "http://localhost:3001/api/v1/events/evt-1/image");
  });

  it("falls back to the letter placeholder when the image fails to load", () => {
    const { container } = render(<EventCard event={makeEvent({ imageKey: "events/evt-1.png" })} />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("S")).toBeInTheDocument();
  });
});
