import { render, screen } from "@testing-library/react";
import { RarityChart } from "./RarityChart";

// recharts renders an SVG that jsdom can't lay out; stub the primitives to plain
// markup so we can assert the data mapping (bars + colors) instead.
jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart">{children}</div>
  ),
  BarChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="barchart" data-count={data.length}>
      {children}
    </div>
  ),
  Bar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: ({ fill }: { fill: string }) => <div data-testid="cell" data-fill={fill} />,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

describe("RarityChart", () => {
  it("shows an empty-state message when there are no pulls", () => {
    render(<RarityChart data={[]} />);
    expect(screen.getByText("No pulls recorded yet.")).toBeInTheDocument();
    expect(screen.queryByTestId("barchart")).not.toBeInTheDocument();
  });

  it("renders a bar per rarity and colors known and unknown rarities", () => {
    render(
      <RarityChart
        data={[
          { rarity: "legendary", count: 2 },
          { rarity: "mythic", count: 1 },
        ]}
      />,
    );

    // Two distinct rarities → two bars.
    expect(screen.getByTestId("barchart")).toHaveAttribute("data-count", "2");
    const cells = screen.getAllByTestId("cell");
    expect(cells).toHaveLength(2);
    // Known rarity gets its palette color; unknown falls back to grey.
    expect(cells[0]).toHaveAttribute("data-fill", "#f59e0b");
    expect(cells[1]).toHaveAttribute("data-fill", "#cbd5e1");
  });
});
