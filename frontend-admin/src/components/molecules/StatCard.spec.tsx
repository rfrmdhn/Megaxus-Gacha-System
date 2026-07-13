import { render, screen } from "@testing-library/react";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="Total users" value={42} />);

    expect(screen.getByText("Total users")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders string values", () => {
    render(<StatCard label="Status" value="Active" />);

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});
