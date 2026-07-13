import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfilePage from "../page";
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

const mockProfile = { id: "1", email: "user@test.com", coins: 100 };
const mockHistoryPage = {
  items: [
    { id: "h1", eventName: "Summer Event", itemName: "Sword", rarity: "common", coinsSpent: 10, createdAt: "2025-06-01T10:00:00Z" },
    { id: "h2", eventName: "Summer Event", itemName: "Staff", rarity: "rare", coinsSpent: 10, createdAt: "2025-06-02T11:00:00Z" },
  ],
  nextCursor: "cursor-abc",
};
const mockHistoryPage2 = {
  items: [
    { id: "h3", eventName: "Winter Event", itemName: "Crown", rarity: "legendary", coinsSpent: 10, createdAt: "2025-06-03T12:00:00Z" },
  ],
  nextCursor: null,
};

function setupAuth() {
  mockedGetCurrentUser.mockReturnValue({
    sub: "1",
    email: "user@test.com",
    role: "user",
    iat: 1,
    exp: 9999999999,
  });
}

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it("redirects to /login when not authenticated", async () => {
    mockedGetCurrentUser.mockReturnValue(null);
    render(<ProfilePage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("loads profile and history on mount", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") return mockProfile;
      if (path.includes("/user/history")) return mockHistoryPage;
      return null;
    });
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("user@test.com")).toBeInTheDocument();
      expect(screen.getByText("100 coins")).toBeInTheDocument();
      expect(screen.getByText("Sword")).toBeInTheDocument();
      expect(screen.getByText("Staff")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Summer Event").length).toBe(2);
  });

  it("redirects to /login if profile fetch fails", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") throw new Error("unauthorized");
      if (path.includes("/user/history")) return { items: [], nextCursor: null };
      return null;
    });
    render(<ProfilePage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("shows 'No pulls yet' when history is empty", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") return mockProfile;
      if (path.includes("/user/history")) return { items: [], nextCursor: null };
      return null;
    });
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("No pulls yet.")).toBeInTheDocument();
    });
  });

  it("shows Load more button when there are more pages", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") return mockProfile;
      if (path.includes("/user/history")) return mockHistoryPage;
      return null;
    });
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Load more")).toBeInTheDocument();
    });
  });

  it("loads next page on 'Load more' click", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") return mockProfile;
      if (path === "/user/history?limit=20") return mockHistoryPage;
      if (path.includes("/user/history?cursor=")) return mockHistoryPage2;
      return null;
    });
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Load more")).toBeInTheDocument();
    });

    const user = userEvent.setup({ delay: null });
    await act(async () => {
      await user.click(screen.getByText("Load more"));
      await new Promise((r) => setTimeout(r, 0));
    });

    await waitFor(() => {
      expect(screen.getByText("Crown")).toBeInTheDocument();
      expect(screen.queryByText("Load more")).not.toBeInTheDocument();
    });
  });

  it("shows loading state during load more", async () => {
    let resolveHistory!: (v: unknown) => void;
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") return mockProfile;
      if (path === "/user/history?limit=20") return mockHistoryPage;
      if (path.includes("/user/history?cursor=")) return new Promise((r) => { resolveHistory = r; });
      return null;
    });
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Load more")).toBeInTheDocument();
    });

    const user = userEvent.setup({ delay: null });
    await act(async () => {
      await user.click(screen.getByText("Load more"));
      await new Promise((r) => setTimeout(r, 0));
    });

    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    resolveHistory(mockHistoryPage2);
    await waitFor(() => {
      expect(screen.getByText("Crown")).toBeInTheDocument();
    });
  });

  it("formats dates correctly", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") return mockProfile;
      if (path.includes("/user/history")) return {
        items: [{ id: "h1", eventName: "Ev", itemName: "It", rarity: "common", coinsSpent: 10, createdAt: "2025-06-01T10:30:00Z" }],
        nextCursor: null,
      };
      return null;
    });
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText(/6\/1\/2025/)).toBeInTheDocument();
    });
  });
});
