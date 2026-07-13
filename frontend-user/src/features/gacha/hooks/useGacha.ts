"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { getConfig, SystemConfig } from "@/lib/config";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { Profile } from "@/features/profile/types";
import { getProfile } from "@/features/profile/api";
import { GachaEvent, EventItem, PullResult, MultiPullResult } from "../types";
import { listEvents, getEvent, pull as pullApi, pullMany } from "../api";
import { useSoundManager } from "./useSoundManager";
import { usePresentation } from "./usePresentation";

const DEFAULT_CONFIG: SystemConfig = {
  PULL_COST: 10,
  MAX_BULK_PULL: 10,
  GACHA_PULL_THROTTLE_LIMIT: 120,
  GACHA_PULL_THROTTLE_TTL_MS: 60_000,
  ADMIN_FEED_RATE_LIMIT_MAX: 10,
  ADMIN_FEED_RATE_LIMIT_DURATION_MS: 1000,
  GLOBAL_THROTTLE_LIMIT: 40,
  GLOBAL_THROTTLE_TTL_MS: 60_000,
  BCRYPT_ROUNDS: 10,
  REFRESH_TOKEN_BYTES: 32,
  DEFAULT_REFRESH_EXPIRES_SECONDS: 604_800,
  JWT_ACCESS_EXPIRES_IN_SECONDS: 900,
  RECENT_HISTORY_LIMIT: 10,
  BACKSTOP_TTL_SECONDS: 86_400,
  PULL_COST_FRONTEND: 10,
  MULTI_PULL_COUNT: 10,
  PULL_REVEAL_ANIMATION_MS: 700,
  REFRESH_DEBOUNCE_MS: 500,
};

type PendingReveal = { type: "single"; result: PullResult } | { type: "multi"; data: MultiPullResult };

export function useGacha(initialEventId?: string | null) {
  const router = useRouter();
  const { checking } = useRequireAuth();
  const sound = useSoundManager();
  const presentation = usePresentation();

  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<GachaEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [items, setItems] = useState<EventItem[]>([]);
  const [pulling, setPulling] = useState(false);
  const [skipAnimation, setSkipAnimation] = useState(false);
  const [speed, setSpeed] = useState(1);

  const [pending, setPending] = useState<PendingReveal | null>(null);
  const [result, setResult] = useState<PullResult | null>(null);
  const [multiResult, setMultiResult] = useState<MultiPullResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (checking) return;
    void loadConfig();
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

  async function loadConfig() {
    try {
      setConfig(await getConfig());
    } catch {
      // Keep defaults on failure
    }
  }

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

  function isImmediate() {
    return skipAnimation || presentation.reducedMotion;
  }

  async function pull() {
    if (!selectedEventId) return;
    beginPull();
    try {
      const res = await pullApi(selectedEventId);
      const reveal: PendingReveal = { type: "single", result: res };
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
      const data = await pullMany(selectedEventId, config.MULTI_PULL_COUNT);
      const reveal: PendingReveal = { type: "multi", data };
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

  function commitReveal() {
    if (!pending) return;
    if (pending.type === "single") applySingle(pending.result);
    else applyMulti(pending.data);
  }

  function dismissReveal() {
    setPending(null);
  }

  function clearResults() {
    setResult(null);
    setMultiResult(null);
  }

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
    result,
    multiResult,
    pending,
    error,
    pull,
    pullTen,
    commitReveal,
    dismissReveal,
    clearResults,
    pullCost: config.PULL_COST_FRONTEND,
    muted: sound.muted,
    toggleMute: sound.toggleMute,
    onSound: sound.play,
    reducedMotion: presentation.reducedMotion,
    fullscreen: presentation.fullscreen,
    toggleFullscreen: presentation.toggleFullscreen,
    onVibrate: presentation.vibrate,
  };
}
