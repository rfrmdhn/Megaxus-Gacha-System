import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { EventImageField } from "./EventImageField";

const mockFetchEventImage = jest.fn();
jest.mock("../api", () => ({
  fetchEventImage: (...args: unknown[]) => mockFetchEventImage(...args),
}));

beforeEach(() => {
  mockFetchEventImage.mockReset();
  mockFetchEventImage.mockResolvedValue(new Blob(["x"], { type: "image/png" }));
  (URL as unknown as { createObjectURL: jest.Mock }).createObjectURL = jest.fn(() => "blob:mock");
  (URL as unknown as { revokeObjectURL: jest.Mock }).revokeObjectURL = jest.fn();
});

// Controlled wrapper mirroring how EventFormDialog owns the state.
function Harness({ eventId, imageKey }: { eventId: string | null; imageKey: string | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [removed, setRemoved] = useState(false);
  return (
    <EventImageField
      eventId={eventId}
      imageKey={imageKey}
      file={file}
      onFileChange={setFile}
      removed={removed}
      onRemovedChange={setRemoved}
    />
  );
}

describe("EventImageField", () => {
  it("shows a placeholder and no remove control when there is no image", () => {
    render(<Harness eventId={null} imageKey={null} />);
    expect(screen.getByText("No image")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose image" })).toBeInTheDocument();
    expect(screen.queryByText("Remove image")).not.toBeInTheDocument();
  });

  it("fetches and shows the existing banner with replace/remove controls", async () => {
    render(<Harness eventId="evt-1" imageKey="events/evt-1.png" />);

    await waitFor(() => expect(mockFetchEventImage).toHaveBeenCalledWith("evt-1"));
    await screen.findByRole("button", { name: "Replace image" });
    expect(screen.getByText("Remove image")).toBeInTheDocument();
  });

  it("marks the image removed and drops back to the placeholder", async () => {
    render(<Harness eventId="evt-1" imageKey="events/evt-1.png" />);
    const removeBtn = await screen.findByText("Remove image");

    fireEvent.click(removeBtn);

    expect(screen.getByText("No image")).toBeInTheDocument();
    expect(screen.queryByText("Remove image")).not.toBeInTheDocument();
  });

  it("previews a freshly picked file", () => {
    const { container } = render(<Harness eventId={null} imageKey={null} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["img"], "banner.png", { type: "image/png" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByRole("button", { name: "banner.png" })).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("src", "blob:mock");
  });
});
