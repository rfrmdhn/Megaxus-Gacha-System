import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "./page";

jest.mock("@/lib/api", () => ({
  apiFetch: jest.fn(),
  sseUrl: jest.fn(() => "http://test/admin/history/stream?token=x"),
  ApiError: class extends Error {
    status: number;
    constructor(m: string, s: number) {
      super(m);
      this.status = s;
    }
  },
}));

// Charts are exercised in their own specs; stub them here so jsdom needn't lay
// out an SVG and the dashboard test can focus on data wiring.
jest.mock("@/features/stats/components/RarityChart", () => ({
  RarityChart: ({ data }: { data: { rarity: string; count: number }[] }) => (
    <div data-testid="rarity-chart">
      {data.reduce((sum, entry) => sum + entry.count, 0)} pulls
    </div>
  ),
}));

const mockAdminUser = { sub: "admin1", email: "admin@test.com", role: "admin", iat: 0, exp: 9999999999 };
jest.mock("@/lib/useRequireAdmin", () => ({
  useRequireAdmin: jest.fn(() => ({ user: mockAdminUser, checking: false })),
}));

// useEvents pulls in useConfirm for its delete flow, which the dashboard never
// exercises; stub it so the hook doesn't need a real ConfirmProvider ancestor.
jest.mock("@/components/molecules/ConfirmDialog", () => ({
  useConfirm: () => jest.fn().mockResolvedValue(true),
}));

import { apiFetch } from "@/lib/api";

class MockEventSource {
  static instances: MockEventSource[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  listeners: Record<string, (e: { data: string }) => void> = {};
  closed = false;
  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }
  addEventListener(type: string, cb: (e: { data: string }) => void) {
    this.listeners[type] = cb;
  }
  close() {
    this.closed = true;
  }
  emitPull(data: unknown) {
    this.listeners["pull"]?.({ data: JSON.stringify(data) });
  }
}

const STATS = {
  totalUsers: 100,
  activeEvents: 3,
  totalEvents: 10,
  pullsToday: 500,
  totalPulls: 50000,
  totalCoinsSpent: 1000000,
};

const LEADERBOARD = [
  { userId: "u1", email: "top@test.com", pullCount: 42, coinsSpent: 420 },
];

const RARITY_BREAKDOWN: { rarity: string; count: number }[] = [];

const EVENTS = [
  {
    id: "evt-1",
    name: "Spring Fest",
    isActive: true,
    startsAt: "2026-06-01T00:00:00.000Z",
    endsAt: "2026-06-10T00:00:00.000Z",
    imageKey: null,
    items: [],
  },
];

function mockByPath() {
  (apiFetch as jest.Mock).mockImplementation((path: string) => {
    if (path.includes("leaderboard")) return Promise.resolve(LEADERBOARD);
    if (path.includes("rarity")) return Promise.resolve(RARITY_BREAKDOWN);
    if (path.includes("/admin/events")) return Promise.resolve(EVENTS);
    return Promise.resolve(STATS);
  });
}

beforeEach(() => {
  (apiFetch as jest.Mock).mockReset();
  MockEventSource.instances = [];
  (global as unknown as { EventSource: unknown }).EventSource = MockEventSource;
  const { useRequireAdmin } = require("@/lib/useRequireAdmin");
  useRequireAdmin.mockReturnValue({ user: mockAdminUser, checking: false });
});

it("renders loading state then stats and leaderboard", async () => {
  mockByPath();

  render(<DashboardPage />);
  expect(screen.getByText(/Loading stats/)).toBeInTheDocument();

  expect(await screen.findByText("100")).toBeInTheDocument();
  expect(screen.getByText("3")).toBeInTheDocument();
  expect(screen.getByText("top@test.com")).toBeInTheDocument();
});

it("marks the feed live on open and offline on error", async () => {
  mockByPath();
  render(<DashboardPage />);
  await screen.findByText("100");

  const es = MockEventSource.instances[0];
  act(() => es.onopen?.());
  expect(await screen.findByText("Live")).toBeInTheDocument();

  act(() => es.onerror?.());
  expect(await screen.findByText("Offline")).toBeInTheDocument();
});

it("applies live pull events to the rarity breakdown and refreshes the aggregates", async () => {
  mockByPath();
  render(<DashboardPage />);
  await screen.findByText("100");

  const es = MockEventSource.instances[0];
  act(() => es.emitPull({ eventId: "evt-1", rarity: "legendary", createdAt: "2026-07-12T00:00:00Z" }));
  expect(screen.getByTestId("rarity-chart")).toHaveTextContent("1 pulls");

  // A different rarity gets its own bucket, alongside the existing one.
  act(() => es.emitPull({ eventId: "evt-1", rarity: "common", createdAt: "2026-07-12T00:00:01Z" }));
  expect(screen.getByTestId("rarity-chart")).toHaveTextContent("2 pulls");

  // A second "legendary" pull increments only that bucket, leaving "common"
  // untouched.
  act(() => es.emitPull({ eventId: "evt-1", rarity: "legendary", createdAt: "2026-07-12T00:00:02Z" }));
  expect(screen.getByTestId("rarity-chart")).toHaveTextContent("3 pulls");

  // Debounced refetch fires after 500ms.
  (apiFetch as jest.Mock).mockClear();
  mockByPath();
  await waitFor(() => expect(apiFetch).toHaveBeenCalled(), { timeout: 2000 });
});

it("lets the admin filter live pulls by event", async () => {
  mockByPath();
  render(<DashboardPage />);
  await screen.findByText("100");

  const select = await screen.findByRole("combobox", { name: /filter live pulls by event/i });
  expect(select).toHaveTextContent("All events");
  expect(select).toHaveTextContent("Spring Fest");

  (apiFetch as jest.Mock).mockClear();
  mockByPath();
  await userEvent.selectOptions(select, "evt-1");

  await waitFor(() => {
    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining("eventId=evt-1"));
  });
});

it("ignores live pulls for other events once a specific event filter is active", async () => {
  mockByPath();
  render(<DashboardPage />);
  await screen.findByText("100");

  const select = await screen.findByRole("combobox", { name: /filter live pulls by event/i });
  await userEvent.selectOptions(select, "evt-1");
  await waitFor(() => expect(screen.getByTestId("rarity-chart")).toHaveTextContent("0 pulls"));

  const es = MockEventSource.instances[0];
  act(() =>
    es.emitPull({ eventId: "evt-2", rarity: "legendary", createdAt: "2026-07-12T00:00:00Z" }),
  );
  expect(screen.getByTestId("rarity-chart")).toHaveTextContent("0 pulls");

  act(() =>
    es.emitPull({ eventId: "evt-1", rarity: "legendary", createdAt: "2026-07-12T00:00:01Z" }),
  );
  expect(screen.getByTestId("rarity-chart")).toHaveTextContent("1 pulls");
});

it("shows error message when the initial load fails", async () => {
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
  expect(MockEventSource.instances).toHaveLength(0);
});
