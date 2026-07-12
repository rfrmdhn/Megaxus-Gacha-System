import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventItemsDialog } from "./EventItemsDialog";

const mockApiFetch = jest.fn();
const mockApiFetchBlob = jest.fn();
jest.mock("@/lib/api", () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
  apiFetchBlob: (...args: any[]) => mockApiFetchBlob(...args),
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
    { id: "item-1", name: "Sword", rarity: "rare", dropRate: "30", imageKey: null },
    { id: "item-2", name: "Shield", rarity: "common", dropRate: "70", imageKey: "items/item-2-1.png" },
  ],
};

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetchBlob.mockReset();
  mockApiFetchBlob.mockResolvedValue(new Blob(["x"], { type: "image/png" }));
  (URL as any).createObjectURL = jest.fn(() => "blob:mock-url");
  (URL as any).revokeObjectURL = jest.fn();
});

it("renders items list", () => {
  render(<EventItemsDialog event={baseEvent} onClose={jest.fn()} onChanged={jest.fn()} />);

  expect(screen.getByText("Items — Summer Event")).toBeInTheDocument();
  expect(screen.getByText("Sword")).toBeInTheDocument();
  expect(screen.getByText("Shield")).toBeInTheDocument();
});

it("shows total drop rate as 100%", () => {
  render(<EventItemsDialog event={baseEvent} onClose={jest.fn()} onChanged={jest.fn()} />);
  expect(screen.getByText("100%")).toBeInTheDocument();
});

it("shows warning when total is not 100", () => {
  render(
    <EventItemsDialog
      event={{
        ...baseEvent,
        items: [{ id: "i1", name: "A", rarity: "common", dropRate: "50", imageKey: null }],
      }}
      onClose={jest.fn()}
      onChanged={jest.fn()}
    />,
  );

  const totals = screen.getAllByText(/50/);
  const totalSpan = totals.find((el) => el.className.includes("amber"));
  expect(totalSpan).toBeTruthy();
});

it("shows empty state when no items", () => {
  render(<EventItemsDialog event={{ ...baseEvent, items: [] }} onClose={jest.fn()} onChanged={jest.fn()} />);

  expect(screen.getByText("No items yet")).toBeInTheDocument();
});

it("renders a placeholder thumbnail when the item has no image", () => {
  render(<EventItemsDialog event={baseEvent} onClose={jest.fn()} onChanged={jest.fn()} />);

  expect(mockApiFetchBlob).not.toHaveBeenCalledWith("/admin/items/item-1/image");
});

it("fetches and renders the thumbnail when the item has an image", async () => {
  render(<EventItemsDialog event={baseEvent} onClose={jest.fn()} onChanged={jest.fn()} />);

  await waitFor(() => expect(mockApiFetchBlob).toHaveBeenCalledWith("/admin/items/item-2/image"));
  expect(await screen.findByAltText("")).toHaveAttribute("src", "blob:mock-url");
});

