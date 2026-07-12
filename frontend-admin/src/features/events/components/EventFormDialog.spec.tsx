import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventFormDialog } from "./EventFormDialog";
import { AdminEvent } from "../types";

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

function makeEvent(overrides: Partial<AdminEvent> = {}): AdminEvent {
  return {
    id: "evt-1",
    name: "Test Event",
    isActive: false,
    startsAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2026-01-10T00:00:00.000Z",
    items: [],
    ...overrides,
  };
}

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe("EventFormDialog - create", () => {
  it("renders form for new event", () => {
    render(
      <EventFormDialog event={null} onClose={jest.fn()} onSaved={jest.fn()} />,
    );

    expect(screen.getByText("New event")).toBeInTheDocument();
  });

  it("calls apiFetch POST and onSaved", async () => {
    const user = userEvent.setup();
    const onSaved = jest.fn();
    const onClose = jest.fn();
    mockApiFetch.mockResolvedValue({});

    render(
      <EventFormDialog event={null} onClose={onClose} onSaved={onSaved} />,
    );

    const inputs = screen.getAllByDisplayValue("");
    await user.type(inputs[0], "New Event");
    await user.type(inputs[1], "2026-01-01T10:00");
    await user.type(inputs[2], "2026-01-02T10:00");
    await user.click(screen.getByText("Save"));

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/admin/events",
      expect.objectContaining({ method: "POST" }),
    );
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows error on failure", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockRejectedValue(
      new (require("@/lib/api").ApiError)("Name required", 400),
    );

    render(
      <EventFormDialog event={null} onClose={jest.fn()} onSaved={jest.fn()} />,
    );

    const inputs = screen.getAllByDisplayValue("");
    await user.type(inputs[0], "Event");
    await user.type(inputs[1], "2026-01-01T10:00");
    await user.type(inputs[2], "2026-01-02T10:00");
    await user.click(screen.getByText("Save"));

    expect(await screen.findByText("Name required")).toBeInTheDocument();
  });
});

describe("EventFormDialog - edit", () => {
  it("renders form with existing event values", () => {
    const event = makeEvent({ name: "Existing Event" });
    render(
      <EventFormDialog event={event} onClose={jest.fn()} onSaved={jest.fn()} />,
    );

    expect(screen.getByText("Edit event")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Existing Event")).toBeInTheDocument();
  });

  it("calls apiFetch PUT on save", async () => {
    const user = userEvent.setup();
    const onSaved = jest.fn();
    const onClose = jest.fn();
    const event = makeEvent({ name: "Old" });
    mockApiFetch.mockResolvedValue({});

    render(
      <EventFormDialog event={event} onClose={onClose} onSaved={onSaved} />,
    );

    const nameInput = screen.getByDisplayValue("Old");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated");
    await user.click(screen.getByText("Save"));

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/admin/events/evt-1",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(onSaved).toHaveBeenCalled();
  });
});
