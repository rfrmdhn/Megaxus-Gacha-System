import { render, screen } from "@testing-library/react";
import { Card } from "./Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Hello</Card>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("applies additional className", () => {
    const { container } = render(<Card className="my-class">Content</Card>);
    expect(container.firstElementChild!.className).toContain("my-class");
  });
});
