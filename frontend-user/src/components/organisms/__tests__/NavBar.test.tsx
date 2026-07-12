import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NavBar from "../NavBar";
import { setPathname, mockPush } from "../../../__tests__/setup";
import * as auth from "@/lib/auth";

vi.mock("@/lib/auth", () => ({
  saveToken: vi.fn(),
  clearToken: vi.fn(),
  getToken: vi.fn(),
  getCurrentUser: vi.fn(),
  decodeToken: vi.fn(),
}));

const mockedGetCurrentUser = vi.mocked(auth.getCurrentUser);
const mockedClearToken = vi.mocked(auth.clearToken);

describe("NavBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPathname("/gacha");
    mockedGetCurrentUser.mockReturnValue(null);
  });

  it("renders nothing on /login", () => {
    setPathname("/login");
    const { container } = render(<NavBar />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing on /register", () => {
    setPathname("/register");
    const { container } = render(<NavBar />);
    expect(container.innerHTML).toBe("");
  });

  it("renders login and register links when unauthenticated", () => {
    mockedGetCurrentUser.mockReturnValue(null);
    render(<NavBar />);
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.getByText("Register")).toBeInTheDocument();
    expect(screen.queryByText("Logout")).not.toBeInTheDocument();
  });

  it("renders authenticated nav with email, gacha, profile, logout", () => {
    mockedGetCurrentUser.mockReturnValue({
      sub: "1",
      email: "test@example.com",
      role: "user",
      iat: 1,
      exp: 9999999999,
    });
    render(<NavBar />);
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("Gacha")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
    expect(screen.queryByText("Login")).not.toBeInTheDocument();
  });

  it("re-checks auth on pathname change", async () => {
    mockedGetCurrentUser.mockReturnValue(null);
    render(<NavBar />);
    expect(screen.getByText("Login")).toBeInTheDocument();

    mockedGetCurrentUser.mockReturnValue({
      sub: "1",
      email: "new@user.com",
      role: "user",
      iat: 1,
      exp: 9999999999,
    });
    setPathname("/profile");
    await waitFor(() => {
      expect(screen.getByText("new@user.com")).toBeInTheDocument();
    });
  });

  it("calls clearToken and navigates to /login on logout", async () => {
    const user = userEvent.setup();
    mockedGetCurrentUser.mockReturnValue({
      sub: "1",
      email: "test@example.com",
      role: "user",
      iat: 1,
      exp: 9999999999,
    });
    render(<NavBar />);
    await user.click(screen.getByText("Logout"));
    expect(mockedClearToken).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/login");
  });
});
