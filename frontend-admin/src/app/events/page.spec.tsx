import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EventsPage from "./page";

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

jest.mock("@/lib/useRequireAdmin", () => ({
  useRequireAdmin: jest.fn(() => ({
    sub: "admin1",
    email: "admin@test.com",
    role: "admin",
    iat: 0,
    exp: 9999999999,
  })),
}));

const mockEvents = [
  {
    id: "evt-1",
    name: "Active Event",
    isActive: true,
    startsAt: "2026-06-01T00:00:00.000Z",
    endsAt: "2026-06-10T00:00:00.000Z",
    items: [
      { id: "i1", name: "Item A", rarity: "rare", dropRate: "60" },
      { id: "i2", name: "Item B", rarity: "common", dropRate: "40" },
    ],
  },
  {
    id: "evt-2",
    name: "Draft Event",
    isActive: false,
    startsAt: "2026-07-01T00:00:00.000Z",
    endsAt: "2026-07-10T00:00:00.000Z",
    items: [],
  },
];

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockResolvedValue(mockEvents);
});

it("renders loading state then events list", async () => {
  render(<EventsPage />);

  expect(screen.getByText(/Loading events/)).toBeInTheDocument();

  expect(await screen.findByText("Active Event")).toBeInTheDocument();
  expect(screen.getByText("Draft Event")).toBeInTheDocument();
});

it("shows error on fetch failure", async () => {
  mockApiFetch.mockRejectedValue(
    new (require("@/lib/api").ApiError)("Failed to load", 500),
  );

  render(<EventsPage />);

  expect(await screen.findByText("Failed to load")).toBeInTheDocument();
});

it("filters events by status", async () => {
  const user = userEvent.setup();
  render(<EventsPage />);

  await screen.findByText("Active Event");

  await user.selectOptions(screen.getByRole("combobox"), "active");
  expect(screen.getByText("Active Event")).toBeInTheDocument();
  expect(screen.queryByText("Draft Event")).not.toBeInTheDocument();
});

it("filters events by search", async () => {
  const user = userEvent.setup();
  render(<EventsPage />);

  await screen.findByText("Active Event");

  await user.type(screen.getByPlaceholderText("Search by name"), "Draft");
  expect(screen.queryByText("Active Event")).not.toBeInTheDocument();
  expect(screen.getByText("Draft Event")).toBeInTheDocument();
});

it("shows empty state when no events match", async () => {
  const user = userEvent.setup();
  render(<EventsPage />);

  await screen.findByText("Active Event");

  await user.type(screen.getByPlaceholderText("Search by name"), "XYZ");
  expect(screen.getByText("No events found.")).toBeInTheDocument();
});

it("opens create form dialog on button click", async () => {
  const user = userEvent.setup();
  render(<EventsPage />);

  await screen.findByText("Active Event");

  const newEventBtn = screen.getByRole("button", { name: /New event/ });
  await user.click(newEventBtn);

  expect(screen.getByRole("heading", { name: "New event" })).toBeInTheDocument();
});

it("toggles event active state", async () => {
  const user = userEvent.setup();
  mockApiFetch.mockResolvedValue(mockEvents);

  render(<EventsPage />);

  await screen.findByText("Active Event");

  const deactivateButtons = screen.getAllByRole("button", {
    name: "Deactivate",
  });
  await user.click(deactivateButtons[0]);

  expect(mockApiFetch).toHaveBeenCalledWith(
    "/admin/events/evt-1",
    expect.objectContaining({ method: "PUT" }),
  );
});

it("deletes event after confirmation", async () => {
  const user = userEvent.setup();
  window.confirm = jest.fn(() => true);

  render(<EventsPage />);

  await screen.findByText("Active Event");

  const deleteButtons = screen.getAllByRole("button", { name: "Delete event" });
  await user.click(deleteButtons[0]);

  expect(mockApiFetch).toHaveBeenCalledWith(
    "/admin/events/evt-1",
    expect.objectContaining({ method: "DELETE" }),
  );
});

it("shows error when toggle fails", async () => {
  const user = userEvent.setup();
  mockApiFetch.mockReset();
  const ApiError = require("@/lib/api").ApiError;
  let callCount = 0;
  mockApiFetch.mockImplementation(() => {
    callCount++;
    if (callCount === 1) return Promise.resolve(mockEvents);
    return Promise.reject(new ApiError("Update failed", 400));
  });

  render(<EventsPage />);

  await screen.findByText("Active Event");

  await user.click(screen.getAllByRole("button", { name: "Deactivate" })[0]);

  await screen.findByText("Update failed");
  expect(screen.getByText("Update failed")).toBeInTheDocument();
});
