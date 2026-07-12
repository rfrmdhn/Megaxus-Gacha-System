import { apiFetch, apiFetchBlob, ApiError, sseUrl } from "./api";

const ORIGIN = "http://localhost:3001";

beforeAll(() => {
  process.env.NEXT_PUBLIC_API_URL = ORIGIN;
});

beforeEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
});

function mockResponse(body: any, status: number, statusText?: string) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
    statusText,
  });
}

describe("ApiError", () => {
  it("stores message and status", () => {
    const err = new ApiError("Something went wrong", 400);
    expect(err.message).toBe("Something went wrong");
    expect(err.status).toBe(400);
    expect(err).toBeInstanceOf(Error);
  });
});

describe("apiFetch", () => {
  it("performs a GET request and returns parsed body", async () => {
    const body = { hello: "world" };
    jest.spyOn(globalThis, "fetch" as any).mockResolvedValue(mockResponse(body, 200));

    const result = await apiFetch("/test");
    expect(result).toEqual(body);
    expect(fetch).toHaveBeenCalled();
  });

  it("includes Authorization header when token exists", async () => {
    localStorage.setItem("gacha_token", "my-token");
    const fetchMock = jest.spyOn(globalThis, "fetch" as any).mockResolvedValue(mockResponse({ ok: true }, 200));

    await apiFetch("/auth");
    const callArgs = fetchMock.mock.calls[0] as [string, any];
    expect(callArgs[1].headers.Authorization).toBe("Bearer my-token");
  });

  it("passes through custom content-type", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch" as any).mockResolvedValue(mockResponse({ ok: true }, 200));

    await apiFetch("/upload", {
      headers: { "content-type": "text/plain" },
    });
    const callArgs = fetchMock.mock.calls[0] as [string, any];
    expect(callArgs[1].headers["content-type"]).toBe("text/plain");
  });

  it("throws ApiError on non-ok with message from body", async () => {
    jest.spyOn(globalThis, "fetch" as any).mockResolvedValue(mockResponse({ message: "Not allowed" }, 403));

    try {
      await apiFetch("/error");
      fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).message).toBe("Not allowed");
    }
  });

  it("throws ApiError with message array formatted", async () => {
    jest.spyOn(globalThis, "fetch" as any).mockResolvedValue(
      mockResponse({ message: ["Invalid field 1", "Invalid field 2"] }, 400),
    );

    await expect(apiFetch("/error")).rejects.toThrow("Invalid field 1, Invalid field 2");
  });

  it("throws ApiError with status text when body has no message", async () => {
    jest.spyOn(globalThis, "fetch" as any).mockResolvedValue(
      mockResponse({ other: true }, 500, "Server Error"),
    );

    await expect(apiFetch("/error")).rejects.toThrow("Server Error");
  });

  it("throws ApiError with status text when body is null", async () => {
    jest.spyOn(globalThis, "fetch" as any).mockResolvedValue(
      new Response(null, {
        headers: { "content-type": "text/plain" },
        status: 500,
        statusText: "Server Error",
      }),
    );

    await expect(apiFetch("/error")).rejects.toThrow("Server Error");
  });

  it("omits Content-Type when the body is FormData", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch" as any).mockResolvedValue(mockResponse({ ok: true }, 200));

    await apiFetch("/upload", { method: "POST", body: new FormData() });
    const callArgs = fetchMock.mock.calls[0] as [string, any];
    expect(callArgs[1].headers["Content-Type"]).toBeUndefined();
  });
});

describe("apiFetchBlob", () => {
  it("returns the response body as a blob with an Authorization header", async () => {
    localStorage.setItem("gacha_token", "my-token");
    const blob = new Blob(["image-bytes"], { type: "image/png" });
    const fetchMock = jest
      .spyOn(globalThis, "fetch" as any)
      .mockResolvedValue(new Response(blob, { status: 200 }));

    const result = await apiFetchBlob("/admin/items/item-1/image");

    const callArgs = fetchMock.mock.calls[0] as [string, any];
    expect(callArgs[0]).toBe(`${ORIGIN}/admin/items/item-1/image`);
    expect(callArgs[1].headers.Authorization).toBe("Bearer my-token");
    expect(result).toBeInstanceOf(Blob);
  });

  it("throws ApiError on non-ok response", async () => {
    jest
      .spyOn(globalThis, "fetch" as any)
      .mockResolvedValue(new Response(null, { status: 404, statusText: "Not Found" }));

    await expect(apiFetchBlob("/missing")).rejects.toThrow("Not Found");
  });
});

describe("sseUrl", () => {
  it("returns url with token param", () => {
    localStorage.setItem("gacha_token", "abc123");
    expect(sseUrl("/stream")).toBe(`${ORIGIN}/api/stream?token=abc123`);
  });

  it("handles null token", () => {
    expect(sseUrl("/stream")).toBe(`${ORIGIN}/api/stream?token=`);
  });
});
