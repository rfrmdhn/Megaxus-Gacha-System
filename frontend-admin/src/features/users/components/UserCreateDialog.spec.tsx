import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserCreateDialog } from "./UserCreateDialog";

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

beforeEach(() => {
  mockApiFetch.mockReset();
});

it("renders the create form", () => {
  render(<UserCreateDialog onClose={jest.fn()} onCreated={jest.fn()} />);

  expect(screen.getByRole("heading", { name: "New user" })).toBeInTheDocument();
});

it("calls apiFetch POST with the entered fields and closes on success", async () => {
  const user = userEvent.setup();
  const onCreated = jest.fn();
  const onClose = jest.fn();
  mockApiFetch.mockResolvedValue({});

  render(<UserCreateDialog onClose={onClose} onCreated={onCreated} />);

  const [emailInput, passwordInput] = screen.getAllByDisplayValue("");
  await user.type(emailInput, "new@test.com");
  await user.type(passwordInput, "password123");
  await user.click(screen.getByText("Create"));

  expect(mockApiFetch).toHaveBeenCalledWith(
    "/admin/users",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ email: "new@test.com", password: "password123", role: "user", coins: 500 }),
    }),
  );
  expect(onCreated).toHaveBeenCalled();
  expect(onClose).toHaveBeenCalled();
});

it("shows error on failure", async () => {
  const user = userEvent.setup();
  mockApiFetch.mockRejectedValue(new (require("@/lib/api").ApiError)("Email is already registered", 409));

  render(<UserCreateDialog onClose={jest.fn()} onCreated={jest.fn()} />);

  const [emailInput, passwordInput] = screen.getAllByDisplayValue("");
  await user.type(emailInput, "existing@test.com");
  await user.type(passwordInput, "password123");
  await user.click(screen.getByText("Create"));

  expect(await screen.findByText("Email is already registered")).toBeInTheDocument();
});
