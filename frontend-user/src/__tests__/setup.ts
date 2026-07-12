import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import React, { useSyncExternalStore } from "react";

let _currentPathname = "/";
const _pathnameListeners = new Set<() => void>();

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

// Module-level mock state persists across tests within the same file unless
// reset — a leftover setPathname() from one test otherwise leaks into the
// next test's initial render, causing order-dependent flakiness.
afterEach(() => {
  _currentPathname = "/";
  _pathnameListeners.clear();
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
