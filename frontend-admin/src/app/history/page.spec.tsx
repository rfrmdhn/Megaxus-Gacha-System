import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EventHistoryPage from "./page";

const mockApiFetch = jest.fn();
jest.mock("@/lib/api", () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
  ApiError: class extends Error {
    status: number;
    constructor(m: string, s: number) {
      super(m);
      this.status = s;
    }
  },
  sseUrl: (path: string) => path,
}));

const mockAdminUser = { sub: "admin1", email: "admin@test.com", role: "admin", iat: 0, exp: 9999999999 };
jest.mock("@/lib/useRequireAdmin", () => ({
  useRequireAdmin: jest.fn(() => ({ user: mockAdminUser, checking: false })),
}));

function makeHistoryPage(overrides: any = {}): any {
  return {
    items: [
      {
        id: "h-1",
        userId: "u1",
        userEmail: "user@test.com",
        eventName: "Summer Event",
        itemName: "Sword",
        rarity: "rare",
        coinsSpent: 100,
        createdAt: "2026-06-01T12:00:00.000Z",
      },
    ],
    nextCursor: null,
    ...overrides,
  };
}

class MockEventSource {
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  addEventListener = jest.fn();
  close = jest.fn();

  constructor(public url: string) {
    queueMicrotask(() => {
      if (this.onopen) this.onopen();
    });
  }
}

beforeEach(() => {
  mockApiFetch.mockReset();
  (globalThis as any).EventSource = MockEventSource;
});

it("renders loading then history", async () => {
  mockApiFetch.mockResolvedValue(makeHistoryPage());

  render(<EventHistoryPage />);

  expect(screen.getByText(/Loading history/)).toBeInTheDocument();

  expect(await screen.findByText("user@test.com")).toBeInTheDocument();
  expect(screen.getByText("Sword")).toBeInTheDocument();
  expect(screen.getByText("100")).toBeInTheDocument();
});

it("shows error on failure", async () => {
  mockApiFetch.mockRejectedValue(
    new (require("@/lib/api").ApiError)("History error", 500),
  );

  render(<EventHistoryPage />);

  expect(await screen.findByText("History error")).toBeInTheDocument();
});

it("shows empty state", async () => {
  mockApiFetch.mockResolvedValue(makeHistoryPage({ items: [] }));

  render(<EventHistoryPage />);

  expect(await screen.findByText("No history found.")).toBeInTheDocument();
});

it("shows load more button when hasMore", async () => {
  mockApiFetch.mockResolvedValue(
    makeHistoryPage({ nextCursor: "cursor-2" }),
  );

  render(<EventHistoryPage />);

  expect(await screen.findByText("Load more")).toBeInTheDocument();
});

it("loads more on click", async () => {
  const user = userEvent.setup();
  const page2 = makeHistoryPage({
    items: [
      {
        id: "h-2",
        userId: "user2@test.com",
        userEmail: "user2@test.com",
        eventName: "Another Event",
        itemName: "Shield",
        rarity: "common",
        coinsSpent: 50,
        createdAt: "2026-06-01T13:00:00.000Z",
      },
    ],
    nextCursor: null,
  });

  mockApiFetch.mockResolvedValueOnce(makeHistoryPage({ nextCursor: "cursor-2" }));
  mockApiFetch.mockResolvedValueOnce(page2);
  mockApiFetch.mockResolvedValue(makeHistoryPage());

  render(<EventHistoryPage />);

  await screen.findByText("Load more");
  await user.click(screen.getByText("Load more"));

  expect(await screen.findByText("user2@test.com")).toBeInTheDocument();
});

it("shows live feed status as connected", async () => {
  mockApiFetch.mockResolvedValue(makeHistoryPage());

  render(<EventHistoryPage />);

  expect(await screen.findByText("Live")).toBeInTheDocument();
});
