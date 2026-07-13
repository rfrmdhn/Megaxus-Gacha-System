import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NavBar from "../NavBar";
import { setPathname, mockPush } from "../../../__tests__/setup";
import * as auth from "@/lib/auth";

vi.mock("@/lib/auth", () => ({
  saveToken: vi.fn(),
  clearToken: vi.fn(),
  clearSession: vi.fn(),
  getToken: vi.fn(),
  getCurrentUser: vi.fn(),
  decodeToken: vi.fn(),
}));

const mockedGetCurrentUser = vi.mocked(auth.getCurrentUser);
const mockedClearSession = vi.mocked(auth.clearSession);

describe("NavBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPathname("/gacha");
    mockedGetCurrentUser.mockReturnValue(null);
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
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
    expect(screen.getByText("Events")).toBeInTheDocument();
    expect(screen.getByText("Gacha")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
    expect(screen.queryByText("Login")).not.toBeInTheDocument();
  });

  it("toggles the mobile menu open and closed", async () => {
    const user = userEvent.setup();
    mockedGetCurrentUser.mockReturnValue({
      sub: "1",
      email: "test@example.com",
      role: "user",
      iat: 1,
      exp: 9999999999,
    });
    render(<NavBar />);

    // Opening flips the toggle's accessible label (covers the open-icon branch).
    await user.click(screen.getByLabelText("Open menu"));
    expect(screen.getByLabelText("Close menu")).toBeInTheDocument();

    // Navigating via a link collapses the menu again.
    await user.click(screen.getByText("Events"));
    expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
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

  it("switches to a solid background once the page is scrolled", () => {
    render(<NavBar />);
    const header = document.querySelector("header")!;
    expect(header.className).toContain("bg-white/80");

    act(() => {
      Object.defineProperty(window, "scrollY", { value: 100, configurable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(header.className).toContain("bg-white ");
    expect(header.className).not.toContain("bg-white/80");

    act(() => {
      Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(header.className).toContain("bg-white/80");
  });

  it("removes the scroll listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<NavBar />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
    removeSpy.mockRestore();
  });

  it("calls clearSession and navigates to /login on logout", async () => {
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
    expect(mockedClearSession).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/login");
  });
});
