"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { Profile } from "@/features/profile/types";
import { getProfile } from "@/features/profile/api";
import { GachaEvent, EventItem, PullResult, MultiPullResult } from "../types";
import { listEvents, getEvent, pull as pullApi, pullMany } from "../api";
import { highestRarity, normalizeRarity } from "../lib/rarity";
import { useSoundManager } from "./useSoundManager";
import { usePresentation } from "./usePresentation";

/** Retained for the skip path and existing tests. */
export const PULL_REVEAL_ANIMATION_MS = 700;
export const PULL_COST = 10;
export const MULTI_PULL_COUNT = 10;
const AUTO_SUMMON_DELAY_MS = 600;

// What is currently being revealed. `replay` reveals commit nothing (coins and
// results were already applied on the original pull).
type PendingReveal =
  | { type: "single"; result: PullResult; replay?: boolean }
  | { type: "multi"; data: MultiPullResult; replay?: boolean };

function headlineOf(data: MultiPullResult): PullResult {
  const best = highestRarity(data.results.map((r) => r.item.rarity));
  // `best` is derived from this set, so a match always exists (results is
  // non-empty for any successful multi-pull).
  return data.results.find((r) => normalizeRarity(r.item.rarity) === best)!;
}

export function useGacha(initialEventId?: string | null) {
  const router = useRouter();
  const { checking } = useRequireAuth();
  const sound = useSoundManager();
  const presentation = usePresentation();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<GachaEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [items, setItems] = useState<EventItem[]>([]);
  const [pulling, setPulling] = useState(false);
  const [skipAnimation, setSkipAnimation] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [auto, setAuto] = useState(false);

  const [pending, setPending] = useState<PendingReveal | null>(null);
  const [result, setResult] = useState<PullResult | null>(null);
  const [multiResult, setMultiResult] = useState<MultiPullResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The last headline pull kept for Replay (does not re-hit the API).
  const lastRevealRef = useRef<PendingReveal | null>(null);

  useEffect(() => {
    if (checking) return;
    void refreshProfile();
    void loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking]);

  useEffect(() => {
    if (!selectedEventId) return;
    getEvent(selectedEventId)
      .then((event) => setItems(event.items))
      .catch(() => setItems([]));
  }, [selectedEventId]);

  // Auto-summon loop: keep pulling (immediately, no per-pull cinematic) until
  // stopped, out of coins, or an error occurs.
  useEffect(() => {
    if (!auto || pulling || pending) return;
    if (!selectedEventId || !profile) return;
    if (profile.coins < PULL_COST) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuto(false);
      return;
    }
    const id = window.setTimeout(() => void pull(), AUTO_SUMMON_DELAY_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, pulling, pending, profile, selectedEventId]);

  async function refreshProfile() {
    try {
      setProfile(await getProfile());
    } catch {
      router.push("/login");
    }
  }

  async function loadEvents() {
    try {
      const list = await listEvents();
      setEvents(list);
      const initialMatch = initialEventId && list.some((e) => e.id === initialEventId);
      if (initialMatch) setSelectedEventId(initialEventId!);
      else if (list.length > 0) setSelectedEventId(list[0].id);
    } catch {
      setEvents([]);
    }
  }

  function setCoins(remainingCoins: number) {
    setProfile((p) => (p ? { ...p, coins: remainingCoins } : p));
  }

  function beginPull() {
    setPulling(true);
    setError(null);
    setResult(null);
    setMultiResult(null);
    sound.play("summon-start");
  }

  /** True when reveals should be skipped and results applied instantly. */
  function isImmediate() {
    return skipAnimation || presentation.reducedMotion || auto;
  }

  async function pull() {
    if (!selectedEventId) return;
    beginPull();
    try {
      const res = await pullApi(selectedEventId);
      const reveal: PendingReveal = { type: "single", result: res };
      lastRevealRef.current = reveal;
      if (isImmediate()) applySingle(res);
      else setPending(reveal);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Pull failed");
    } finally {
      setPulling(false);
    }
  }

  async function pullTen() {
    if (!selectedEventId) return;
    beginPull();
    try {
      const data = await pullMany(selectedEventId, MULTI_PULL_COUNT);
      const reveal: PendingReveal = { type: "multi", data };
      lastRevealRef.current = reveal;
      if (isImmediate()) applyMulti(data);
      else setPending(reveal);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Pull failed");
    } finally {
      setPulling(false);
    }
  }

  function applySingle(res: PullResult) {
    setResult(res);
    setCoins(res.remainingCoins);
  }

  function applyMulti(data: MultiPullResult) {
    setMultiResult(data);
    setCoins(data.remainingCoins);
  }

  // Called when a cinematic reveal reaches its reward — commit the outcome.
  function commitReveal() {
    if (!pending || pending.replay) return;
    if (pending.type === "single") applySingle(pending.result);
    else applyMulti(pending.data);
  }

  // Called when the user dismisses the reward overlay.
  function dismissReveal() {
    setPending(null);
  }

  // Clear persisted result cards (single card / multi grid).
  function clearResults() {
    setResult(null);
    setMultiResult(null);
  }

  function replay() {
    if (lastRevealRef.current) setPending({ ...lastRevealRef.current, replay: true });
  }

  function toggleAuto() {
    setAuto((a) => !a);
  }

  const revealResult =
    pending === null ? null : pending.type === "single" ? pending.result : headlineOf(pending.data);

  return {
    checking,
    profile,
    events,
    selectedEventId,
    setSelectedEventId,
    items,
    pulling,
    revealing: pending !== null,
    skipAnimation,
    setSkipAnimation,
    speed,
    setSpeed,
    auto,
    toggleAuto,
    canReplay: lastRevealRef.current !== null,
    replay,
    result,
    multiResult,
    revealResult,
    error,
    pull,
    pullTen,
    commitReveal,
    dismissReveal,
    clearResults,
    pullCost: PULL_COST,
    muted: sound.muted,
    toggleMute: sound.toggleMute,
    onSound: sound.play,
    reducedMotion: presentation.reducedMotion,
    fullscreen: presentation.fullscreen,
    toggleFullscreen: presentation.toggleFullscreen,
    onVibrate: presentation.vibrate,
  };
}
