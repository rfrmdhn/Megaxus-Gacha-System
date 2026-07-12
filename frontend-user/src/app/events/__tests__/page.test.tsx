import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import EventsPage from "../page";
import { mockPush } from "../../../__tests__/setup";
import * as api from "@/lib/api";
import * as auth from "@/lib/auth";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("@/lib/auth", () => ({
  saveToken: vi.fn(),
  clearToken: vi.fn(),
  getToken: vi.fn(),
  getCurrentUser: vi.fn(),
  decodeToken: vi.fn(),
}));

const mockedApiFetch = vi.mocked(api.apiFetch);
const mockedGetCurrentUser = vi.mocked(auth.getCurrentUser);

const mockEvents = [
  { id: "ev1", name: "Summer Event", startsAt: "2025-01-01", endsAt: "2025-12-31" },
  { id: "ev2", name: "Winter Event", startsAt: "2025-06-01", endsAt: "2025-12-31" },
];

function setupAuth() {
  mockedGetCurrentUser.mockReturnValue({
    sub: "1",
    email: "user@test.com",
    role: "user",
    iat: 1,
    exp: 9999999999,
  });
}

describe("EventsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it("redirects to /login when not authenticated", async () => {
    mockedGetCurrentUser.mockReturnValue(null);
    render(<EventsPage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("shows loading state before events load", () => {
    mockedApiFetch.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<EventsPage />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows 'No active events' when the list is empty", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/events") return [];
      return null;
    });
    render(<EventsPage />);

    await waitFor(() => {
      expect(screen.getByText("No active events right now.")).toBeInTheDocument();
    });
  });

  it("renders event cards linking to /gacha?eventId=<id>", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/events") return mockEvents;
      return null;
    });
    render(<EventsPage />);

    await waitFor(() => {
      expect(screen.getByText("Summer Event")).toBeInTheDocument();
      expect(screen.getByText("Winter Event")).toBeInTheDocument();
    });

    expect(screen.getByText("Summer Event").closest("a")).toHaveAttribute("href", "/gacha?eventId=ev1");
    expect(screen.getByText("Winter Event").closest("a")).toHaveAttribute("href", "/gacha?eventId=ev2");
  });

  it("shows an error message when the events fetch fails", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/events") throw new Error("fail");
      return null;
    });
    render(<EventsPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load events")).toBeInTheDocument();
    });
  });
});
