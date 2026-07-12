import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GachaPage from "../page";
import { mockPush, setSearchParams } from "../../../__tests__/setup";
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
const mockEvents = [
  { id: "ev1", name: "Summer Event", startsAt: "2025-01-01", endsAt: "2025-12-31" },
];
const mockEventDetail = {
  items: [
    { id: "i1", name: "Sword", rarity: "common", dropRate: "60" },
    { id: "i2", name: "Staff", rarity: "rare", dropRate: "30" },
    { id: "i3", name: "Crown", rarity: "legendary", dropRate: "10" },
  ],
};
const mockPullResult = {
  item: { id: "i2", name: "Staff", rarity: "rare" },
  remainingCoins: 90,
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

describe("GachaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it("redirects to /login when not authenticated", async () => {
    mockedGetCurrentUser.mockReturnValue(null);
    render(<GachaPage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("shows loading state before profile loads", () => {
    mockedApiFetch.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<GachaPage />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("loads profile and events on mount", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") return mockProfile;
      if (path === "/events") return mockEvents;
      if (path === "/events/ev1") return mockEventDetail;
      return null;
    });
    render(<GachaPage />);

    await waitFor(() => {
      expect(screen.getByText("user@test.com")).toBeInTheDocument();
      expect(screen.getByText("100 coins")).toBeInTheDocument();
      expect(screen.getByText("Summer Event")).toBeInTheDocument();
      expect(screen.getByText("Pull (10 coins)")).toBeInTheDocument();
    });
  });

  it("shows drop rates for selected event", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") return mockProfile;
      if (path === "/events") return mockEvents;
      if (path === "/events/ev1") return mockEventDetail;
      return null;
    });
    render(<GachaPage />);

    await waitFor(() => {
      expect(screen.getByText("Sword")).toBeInTheDocument();
      expect(screen.getByText("Staff")).toBeInTheDocument();
      expect(screen.getByText("Crown")).toBeInTheDocument();
      expect(screen.getByText("60%")).toBeInTheDocument();
      expect(screen.getByText("30%")).toBeInTheDocument();
      expect(screen.getByText("10%")).toBeInTheDocument();
    });
  });

  it("shows 'No active gacha events' when events list is empty", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") return mockProfile;
      if (path === "/events") return [];
      return null;
    });
    render(<GachaPage />);

    await waitFor(() => {
      expect(screen.getByText("No active gacha events right now.")).toBeInTheDocument();
    });
  });

  it("performs a pull and shows result", async () => {
    mockedApiFetch.mockImplementation(async (path: string, opts?: RequestInit) => {
      if (path === "/user/profile") return mockProfile;
      if (path === "/events") return mockEvents;
      if (path === "/events/ev1") return mockEventDetail;
      if (path === "/gacha/pull" && opts?.method === "POST") return mockPullResult;
      return null;
    });
    render(<GachaPage />);

    await waitFor(() => {
      expect(screen.getByText("Pull (10 coins)")).toBeInTheDocument();
    });

    const user = userEvent.setup({ delay: null });
    await act(async () => {
      await user.click(screen.getByText("Pull (10 coins)"));
      await new Promise((r) => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getByText("You got:")).toBeInTheDocument();
      expect(screen.getAllByText("Staff").length).toBeGreaterThan(0);
      expect(screen.getByText("rare")).toBeInTheDocument();
      expect(screen.getByText("90 coins")).toBeInTheDocument();
    });
  });

  it("shows the reveal animation before the result by default", async () => {
    mockedApiFetch.mockImplementation(async (path: string, opts?: RequestInit) => {
      if (path === "/user/profile") return mockProfile;
      if (path === "/events") return mockEvents;
      if (path === "/events/ev1") return mockEventDetail;
      if (path === "/gacha/pull" && opts?.method === "POST") return mockPullResult;
      return null;
    });
    render(<GachaPage />);

    await waitFor(() => {
      expect(screen.getByText("Pull (10 coins)")).toBeInTheDocument();
    });

    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByText("Pull (10 coins)"));

    await waitFor(() => {
      expect(screen.getByText("Opening...")).toBeInTheDocument();
    });
    expect(screen.queryByText("You got:")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("You got:")).toBeInTheDocument();
    });
    expect(screen.queryByText("Opening...")).not.toBeInTheDocument();
  });

  it("skips the reveal animation when the skip checkbox is checked", async () => {
    mockedApiFetch.mockImplementation(async (path: string, opts?: RequestInit) => {
      if (path === "/user/profile") return mockProfile;
      if (path === "/events") return mockEvents;
      if (path === "/events/ev1") return mockEventDetail;
      if (path === "/gacha/pull" && opts?.method === "POST") return mockPullResult;
      return null;
    });
    render(<GachaPage />);

    await waitFor(() => {
      expect(screen.getByText("Pull (10 coins)")).toBeInTheDocument();
    });

    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByLabelText("Skip animation"));
    await user.click(screen.getByText("Pull (10 coins)"));

    await waitFor(() => {
      expect(screen.getByText("You got:")).toBeInTheDocument();
    });
    expect(screen.queryByText("Opening...")).not.toBeInTheDocument();
  });

  it("displays error on pull failure (ApiError)", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") return mockProfile;
      if (path === "/events") return mockEvents;
      if (path === "/events/ev1") return mockEventDetail;
      if (path === "/gacha/pull") throw new api.ApiError("Insufficient coins", 400);
      return null;
    });
    render(<GachaPage />);

    await waitFor(() => {
      expect(screen.getByText("Pull (10 coins)")).toBeInTheDocument();
    });

    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByText("Pull (10 coins)"));

    await waitFor(() => {
      expect(screen.getByText("Insufficient coins")).toBeInTheDocument();
    });
  });

  it("displays generic error on pull failure (non-ApiError)", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") return mockProfile;
      if (path === "/events") return mockEvents;
      if (path === "/events/ev1") return mockEventDetail;
      if (path === "/gacha/pull") throw new Error("network");
      return null;
    });
    render(<GachaPage />);

    await waitFor(() => {
      expect(screen.getByText("Pull (10 coins)")).toBeInTheDocument();
    });

    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByText("Pull (10 coins)"));

    await waitFor(() => {
      expect(screen.getByText("Pull failed")).toBeInTheDocument();
    });
  });

  it("redirects to /login if profile fetch fails", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") throw new Error("unauthorized");
      if (path === "/events") return [];
      return null;
    });
    render(<GachaPage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("shows pulling state during pull", async () => {
    let resolvePull!: (v: unknown) => void;
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") return mockProfile;
      if (path === "/events") return mockEvents;
      if (path === "/events/ev1") return mockEventDetail;
      if (path === "/gacha/pull") return new Promise((r) => { resolvePull = r; });
      return null;
    });
    render(<GachaPage />);

    await waitFor(() => {
      expect(screen.getByText("Pull (10 coins)")).toBeInTheDocument();
    });

    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByText("Pull (10 coins)"));

    await waitFor(() => {
      expect(screen.getByText("Pulling...")).toBeInTheDocument();
    });
    expect(screen.getByText("Pulling...").closest("button")).toBeDisabled();

    resolvePull(mockPullResult);
    await waitFor(() => {
      expect(screen.getByText("Pull (10 coins)")).toBeInTheDocument();
    });
  });

  it("clears previous result and error when pulling again", async () => {
    let pullCount = 0;
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") return mockProfile;
      if (path === "/events") return mockEvents;
      if (path === "/events/ev1") return mockEventDetail;
      if (path === "/gacha/pull") {
        pullCount++;
        if (pullCount === 1) throw new api.ApiError("Error", 400);
        return mockPullResult;
      }
      return null;
    });
    render(<GachaPage />);

    await waitFor(() => {
      expect(screen.getByText("Pull (10 coins)")).toBeInTheDocument();
    });

    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByText("Pull (10 coins)"));
    await waitFor(() => {
      expect(screen.getByText("Error")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Pull (10 coins)"));
    await waitFor(() => {
      expect(screen.queryByText("Error")).not.toBeInTheDocument();
      expect(screen.getAllByText("Staff").length).toBeGreaterThan(0);
    });
  });

  it("does not fetch event items when no event is selected", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") return mockProfile;
      if (path === "/events") return [];
      return null;
    });
    render(<GachaPage />);
    await waitFor(() => {
      expect(mockedApiFetch).not.toHaveBeenCalledWith("/events/ev1");
    });
  });

  it("does nothing on pull when selectedEventId is null", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") return mockProfile;
      if (path === "/events") return [];
      return null;
    });
    render(<GachaPage />);
    await waitFor(() => {
      expect(screen.getByText("No active gacha events right now.")).toBeInTheDocument();
    });
    expect(mockedApiFetch).not.toHaveBeenCalledWith("/gacha/pull", expect.anything());
  });

  it("handles event detail fetch failure gracefully", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") return mockProfile;
      if (path === "/events") return mockEvents;
      if (path === "/events/ev1") throw new Error("not found");
      return null;
    });
    render(<GachaPage />);
    await waitFor(() => {
      expect(screen.getByText("Pull (10 coins)")).toBeInTheDocument();
    });
    expect(screen.queryByText("Sword")).not.toBeInTheDocument();
  });

  it("handles events fetch failure gracefully", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") return mockProfile;
      if (path === "/events") throw new Error("fail");
      return null;
    });
    render(<GachaPage />);
    await waitFor(() => {
      expect(screen.getByText("No active gacha events right now.")).toBeInTheDocument();
    });
  });

  it("allows changing selected event", async () => {
    const mockEvents2 = [
      { id: "ev1", name: "Summer Event", startsAt: "2025-01-01", endsAt: "2025-12-31" },
      { id: "ev2", name: "Winter Event", startsAt: "2025-06-01", endsAt: "2025-12-31" },
    ];
    const mockEventDetail2 = {
      items: [{ id: "i4", name: "Shield", rarity: "epic", dropRate: "100" }],
    };
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") return mockProfile;
      if (path === "/events") return mockEvents2;
      if (path === "/events/ev1") return mockEventDetail;
      if (path === "/events/ev2") return mockEventDetail2;
      return null;
    });
    render(<GachaPage />);

    await waitFor(() => {
      expect(screen.getByText("Sword")).toBeInTheDocument();
    });

    const user = userEvent.setup({ delay: null });
    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "ev2");

    await waitFor(() => {
      expect(screen.getByText("Shield")).toBeInTheDocument();
      expect(screen.queryByText("Sword")).not.toBeInTheDocument();
    });
  });

  it("pre-selects the event from a valid ?eventId= query param", async () => {
    const mockEvents2 = [
      { id: "ev1", name: "Summer Event", startsAt: "2025-01-01", endsAt: "2025-12-31" },
      { id: "ev2", name: "Winter Event", startsAt: "2025-06-01", endsAt: "2025-12-31" },
    ];
    const mockEventDetail2 = {
      items: [{ id: "i4", name: "Shield", rarity: "epic", dropRate: "100" }],
    };
    setSearchParams({ eventId: "ev2" });
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") return mockProfile;
      if (path === "/events") return mockEvents2;
      if (path === "/events/ev1") return mockEventDetail;
      if (path === "/events/ev2") return mockEventDetail2;
      return null;
    });
    render(<GachaPage />);

    await waitFor(() => {
      expect(screen.getByText("Shield")).toBeInTheDocument();
      expect(screen.queryByText("Sword")).not.toBeInTheDocument();
    });
  });

  it("falls back to the first event when ?eventId= doesn't match any event", async () => {
    setSearchParams({ eventId: "bogus" });
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/user/profile") return mockProfile;
      if (path === "/events") return mockEvents;
      if (path === "/events/ev1") return mockEventDetail;
      return null;
    });
    render(<GachaPage />);

    await waitFor(() => {
      expect(screen.getByText("Sword")).toBeInTheDocument();
    });
  });
});
