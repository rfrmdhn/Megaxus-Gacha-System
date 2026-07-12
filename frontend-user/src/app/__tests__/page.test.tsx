import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import Home from "../page";
import * as auth from "@/lib/auth";
import { mockReplace } from "../../__tests__/mocks";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  saveToken: vi.fn(),
  clearToken: vi.fn(),
  getToken: vi.fn(),
  decodeToken: vi.fn(),
}));

const mockedGetCurrentUser = vi.mocked(auth.getCurrentUser);

describe("Home page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects to /gacha when authenticated", async () => {
    mockedGetCurrentUser.mockReturnValue({
      sub: "1",
      email: "a@b.com",
      role: "user",
      iat: 1,
      exp: 9999999999,
    });
    render(<Home />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/gacha");
    });
  });

  it("redirects to /login when not authenticated", async () => {
    mockedGetCurrentUser.mockReturnValue(null);
    render(<Home />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("renders nothing", () => {
    mockedGetCurrentUser.mockReturnValue(null);
    const { container } = render(<Home />);
    expect(container.innerHTML).toBe("");
  });
});
