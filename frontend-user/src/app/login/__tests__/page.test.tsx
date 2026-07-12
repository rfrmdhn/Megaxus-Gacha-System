import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "../page";
import { mockPush } from "../../../__tests__/mocks";
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
const mockedSaveToken = vi.mocked(auth.saveToken);

function makeApiError(message: string, status: number) {
  return new api.ApiError(message, status);
}

describe("LoginPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders login form", () => {
    render(<LoginPage />);
    expect(screen.getByText("Log in")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByText("Register")).toBeInTheDocument();
    expect(screen.getByText("No account yet?")).toBeInTheDocument();
  });

  it("submits login and redirects on success", async () => {
    const user = userEvent.setup();
    mockedApiFetch.mockResolvedValue({ token: "jwt-token" });
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", password: "password123" }),
      });
      expect(mockedSaveToken).toHaveBeenCalledWith("jwt-token");
      expect(mockPush).toHaveBeenCalledWith("/gacha");
    });
  });

  it("displays API error message", async () => {
    const user = userEvent.setup();
    mockedApiFetch.mockRejectedValue(makeApiError("Invalid credentials", 401));
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("Email"), "a@b.com");
    await user.type(screen.getByPlaceholderText("Password"), "pass");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  it("displays generic error for non-ApiError", async () => {
    const user = userEvent.setup();
    mockedApiFetch.mockRejectedValue(new Error("network error"));
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("Email"), "a@b.com");
    await user.type(screen.getByPlaceholderText("Password"), "pass");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });

  it("shows loading state during submission", async () => {
    const user = userEvent.setup();
    let resolveFetch!: (v: unknown) => void;
    mockedApiFetch.mockImplementation(() => new Promise((r) => { resolveFetch = r; }));
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("Email"), "a@b.com");
    await user.type(screen.getByPlaceholderText("Password"), "pass");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText("Logging in...")).toBeInTheDocument();
    });
    expect(screen.getByRole("button")).toBeDisabled();

    resolveFetch({ token: "t" });
    await waitFor(() => {
      expect(screen.getByText("Log in")).toBeInTheDocument();
    });
  });
});
