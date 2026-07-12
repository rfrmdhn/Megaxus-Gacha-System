import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UsersPage from "./page";

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

const mockAdminUser = { sub: "admin1", email: "admin@test.com", role: "admin", iat: 0, exp: 9999999999 };
jest.mock("@/lib/useRequireAdmin", () => ({
  useRequireAdmin: jest.fn(() => ({ user: mockAdminUser, checking: false })),
}));

const mockUsers = [
  {
    id: "u1",
    email: "player@test.com",
    role: "user",
    coins: 500,
    isBanned: false,
    pullCount: 3,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "u2",
    email: "admin@test.com",
    role: "admin",
    coins: 1000,
    isBanned: false,
    pullCount: 0,
    createdAt: "2026-01-02T00:00:00.000Z",
  },
];

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockResolvedValue({ items: mockUsers, nextCursor: null });
});

it("renders loading state then users list", async () => {
  render(<UsersPage />);

  expect(screen.getByText(/Loading users/)).toBeInTheDocument();

  expect(await screen.findByText("player@test.com")).toBeInTheDocument();
  expect(screen.getByText("admin@test.com")).toBeInTheDocument();
});

it("shows error on fetch failure", async () => {
  mockApiFetch.mockRejectedValue(new (require("@/lib/api").ApiError)("Failed to load", 500));

  render(<UsersPage />);

  expect(await screen.findByText("Failed to load")).toBeInTheDocument();
});

it("filters users by role", async () => {
  const user = userEvent.setup();
  render(<UsersPage />);

  await screen.findByText("player@test.com");

  await user.selectOptions(screen.getByRole("combobox"), "admin");
  expect(screen.queryByText("player@test.com")).not.toBeInTheDocument();
  expect(screen.getByText("admin@test.com")).toBeInTheDocument();
});

it("shows empty state when no users match the search", async () => {
  const user = userEvent.setup();
  mockApiFetch.mockImplementation((path: string) =>
    Promise.resolve(
      path.includes("email=nobody")
        ? { items: [], nextCursor: null }
        : { items: mockUsers, nextCursor: null },
    ),
  );

  render(<UsersPage />);

  await screen.findByText("player@test.com");

  await user.type(screen.getByPlaceholderText("Search by email"), "nobody");
  expect(await screen.findByText("No users found.")).toBeInTheDocument();
});

it("opens create dialog on button click", async () => {
  const user = userEvent.setup();
  render(<UsersPage />);

  await screen.findByText("player@test.com");

  await user.click(screen.getByRole("button", { name: /New user/ }));

  expect(screen.getByRole("heading", { name: "New user" })).toBeInTheDocument();
});

it("bans a user after confirmation", async () => {
  const user = userEvent.setup();
  window.confirm = jest.fn(() => true);

  render(<UsersPage />);

  await screen.findByText("player@test.com");

  const banButtons = screen.getAllByRole("button", { name: "Ban" });
  await user.click(banButtons[0]);

  expect(mockApiFetch).toHaveBeenCalledWith(
    "/admin/users/u1",
    expect.objectContaining({ method: "PUT", body: JSON.stringify({ isBanned: true }) }),
  );
});
