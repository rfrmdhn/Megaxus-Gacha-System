import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePresentation } from "../usePresentation";

type ChangeHandler = (e: MediaQueryListEvent) => void;

function mockMatchMedia(matches: boolean) {
  const handlers: ChangeHandler[] = [];
  const mql = {
    matches,
    media: "",
    onchange: null,
    addEventListener: (_: string, h: ChangeHandler) => handlers.push(h),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
  window.matchMedia = vi.fn().mockReturnValue(mql);
  return { fire: (m: boolean) => handlers.forEach((h) => h({ matches: m } as MediaQueryListEvent)) };
}

describe("usePresentation", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    Object.defineProperty(document, "fullscreenElement", {
      value: null,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.clearAllMocks();
  });

  it("reads the initial reduced-motion preference", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => usePresentation());
    expect(result.current.reducedMotion).toBe(true);
  });

  it("reacts to reduced-motion changes", () => {
    const { fire } = mockMatchMedia(false);
    const { result } = renderHook(() => usePresentation());
    expect(result.current.reducedMotion).toBe(false);
    act(() => fire(true));
    expect(result.current.reducedMotion).toBe(true);
  });

  it("enters fullscreen when not already fullscreen", () => {
    mockMatchMedia(false);
    const el = document.createElement("div");
    const request = vi.spyOn(el, "requestFullscreen");
    const { result } = renderHook(() => usePresentation());
    act(() => result.current.toggleFullscreen(el));
    expect(request).toHaveBeenCalled();
  });

  it("exits fullscreen when already fullscreen", () => {
    mockMatchMedia(false);
    (document as unknown as { fullscreenElement: Element | null }).fullscreenElement =
      document.createElement("div");
    const exit = vi.spyOn(document, "exitFullscreen");
    const { result } = renderHook(() => usePresentation());
    act(() => result.current.toggleFullscreen(document.createElement("div")));
    expect(exit).toHaveBeenCalled();
  });

  it("tracks fullscreenchange events", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => usePresentation());
    (document as unknown as { fullscreenElement: Element | null }).fullscreenElement =
      document.createElement("div");
    act(() => document.dispatchEvent(new Event("fullscreenchange")));
    expect(result.current.fullscreen).toBe(true);
  });

  it("vibrates when supported", () => {
    mockMatchMedia(false);
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: vibrate, writable: true, configurable: true });
    const { result } = renderHook(() => usePresentation());
    act(() => result.current.vibrate([10, 20]));
    expect(vibrate).toHaveBeenCalledWith([10, 20]);
  });

  it("is a no-op when vibration is unsupported", () => {
    mockMatchMedia(false);
    Object.defineProperty(navigator, "vibrate", { value: undefined, writable: true, configurable: true });
    const { result } = renderHook(() => usePresentation());
    expect(() => act(() => result.current.vibrate([10]))).not.toThrow();
  });
});
