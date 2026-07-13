import { renderHook } from "@testing-library/react";
import { getCurrentUser } from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  getCurrentUser: jest.fn(),
  clearToken: jest.fn(),
}));

const mockRouterPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

import { useRequireAdmin } from "./useRequireAdmin";

beforeEach(() => {
  mockRouterPush.mockReset();
  (getCurrentUser as jest.Mock).mockReset();
});

it("redirects to login when no user", () => {
  (getCurrentUser as jest.Mock).mockReturnValue(null);

  const { result } = renderHook(() => useRequireAdmin());

  expect(result.current).toEqual({ user: null, checking: true });
  expect(mockRouterPush).toHaveBeenCalledWith("/login");
});

it("redirects to login and clears token for non-admin users", async () => {
  const { clearToken } = require("@/lib/auth");
  (getCurrentUser as jest.Mock).mockReturnValue({ role: "user" });

  renderHook(() => useRequireAdmin());

  expect(clearToken).toHaveBeenCalled();
  expect(mockRouterPush).toHaveBeenCalledWith("/login");
});

it("returns user for admin users", () => {
  const fakeUser = { sub: "u1", email: "a@b.com", role: "admin", iat: 0, exp: Math.floor(Date.now() / 1000) + 3600 };
  (getCurrentUser as jest.Mock).mockReturnValue(fakeUser);

  const { result } = renderHook(() => useRequireAdmin());

  expect(result.current).toEqual({ user: fakeUser, checking: false });
  expect(mockRouterPush).not.toHaveBeenCalled();
});
