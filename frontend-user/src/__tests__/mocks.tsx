import React from "react";
import { vi } from "vitest";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let currentPathname = "/";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => currentPathname,
}));

vi.mock("next/link", () => {
  return {
    default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
      <a href={href} {...props}>
        {children}
      </a>
    ),
  };
});

vi.mock("next/image", () => {
  return {
    default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => {
      const { priority: _priority, ...rest } = props;
      // eslint-disable-next-line @next/next/no-img-element
      return <img {...rest} />;
    },
  };
});

export { mockPush, mockReplace, currentPathname };

export function setPathname(path: string) {
  currentPathname = path;
}
