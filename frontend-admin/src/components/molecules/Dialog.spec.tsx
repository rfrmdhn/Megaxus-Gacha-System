import { render, screen } from "@testing-library/react";
import { Dialog } from "./Dialog";

describe("Dialog", () => {
  it("renders title and children", () => {
    render(
      <Dialog title="My Dialog" onClose={jest.fn()}>
        <p>Content</p>
      </Dialog>,
    );
    expect(screen.getByText("My Dialog")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders footer when provided", () => {
    render(
      <Dialog title="Test" onClose={jest.fn()} footer={<button>Save</button>}>
        <p>body</p>
      </Dialog>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("calls onClose when escape is pressed", () => {
    const onClose = jest.fn();
    render(
      <Dialog title="Dialog" onClose={onClose}>
        <p>body</p>
      </Dialog>,
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = jest.fn();
    render(
      <Dialog title="Dialog" onClose={onClose}>
        <p>body</p>
      </Dialog>,
    );
    const backdrop = document.querySelector<HTMLElement>(".fixed.inset-0");
    backdrop!.click();
    expect(onClose).toHaveBeenCalled();
  });

  it("does not call close when content is clicked", () => {
    const onClose = jest.fn();
    const { container } = render(
      <Dialog title="Dialog" onClose={onClose}>
        <p>Click me</p>
      </Dialog>,
    );
    const content = screen.getByText("Click me");
    content.click();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("removes listener on unmount", () => {
    const onClose = jest.fn();
    const { unmount } = render(
      <Dialog title="Dialog" onClose={onClose}>
        <p>body</p>
      </Dialog>,
    );
    unmount();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
