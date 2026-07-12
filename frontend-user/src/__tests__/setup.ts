import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import React, { useSyncExternalStore } from "react";

let _currentPathname = "/";
const _pathnameListeners = new Set<() => void>();

let _currentSearchParams = new URLSearchParams();
const _searchParamsListeners = new Set<() => void>();

export const mockPush = vi.fn();
export const mockReplace = vi.fn();

// Stable across renders, like the real next/navigation router object —
// components that depend on `router` in a useEffect deps array rely on
// this identity staying constant between renders.
const mockRouter = {
  push: mockPush,
  replace: mockReplace,
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
};

export function setPathname(path: string) {
  _currentPathname = path;
  _pathnameListeners.forEach((listener) => listener());
}

export function getPathname() {
  return _currentPathname;
}

export function setSearchParams(params: string | Record<string, string>) {
  _currentSearchParams = new URLSearchParams(params);
  _searchParamsListeners.forEach((listener) => listener());
}

// Module-level mock state persists across tests within the same file unless
// reset — a leftover setPathname()/setSearchParams() from one test otherwise
// leaks into the next test's initial render, causing order-dependent flakiness.
afterEach(() => {
  _currentPathname = "/";
  _pathnameListeners.clear();
  _currentSearchParams = new URLSearchParams();
  _searchParamsListeners.clear();
});

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  // Reactive like the real usePathname: subscribes to changes so components
  // re-render when setPathname() is called from a test, instead of only
  // reading a stale value captured at first render.
  usePathname: () =>
    useSyncExternalStore(
      (listener) => {
        _pathnameListeners.add(listener);
        return () => _pathnameListeners.delete(listener);
      },
      () => _currentPathname,
      () => _currentPathname,
    ),
  useSearchParams: () =>
    useSyncExternalStore(
      (listener) => {
        _searchParamsListeners.add(listener);
        return () => _searchParamsListeners.delete(listener);
      },
      () => _currentSearchParams,
      () => _currentSearchParams,
    ),
}));

vi.mock("next/link", () => ({
  default: (props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement("a", { href: props.href, ...Object.fromEntries(Object.entries(props).filter(([k]) => k !== "children" && k !== "href")) }, props.children),
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => {
    const { priority: _priority, ...rest } = props;
    return React.createElement("img", rest);
  },
}));

// --- Animation / audio / device mocks for the gacha summoning experience ---

// motion/react: render each motion.<tag> as its underlying DOM element,
// stripping animation-only props so React doesn't warn. Animation timing is
// asserted through hooks, not these components, so no timers are simulated.
const MOTION_ONLY_PROPS = new Set([
  "initial",
  "animate",
  "exit",
  "transition",
  "variants",
  "whileHover",
  "whileTap",
  "whileInView",
  "whileFocus",
  "whileDrag",
  "drag",
  "dragConstraints",
  "layout",
  "layoutId",
  "custom",
  "onAnimationComplete",
  "onAnimationStart",
  "onUpdate",
  "viewport",
]);

vi.mock("motion/react", async () => {
  const ReactModule = await import("react");
  const createMotionComponent = (tag: string) =>
    ReactModule.forwardRef((props: Record<string, unknown>, ref: unknown) => {
      const filtered: Record<string, unknown> = { ref };
      for (const key in props) {
        if (key === "children" || MOTION_ONLY_PROPS.has(key)) continue;
        filtered[key] = props[key];
      }
      return ReactModule.createElement(tag, filtered, props.children as React.ReactNode);
    });
  const cache: Record<string, unknown> = {};
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        if (!cache[tag]) cache[tag] = createMotionComponent(tag);
        return cache[tag];
      },
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(ReactModule.Fragment, null, children),
    useReducedMotion: () => false,
  };
});

// howler: no-op Howl so no audio is touched in jsdom. A vi.fn constructor so
// tests can inspect .mock.instances and each instance's spies.
vi.mock("howler", () => ({
  Howl: vi.fn(function (this: { play: unknown; mute: unknown; unload: unknown }) {
    this.play = vi.fn();
    this.mute = vi.fn();
    this.unload = vi.fn();
  }),
}));

// matchMedia default (reduced-motion off). Tests that need change events
// override window.matchMedia locally.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// Device APIs used by usePresentation — present by default; tests can delete
// navigator.vibrate to exercise the unsupported branch.
Object.defineProperty(navigator, "vibrate", { value: vi.fn(), writable: true, configurable: true });
HTMLElement.prototype.requestFullscreen = vi.fn().mockResolvedValue(undefined);
document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
