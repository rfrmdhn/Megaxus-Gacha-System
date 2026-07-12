import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconButton } from "./IconButton";

describe("IconButton", () => {
  it("renders the label as title and aria-label", () => {
    const onClick = jest.fn();
    render(
      <IconButton icon={<span>icon</span>} label="Edit" onClick={onClick} />,
    );

    const btn = screen.getByTitle("Edit");
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-label", "Edit");
  });

  it("calls onClick when clicked", async () => {
    const onClick = jest.fn();
    render(
      <IconButton icon={<span>icon</span>} label="Edit" onClick={onClick} />,
    );

    await userEvent.click(screen.getByTitle("Edit"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is true", () => {
    const onClick = jest.fn();
    render(
      <IconButton
        icon={<span>icon</span>}
        label="Edit"
        onClick={onClick}
        disabled
      />,
    );
    expect(screen.getByTitle("Edit")).toBeDisabled();
  });

  it("renders the icon", () => {
    const onClick = jest.fn();
    render(
      <IconButton icon={<span data-testid="icon-el">X</span>} label="Close" onClick={onClick} />,
    );
    expect(screen.getByTestId("icon-el")).toBeInTheDocument();
  });
});
