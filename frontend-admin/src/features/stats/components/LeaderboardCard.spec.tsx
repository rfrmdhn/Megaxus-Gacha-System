import { render, screen } from "@testing-library/react";
import { LeaderboardCard } from "./LeaderboardCard";

describe("LeaderboardCard", () => {
  it("shows an empty state when there are no entries", () => {
    render(<LeaderboardCard entries={[]} />);
    expect(screen.getByText("No pulls recorded yet.")).toBeInTheDocument();
  });

  it("ranks entries and shows a fallback for a deleted user", () => {
    render(
      <LeaderboardCard
        entries={[
          { userId: "u1", email: "first@test.com", pullCount: 50, coinsSpent: 500 },
          { userId: "u2", email: null, pullCount: 20, coinsSpent: 200 },
        ]}
      />,
    );

    expect(screen.getByText("first@test.com")).toBeInTheDocument();
    expect(screen.getByText("(deleted user)")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("500 coins")).toBeInTheDocument();
  });

  it("renders a muted rank chip beyond the podium (4th place)", () => {
    render(
      <LeaderboardCard
        entries={[1, 2, 3, 4].map((n) => ({
          userId: `u${n}`,
          email: `p${n}@test.com`,
          pullCount: 10 - n,
          coinsSpent: n,
        }))}
      />,
    );
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});
