import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterPage from "../page";
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
  saveSession: vi.fn(),
  clearToken: vi.fn(),
  getToken: vi.fn(),
  getCurrentUser: vi.fn(),
  decodeToken: vi.fn(),
}));

const mockedApiFetch = vi.mocked(api.apiFetch);
const mockedSaveSession = vi.mocked(auth.saveSession);

function makeApiError(message: string, status: number) {
  return new api.ApiError(message, status);
}

describe("RegisterPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders registration form", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("heading", { name: "Create account" })).toBeInTheDocument();
    expect(screen.getByText("New accounts start with 500 coins.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password (min 8 characters)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /register/i })).toBeInTheDocument();
    expect(screen.getByText("Log in")).toBeInTheDocument();
  });

  it("submits registration and redirects on success", async () => {
    const user = userEvent.setup({ delay: null });
    mockedApiFetch.mockResolvedValue({ token: "jwt-token", refreshToken: "u1.secret" });
    render(<RegisterPage />);

    await user.type(screen.getByPlaceholderText("Email"), "new@example.com");
    await user.type(screen.getByPlaceholderText("Password (min 8 characters)"), "password123");
    await user.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", password: "password123" }),
      });
      expect(mockedSaveSession).toHaveBeenCalledWith({ token: "jwt-token", refreshToken: "u1.secret" });
      expect(mockPush).toHaveBeenCalledWith("/gacha");
    });
  });

  it("displays API error message", async () => {
    const user = userEvent.setup({ delay: null });
    mockedApiFetch.mockRejectedValue(makeApiError("Email already exists", 409));
    render(<RegisterPage />);

    await user.type(screen.getByPlaceholderText("Email"), "a@b.com");
    await user.type(screen.getByPlaceholderText("Password (min 8 characters)"), "password123");
    await user.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText("Email already exists")).toBeInTheDocument();
    });
  });

  it("displays generic error for non-ApiError", async () => {
    const user = userEvent.setup({ delay: null });
    mockedApiFetch.mockRejectedValue(new Error("network error"));
    render(<RegisterPage />);

    await user.type(screen.getByPlaceholderText("Email"), "a@b.com");
    await user.type(screen.getByPlaceholderText("Password (min 8 characters)"), "password123");
    await user.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });

  it("shows loading state during submission", async () => {
    const user = userEvent.setup({ delay: null });
    let resolveFetch!: (v: unknown) => void;
    mockedApiFetch.mockImplementation(() => new Promise((r) => { resolveFetch = r; }));
    render(<RegisterPage />);

    await user.type(screen.getByPlaceholderText("Email"), "a@b.com");
    await user.type(screen.getByPlaceholderText("Password (min 8 characters)"), "password123");
    await user.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText("Creating...")).toBeInTheDocument();
    });
    expect(screen.getByRole("button")).toBeDisabled();

    resolveFetch({ token: "t" });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /register/i })).toBeInTheDocument();
    });
  });
});
