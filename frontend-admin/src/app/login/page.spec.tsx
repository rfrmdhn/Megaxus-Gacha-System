import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./page";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

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
}));

jest.mock("@/lib/auth", () => ({
  saveToken: jest.fn(),
  clearToken: jest.fn(),
  decodeToken: jest.fn(),
}));

import { decodeToken, saveToken, clearToken } from "@/lib/auth";

beforeEach(() => {
  mockApiFetch.mockReset();
  mockPush.mockReset();
  (decodeToken as jest.Mock).mockReset();
  (saveToken as jest.Mock).mockReset();
  (clearToken as jest.Mock).mockReset();
});

it("renders the login form", () => {
  render(<LoginPage />);

  expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  expect(screen.getByText("Log in")).toBeInTheDocument();
  expect(screen.getByText("Admin log in")).toBeInTheDocument();
});

it("shows error if login fails with ApiError", async () => {
  const user = userEvent.setup();
  mockApiFetch.mockRejectedValue(
    new (require("@/lib/api").ApiError)("Invalid credentials", 401),
  );

  render(<LoginPage />);

  await user.type(screen.getByPlaceholderText("Email"), "a@b.com");
  await user.type(screen.getByPlaceholderText("Password"), "wrong");
  await user.click(screen.getByText("Log in"));

  expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
});

it("shows generic error if login fails with non-ApiError", async () => {
  const user = userEvent.setup();
  mockApiFetch.mockRejectedValue(new Error("Network error"));

  render(<LoginPage />);

  await user.type(screen.getByPlaceholderText("Email"), "a@b.com");
  await user.type(screen.getByPlaceholderText("Password"), "pass");
  await user.click(screen.getByText("Log in"));

  expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
});

it("rejects non-admin users", async () => {
  const user = userEvent.setup();
  mockApiFetch.mockResolvedValue({ token: "fake-token" });
  (decodeToken as jest.Mock).mockReturnValue({
    sub: "u1",
    email: "user@test.com",
    role: "user",
    iat: 0,
    exp: 9999999999,
  });

  render(<LoginPage />);

  await user.type(screen.getByPlaceholderText("Email"), "user@test.com");
  await user.type(screen.getByPlaceholderText("Password"), "pass");
  await user.click(screen.getByText("Log in"));

  expect(
    await screen.findByText("This account does not have admin access."),
  ).toBeInTheDocument();
  expect(clearToken).toHaveBeenCalled();
  expect(saveToken).not.toHaveBeenCalled();
});

it("redirects to / on successful admin login", async () => {
  const user = userEvent.setup();

  mockApiFetch.mockResolvedValue({ token: "admin-token" });
  (decodeToken as jest.Mock).mockReturnValue({
    sub: "a1",
    email: "admin@test.com",
    role: "admin",
    iat: 0,
    exp: 9999999999,
  });

  render(<LoginPage />);

  await user.type(screen.getByPlaceholderText("Email"), "admin@test.com");
  await user.type(screen.getByPlaceholderText("Password"), "pass");
  await user.click(screen.getByText("Log in"));

  expect(saveToken).toHaveBeenCalledWith("admin-token");
  expect(mockPush).toHaveBeenCalledWith("/");
});
