"use client";

import { useCallback, useEffect, useState } from "react";

export interface Presentation {
  /** True when the OS/browser requests reduced motion. */
  reducedMotion: boolean;
  fullscreen: boolean;
  /** Enter fullscreen on `el`, or exit if already fullscreen. */
  toggleFullscreen: (el: HTMLElement) => void;
  /** Fire a device vibration pattern where supported (no-op otherwise). */
  vibrate: (pattern: number[]) => void;
}

/** Device/UI presentation concerns: reduced-motion, fullscreen, vibration. */
export function usePresentation(): Presentation {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const handler = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const handler = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = useCallback((el: HTMLElement) => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  }, []);

  const vibrate = useCallback((pattern: number[]) => {
    if (typeof navigator.vibrate === "function") navigator.vibrate(pattern);
  }, []);

  return { reducedMotion, fullscreen, toggleFullscreen, vibrate };
}
