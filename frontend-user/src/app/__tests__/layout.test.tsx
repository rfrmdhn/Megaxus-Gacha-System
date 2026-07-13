import { describe, it, expect, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

vi.mock("@/components/organisms/NavBar", () => ({ default: () => null }));

import RootLayout, { metadata } from "../layout";

describe("RootLayout", () => {
  it("exposes page metadata", () => {
    expect(metadata.title).toBe("Gacha Event System");
  });

  it("builds the document shell around its children", () => {
    const element = RootLayout({ children: null });
    expect(element).toBeTruthy();
  });
});
