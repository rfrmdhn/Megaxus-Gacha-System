"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { getProfile, getHistory } from "../api";
import { Profile, HistoryItem } from "../types";

export function useProfile() {
  const router = useRouter();
  const { checking } = useRequireAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (checking) return;
    getProfile()
      .then(setProfile)
      .catch(() => router.push("/login"));
    void loadPage(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking]);

  async function loadPage(after: string | null, replace: boolean) {
    setLoading(true);
    try {
      const page = await getHistory(after);
      setHistory((prev) => (replace ? page.items : [...prev, ...page.items]));
      setCursor(page.nextCursor);
      setHasMore(page.nextCursor !== null);
    } finally {
      setLoading(false);
    }
  }

  function loadMore() {
    void loadPage(cursor, false);
  }

  return { checking, profile, history, hasMore, loading, loadMore };
}
