import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ItemImage } from "../ItemImage";

const withImage = { id: "item-1", rarity: "legendary", imageKey: "items/item-1.png" };
const withoutImage = { id: "item-2", rarity: "legendary", imageKey: null };
const LEGENDARY_ICON = "/assets/items/legendary.svg";

describe("ItemImage", () => {
  it("shows the uploaded image when the item has one", () => {
    const { container } = render(<ItemImage item={withImage} />);
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "http://localhost:3001/api/v1/events/items/item-1/image",
    );
  });

  it("falls back to the rarity icon when a set image fails to load", () => {
    const { container } = render(<ItemImage item={withImage} />);
    const img = container.querySelector("img")!;
    fireEvent.error(img);
    expect(img).toHaveAttribute("src", LEGENDARY_ICON);
  });

  it("keeps the rarity icon on error when it is already the fallback", () => {
    const { container } = render(<ItemImage item={withoutImage} />);
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("src", LEGENDARY_ICON);
    // src already equals the fallback → onError is a no-op, src unchanged.
    fireEvent.error(img);
    expect(img).toHaveAttribute("src", LEGENDARY_ICON);
  });

  it("re-syncs the shown image when the item prop changes", () => {
    const { container, rerender } = render(<ItemImage item={withoutImage} />);
    expect(container.querySelector("img")).toHaveAttribute("src", LEGENDARY_ICON);

    rerender(<ItemImage item={withImage} />);
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "http://localhost:3001/api/v1/events/items/item-1/image",
    );
  });
});