it("ignores the fetched image if unmounted before it resolves", async () => {
  let resolveBlob: (blob: Blob) => void;
  mockApiFetchBlob.mockReturnValue(new Promise<Blob>((resolve) => (resolveBlob = resolve)));

  const { unmount } = render(<EventItemsDialog event={baseEvent} onClose={jest.fn()} onChanged={jest.fn()} />);
  await waitFor(() => expect(mockApiFetchBlob).toHaveBeenCalledWith("/admin/items/item-2/image"));
  unmount();
  resolveBlob!(new Blob(["x"], { type: "image/png" }));

  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

it("adds an item", async () => {
  const user = userEvent.setup();
  const onChanged = jest.fn();
  mockApiFetch.mockResolvedValue({ id: "new-item" });

  render(<EventItemsDialog event={baseEvent} onClose={jest.fn()} onChanged={onChanged} />);

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

it("uploads an image for a newly added item when a file is selected", async () => {
  const user = userEvent.setup();
  const onChanged = jest.fn();
  mockApiFetch.mockResolvedValue({ id: "new-item" });
  const file = new File(["bytes"], "helmet.png", { type: "image/png" });

  render(<EventItemsDialog event={baseEvent} onClose={jest.fn()} onChanged={onChanged} />);

  await user.type(screen.getByPlaceholderText("Item name"), "Helmet");
  await user.type(screen.getByPlaceholderText("Rarity"), "epic");
  await user.type(screen.getByPlaceholderText("Drop rate %"), "10");
  const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
  await user.upload(fileInputs[0], file);
  await user.click(screen.getByText("Add item"));

  await waitFor(() =>
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/admin/items/new-item/image",
      expect.objectContaining({ method: "POST" }),
    ),
  );
  expect(onChanged).toHaveBeenCalled();
});

it("shows error when add item fails", async () => {
  const user = userEvent.setup();
  mockApiFetch.mockRejectedValue(new (require("@/lib/api").ApiError)("Duplicate item", 409));

  render(<EventItemsDialog event={baseEvent} onClose={jest.fn()} onChanged={jest.fn()} />);

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

  render(<EventItemsDialog event={baseEvent} onClose={jest.fn()} onChanged={onChanged} />);

  const deleteButtons = screen.getAllByRole("button", { name: "Remove item" });
  await user.click(deleteButtons[0]);

  expect(mockApiFetch).toHaveBeenCalledWith("/admin/items/item-1", expect.objectContaining({ method: "DELETE" }));
  expect(onChanged).toHaveBeenCalled();
});

it("does not delete when confirm is cancelled", async () => {
  const user = userEvent.setup();
  window.confirm = jest.fn(() => false);

  render(<EventItemsDialog event={baseEvent} onClose={jest.fn()} onChanged={jest.fn()} />);

  await user.click(screen.getAllByRole("button", { name: "Remove item" })[0]);
  expect(mockApiFetch).not.toHaveBeenCalled();
});

it("shows error when delete item fails", async () => {
  const user = userEvent.setup();
  window.confirm = jest.fn(() => true);
  mockApiFetch.mockRejectedValue(new (require("@/lib/api").ApiError)("Cannot delete item", 400));

  render(<EventItemsDialog event={baseEvent} onClose={jest.fn()} onChanged={jest.fn()} />);

  await user.click(screen.getAllByRole("button", { name: "Remove item" })[0]);

  expect(await screen.findByText("Cannot delete item")).toBeInTheDocument();
});

describe("editing an item", () => {
  it("opens and cancels the edit form", async () => {
    const user = userEvent.setup();
    render(<EventItemsDialog event={baseEvent} onClose={jest.fn()} onChanged={jest.fn()} />);

    await user.click(screen.getAllByRole("button", { name: "Edit item" })[0]);
    expect(screen.getByText("Save")).toBeInTheDocument();

    await user.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
  });

  it("saves name/rarity/dropRate changes", async () => {
    const user = userEvent.setup();
    const onChanged = jest.fn();
    mockApiFetch.mockResolvedValue({});

    render(<EventItemsDialog event={baseEvent} onClose={jest.fn()} onChanged={onChanged} />);

    await user.click(screen.getAllByRole("button", { name: "Edit item" })[0]);
    const nameInput = screen.getByDisplayValue("Sword");
    await user.clear(nameInput);
    await user.type(nameInput, "Great Sword");
    const rarityInput = screen.getByDisplayValue("rare");
    await user.clear(rarityInput);
    await user.type(rarityInput, "epic");
    const dropRateInput = screen.getByDisplayValue("30");
    await user.clear(dropRateInput);
    await user.type(dropRateInput, "40");
    await user.click(screen.getByText("Save"));

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/admin/items/item-1",
        expect.objectContaining({ method: "PUT" }),
      ),
    );
    expect(onChanged).toHaveBeenCalled();
  });

  it("uploads a replacement image when saving", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue({});
    const file = new File(["bytes"], "sword.png", { type: "image/png" });

    render(<EventItemsDialog event={baseEvent} onClose={jest.fn()} onChanged={jest.fn()} />);

    await user.click(screen.getAllByRole("button", { name: "Edit item" })[0]);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);
    await user.click(screen.getByText("Save"));

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/admin/items/item-1/image",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("shows an error when saving fails", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockRejectedValue(new (require("@/lib/api").ApiError)("Invalid drop rate", 400));

    render(<EventItemsDialog event={baseEvent} onClose={jest.fn()} onChanged={jest.fn()} />);

    await user.click(screen.getAllByRole("button", { name: "Edit item" })[0]);
    await user.click(screen.getByText("Save"));

    expect(await screen.findByText("Invalid drop rate")).toBeInTheDocument();
  });

  it("removes the existing image via the remove-image button", async () => {
    const user = userEvent.setup();
    const onChanged = jest.fn();
    mockApiFetch.mockResolvedValue({});

    render(<EventItemsDialog event={baseEvent} onClose={jest.fn()} onChanged={onChanged} />);

    await user.click(screen.getAllByRole("button", { name: "Edit item" })[1]);
    await user.click(screen.getByText("Remove image"));

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/admin/items/item-2/image",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
    expect(onChanged).toHaveBeenCalled();
  });

  it("shows an error when removing the image fails", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockRejectedValue(new (require("@/lib/api").ApiError)("Cannot remove image", 400));

    render(<EventItemsDialog event={baseEvent} onClose={jest.fn()} onChanged={jest.fn()} />);

    await user.click(screen.getAllByRole("button", { name: "Edit item" })[1]);
    await user.click(screen.getByText("Remove image"));

    expect(await screen.findByText("Cannot remove image")).toBeInTheDocument();
  });

  it("does not show a remove-image button when the item has no image", async () => {
    const user = userEvent.setup();
    render(<EventItemsDialog event={baseEvent} onClose={jest.fn()} onChanged={jest.fn()} />);

    await user.click(screen.getAllByRole("button", { name: "Edit item" })[0]);
    expect(screen.queryByText("Remove image")).not.toBeInTheDocument();
  });
});
