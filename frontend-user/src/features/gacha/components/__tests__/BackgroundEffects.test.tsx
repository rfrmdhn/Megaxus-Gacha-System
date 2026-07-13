import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BackgroundEffects } from "../BackgroundEffects";

describe("BackgroundEffects", () => {
  it("animates by default", () => {
    const { container } = render(<BackgroundEffects />);
    expect(container.querySelector(".animate-nebula")).toBeInTheDocument();
    expect(container.querySelector(".animate-twinkle")).toBeInTheDocument();
  });

  it("drops ambient motion under reduced motion", () => {
    const { container } = render(<BackgroundEffects dimmed reducedMotion />);
    expect(container.querySelector(".animate-nebula")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-twinkle")).not.toBeInTheDocument();
  });
});
