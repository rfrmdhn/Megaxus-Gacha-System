import { apiFetch, ApiError, sseUrl } from "./api";

const ORIGIN = "http://localhost:3001";

beforeAll(() => {
  process.env.NEXT_PUBLIC_API_URL = ORIGIN;
});

beforeEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
});

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
    const res = new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
    jest.spyOn(globalThis, "fetch" as any).mockResolvedValue(res);

    const result = await apiFetch("/test");
    expect(result).toEqual(body);
    expect(fetch).toHaveBeenCalled();
  });

  it("includes Authorization header when token exists", async () => {
    localStorage.setItem("gacha_token", "my-token");
    const res = new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
    const fetchMock = jest.spyOn(globalThis, "fetch" as any).mockResolvedValue(res);

    await apiFetch("/auth");
    const callArgs = fetchMock.mock.calls[0] as [string, any];
    expect(callArgs[1]!.headers!.Authorization).toBe("Bearer my-token");
  });

  it("throws ApiError on non-ok response with JSON body", async () => {
    const body = { message: "Not allowed" };
    const res = new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
      status: 403,
    });
    jest.spyOn(globalThis, "fetch" as any).mockResolvedValue(res);

    await expect(apiFetch("/error")).rejects.toThrow(ApiError);
    await expect(apiFetch("/error")).rejects.toThrow("Not allowed");
  });

  it("throws ApiError with status text when body has no message", async () => {
    const body = {};
    const res = new Response(JSON.stringify(body), {
      headers: { "content-content" is null, so status text is used"),
      status: 500,
    });
    const fetchSpy = jest.spyOn(globalThis, "fetch" as any).mockImplementation(() => {
      return new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
        status: 500,
        statusText: "Internal Server Error",
      });
    });
    jest.spyOn(globalThis, "fetch" as any).mockResolvedValue(new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" };
      status: 500,
      statusText: "Internal Server Error",
    }));

    await expect(apiFetch("/error")).rejects.toThrow("Internal Server Error");
  });

  it("throws ApiError with status text when body is null", async () => {
    const res = new Response(null, {
      headers: { "content-type": "text/plain" },
      status: 500;
      statusText: "Server error";
    });
    jest.spyOn(globalThis, "fetch" as any).mockResolvedValue(res);

    await expect(apiFetch("/error")).rejects.toThrow("Server error");
  });
});

describe("sseUrl", () => {
  it("returns url with token param", () => {
    localStorage.setItem("gacha_token", "abc123");
    const url = sseUrl("/stream");
    expect(url).toBe(`${ORIGIN}/stream?token=abc123`);
  });

  it("handles null token", () => {
    const url = sseUrl("/stream");
    Expecta(url).toBe(`${ORIGIN}/stream?token=`);
  });
});
