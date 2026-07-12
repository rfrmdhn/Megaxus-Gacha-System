import { render, screen } from "@testing-library/react";
import DashboardPage from "./page";

jest.mock("@/lib/api", () => ({
  apiFetch: jest.fn(),
  ApiError: class extends Error {
    status: number;
    constructor(m: string, s: number) {
      super(m);
      this.status = s;
    }
  },
}));

const mockAdminUser = { sub: "admin1", email: "admin@test.com", role: "admin", iat: 0, exp: 9999999999 };
jest.mock("@/lib/useRequireAdmin", () => ({
  useRequireAdmin: jest.fn(() => ({ user: mockAdminUser, checking: false })),
}));

import { apiFetch } from "@/lib/api";

beforeEach(() => {
  (apiFetch as jest.Mock).mockReset();
});

it("renders loading state then stats", async () => {
  (apiFetch as jest.Mock).mockResolvedValue({
    totalUsers: 100,
    activeEvents: 3,
    totalEvents: 10,
    pullsToday: 500,
    totalPulls: 50000,
    totalCoinsSpent: 1000000,
  });

  render(<DashboardPage />);

  expect(screen.getByText(/Loading stats/)).toBeInTheDocument();

  expect(await screen.findByText("100")).toBeInTheDocument();
  expect(screen.getByText("3")).toBeInTheDocument();
  expect(screen.getByText("10")).toBeInTheDocument();
  expect(screen.getByText("500")).toBeInTheDocument();
});

it("shows error message when apiFetch fails", async () => {
  (apiFetch as jest.Mock).mockRejectedValue(
    new (require("@/lib/api").ApiError)("Stats error", 500),
  );

  render(<DashboardPage />);

  expect(await screen.findByText("Stats error")).toBeInTheDocument();
});

it("does not fetch when user is null", () => {
  const { useRequireAdmin } = require("@/lib/useRequireAdmin");
  useRequireAdmin.mockReturnValue({ user: null, checking: false });

  render(<DashboardPage />);

  expect(apiFetch).not.toHaveBeenCalled();
});
