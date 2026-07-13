import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { Howl } from "howler";
import { useSoundManager } from "../useSoundManager";

const MockedHowl = vi.mocked(Howl);

describe("useSoundManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("starts unmuted when nothing is persisted", () => {
    const { result } = renderHook(() => useSoundManager());
    expect(result.current.muted).toBe(false);
  });

  it("restores a persisted muted preference", () => {
    window.localStorage.setItem("gacha:muted", "true");
    const { result } = renderHook(() => useSoundManager());
    expect(result.current.muted).toBe(true);
  });

  it("creates a Howl once per sound and plays it", () => {
    const { result } = renderHook(() => useSoundManager());
    act(() => result.current.play("reward"));
    act(() => result.current.play("reward"));
    expect(MockedHowl).toHaveBeenCalledTimes(1);
    const instance = MockedHowl.mock.instances[0];
    expect(instance.play).toHaveBeenCalledTimes(2);
  });

  it("does not play while muted", () => {
    const { result } = renderHook(() => useSoundManager());
    act(() => result.current.toggleMute());
    act(() => result.current.play("reward"));
    expect(MockedHowl).not.toHaveBeenCalled();
  });

  it("persists and applies mute to existing sounds", () => {
    const { result } = renderHook(() => useSoundManager());
    act(() => result.current.play("reward"));
    act(() => result.current.toggleMute());
    expect(window.localStorage.getItem("gacha:muted")).toBe("true");
    const instance = MockedHowl.mock.instances[0];
    expect(instance.mute).toHaveBeenCalledWith(true);
    expect(result.current.muted).toBe(true);
  });

  it("unloads sounds on unmount", () => {
    const { result, unmount } = renderHook(() => useSoundManager());
    act(() => result.current.play("reward"));
    const instance = MockedHowl.mock.instances[0];
    unmount();
    expect(instance.unload).toHaveBeenCalled();
  });
});
