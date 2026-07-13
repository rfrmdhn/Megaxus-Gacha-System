import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ConfirmProvider, useConfirm } from "./ConfirmDialog";

function Harness() {
  const confirm = useConfirm();
  const [result, setResult] = useState<string>("none");
  return (
    <div>
      <button
        onClick={async () => {
          const ok = await confirm({ title: "Delete?", message: "Sure?", danger: true });
          setResult(ok ? "confirmed" : "cancelled");
        }}
      >
        run
      </button>
      <span data-testid="result">{result}</span>
    </div>
  );
}

function renderHarness() {
  return render(
    <ConfirmProvider>
      <Harness />
    </ConfirmProvider>,
  );
}

describe("ConfirmProvider / useConfirm", () => {
  it("resolves true when the user confirms", async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByText("run"));
    expect(screen.getByText("Delete?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(screen.getByTestId("result")).toHaveTextContent("confirmed");
    expect(screen.queryByText("Delete?")).not.toBeInTheDocument();
  });

  it("resolves false when the user cancels", async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByText("run"));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByTestId("result")).toHaveTextContent("cancelled");
  });

  it("uses provided labels and non-danger styling", async () => {
    const user = userEvent.setup();
    function Custom() {
      const confirm = useConfirm();
      return (
        <button onClick={() => confirm({ message: "hi", confirmLabel: "Yes", cancelLabel: "No" })}>
          go
        </button>
      );
    }
    render(
      <ConfirmProvider>
        <Custom />
      </ConfirmProvider>,
    );

    await user.click(screen.getByText("go"));
    expect(screen.getByText("Please confirm")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No" })).toBeInTheDocument();
  });

  it("throws when used outside a ConfirmProvider", () => {
    function Orphan() {
      useConfirm();
      return null;
    }
    // Silence the expected React error boundary console noise.
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Orphan />)).toThrow(/ConfirmProvider/);
    spy.mockRestore();
  });
});
