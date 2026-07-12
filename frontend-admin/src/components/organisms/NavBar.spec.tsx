import { render, screen } from "@testing-library/react";
import NavBar from "./NavBar";

const mockPathname = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => mockPathname(),
}));

jest.mock("@/lib/auth", () => ({
  getCurrentUser: jest.fn(() => ({
    sub: "admin1",
    email: "admin@test.com",
    role: "admin",
    iat: 0,
    exp: 9999999999,
  })),
  clearToken: jest.fn(),
}));

describe("NavBar", () => {
  it("renders navigation links when user is logged in", () => {
    mockPathname.mockReturnValue("/");
    render(<NavBar />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Events")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Live history")).toBeInTheDocument();
  });

  it("shows user email", () => {
    mockPathname.mockReturnValue("/");
    render(<NavBar />);
    expect(screen.getByText("admin@test.com")).toBeInTheDocument();
  });

  it("shows logout button", () => {
    mockPathname.mockReturnValue("/");
    render(<NavBar />);
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });
});

describe("NavBar - no user", () => {
  beforeEach(() => {
    const auth = require("@/lib/auth");
    auth.getCurrentUser.mockReturnValue(null);
  });

  it("shows Login link when not authenticated", () => {
    mockPathname.mockReturnValue("/");
    render(<NavBar />);
    expect(screen.getByText("Login")).toBeInTheDocument();
  });
});

describe("NavBar - login path", () => {
  it("returns null on login page", () => {
    mockPathname.mockReturnValue("/login");
    const { container } = render(<NavBar />);
    expect(container.innerHTML).toBe("");
  });
});
