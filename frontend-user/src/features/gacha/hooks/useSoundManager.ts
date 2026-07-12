"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Howl } from "howler";

// Placeholder audio. Files are expected under public/sounds/ — see
// public/sounds/README.md. Missing files fail silently in Howler (async
// onloaderror), so the experience degrades gracefully with no audio.
const SOUND_MANIFEST = {
  "summon-start": "/sounds/summon-start.mp3",
  "portal-charge": "/sounds/portal-charge.mp3",
  "rare-reveal": "/sounds/rare-reveal.mp3",
  "legendary-reveal": "/sounds/legendary-reveal.mp3",
  reward: "/sounds/reward.mp3",
  "button-click": "/sounds/button-click.mp3",
} as const;

export type SoundName = keyof typeof SOUND_MANIFEST;

const MUTE_STORAGE_KEY = "gacha:muted";

export interface SoundManager {
  muted: boolean;
  toggleMute: () => void;
  play: (name: SoundName) => void;
}

export function useSoundManager(): SoundManager {
  const [muted, setMuted] = useState(false);
  // Howls are created lazily on first play and cached. Kept in a ref so
  // playing a sound never triggers a re-render.
  const howlsRef = useRef<Partial<Record<SoundName, Howl>>>({});

  // Restore the persisted mute preference on mount (client-only effect).
  useEffect(() => {
    setMuted(window.localStorage.getItem(MUTE_STORAGE_KEY) === "true");
  }, []);
  // Unload all cached sounds on unmount.
  useEffect(() => {
    const howls = howlsRef.current;
    return () => {
      Object.values(howls).forEach((howl) => howl?.unload());
    };
  }, []);

  const play = useCallback(
    (name: SoundName) => {
      if (muted) return;
      let howl = howlsRef.current[name];
      if (!howl) {
        howl = new Howl({ src: [SOUND_MANIFEST[name]], volume: 0.6, html5: true });
        howlsRef.current[name] = howl;
      }
      howl.play();
    },
    [muted],
  );

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      window.localStorage.setItem(MUTE_STORAGE_KEY, String(next));
      Object.values(howlsRef.current).forEach((howl) => howl?.mute(next));
      return next;
    });
  }, []);

  return { muted, toggleMute, play };
}
