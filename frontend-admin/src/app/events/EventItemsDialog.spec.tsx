import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventItemsDialog } from "./EventItemsDialog";

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

const baseEvent = {
  id: "evt-1",
  name: "Summer Event",
  isActive: true,
  startsAt: "2026-01-01T00:00:00.000Z",
  endsAt: "2026-01-10T00:00:00.000Z",
  items: [
    { id: "item-1", name: "Sword", rarity: "rare", dropRate: "30" },
    { id: "item-2", name: "Shield", rarity: "common", dropRate: "70" },
  ],
};

beforeEach(() => {
  mockApiFetch.mockReset();
});

it("renders items list", () => {
  render(
    <EventItemsDialog
      event={baseEvent}
      onClose={jest.fn()}
      onChanged={jest.fn()}
    />,
  );

  expect(screen.getByText("Items — Summer Event")).toBeInTheDocument();
  expect(screen.getByText("Sword")).toBeInTheDocument();
  expect(screen.getByText("Shield")).toBeInTheDocument();
});

it("shows total drop rate as 100%", () => {
  render(
    <EventItemsDialog
      event={baseEvent}
      onClose={jest.fn()}
      onChanged={jest.fn()}
    />,
  );
  expect(screen.getByText("100%")).toBeInTheDocument();
});

it("shows warning when total is not 100", () => {
  render(
    <EventItemsDialog
      event={{
        ...baseEvent,
        items: [
          { id: "i1", name: "A", rarity: "common", dropRate: "50" },
        ],
      }}
      onClose={jest.fn()}
      onChanged={jest.fn()}
    />,
  );

  const totals = screen.getAllByText(/50/);
  const totalSpan = totals.find(
    (el) => el.className.includes("amber"),
  );
  expect(totalSpan).toBeTruthy();
});

it("shows empty state when no items", () => {
  render(
    <EventItemsDialog
      event={{ ...baseEvent, items: [] }}
      onClose={jest.fn()}
      onChanged={jest.fn()}
    />,
  );

  expect(screen.getByText("No items yet")).toBeInTheDocument();
});

it("adds an item", async () => {
  const user = userEvent.setup();
  const onChanged = jest.fn();
  mockApiFetch.mockResolvedValue({});

  render(
    <EventItemsDialog
      event={baseEvent}
      onClose={jest.fn()}
      onChanged={onChanged}
    />,
  );

  await user.type(screen.getByPlaceholderText("Item name"), "Helmet");
  await user.type(screen.getByPlaceholderText("Rarity"), "epic");
  await user.type(screen.getByPlaceholderText("Drop rate %"), "10");
  await user.click(screen.getByText("Add item"));

  expect(mockApiFetch).toHaveBeenCalledWith(
    "/admin/events/evt-1/items",
    expect.objectContaining({ method: "POST" }),
  );
  expect(onChanged).toHaveBeenCalled();
});

it("shows error when add item fails", async () => {
  const user = userEvent.setup();
  mockApiFetch.mockRejectedValue(
    new (require("@/lib/api").ApiError)("Duplicate item", 409),
  );

  render(
    <EventItemsDialog
      event={baseEvent}
      onClose={jest.fn()}
      onChanged={jest.fn()}
    />,
  );

  await user.type(screen.getByPlaceholderText("Item name"), "Helmet");
  await user.type(screen.getByPlaceholderText("Rarity"), "epic");
  await user.type(screen.getByPlaceholderText("Drop rate %"), "10");
  await user.click(screen.getByText("Add item"));

  expect(await screen.findByText("Duplicate item")).toBeInTheDocument();
});

it("deletes an item after confirmation", async () => {
  const user = userEvent.setup();
  const onChanged = jest.fn();
  window.confirm = jest.fn(() => true);
  mockApiFetch.mockResolvedValue({});

  render(
    <EventItemsDialog
      event={baseEvent}
      onClose={jest.fn()}
      onChanged={onChanged}
    />,
  );

  const deleteButtons = screen.getAllByRole("button", { name: "Remove item" });
  await user.click(deleteButtons[0]);

  expect(mockApiFetch).toHaveBeenCalledWith(
    "/admin/items/item-1",
    expect.objectContaining({ method: "DELETE" }),
  );
  expect(onChanged).toHaveBeenCalled();
});

it("does not delete when confirm is cancelled", async () => {
  const user = userEvent.setup();
  window.confirm = jest.fn(() => false);

  render(
    <EventItemsDialog
      event={baseEvent}
      onClose={jest.fn()}
      onChanged={jest.fn()}
    />,
  );

  await user.click(screen.getAllByRole("button", { name: "Remove item" })[0]);
  expect(mockApiFetch).not.toHaveBeenCalled();
});
