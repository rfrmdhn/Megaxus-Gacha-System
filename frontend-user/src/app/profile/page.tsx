"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

interface Profile {
  id: string;
  email: string;
  coins: number;
}

interface HistoryItem {
  id: string;
  eventName: string;
  itemName: string;
  rarity: string;
  coinsSpent: number;
  createdAt: string;
}

interface HistoryPage {
  items: HistoryItem[];
  nextCursor: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getCurrentUser()) {
      router.push("/login");
      return;
    }
    apiFetch<Profile>("/user/profile")
      .then(setProfile)
      .catch(() => router.push("/login"));
    void loadPage(null, true);
  }, [router]);

  async function loadPage(after: string | null, replace: boolean) {
    setLoading(true);
    try {
      const qs = after ? `?cursor=${after}&limit=20` : "?limit=20";
      const page = await apiFetch<HistoryPage>(`/user/history${qs}`);
      setHistory((prev) => (replace ? page.items : [...prev, ...page.items]));
      setCursor(page.nextCursor);
      setHasMore(page.nextCursor !== null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {profile && (
        <div className="flex items-center justify-between rounded border border-black/10 p-4 dark:border-white/10">
          <span>{profile.email}</span>
          <span className="rounded-full bg-brand-yellow/20 px-3 py-1 text-lg font-semibold text-amber-700 dark:text-brand-yellow">
            {profile.coins} coins
          </span>
        </div>
      )}

      <div>
        <h1 className="mb-3 border-l-4 border-brand-purple pl-3 text-xl font-semibold">Gacha history</h1>
        {history.length === 0 && !loading ? (
          <p className="text-black/60 dark:text-white/60">No pulls yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left dark:border-white/10">
                <th className="py-2">Event</th>
                <th className="py-2">Item</th>
                <th className="py-2">Rarity</th>
                <th className="py-2">Cost</th>
                <th className="py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="py-2">{h.eventName}</td>
                  <td className="py-2">{h.itemName}</td>
                  <td className="py-2 capitalize">{h.rarity}</td>
                  <td className="py-2">{h.coinsSpent}</td>
                  <td className="py-2 text-black/50 dark:text-white/50">
                    {new Date(h.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {hasMore && (
          <button
            onClick={() => loadPage(cursor, false)}
            disabled={loading}
            className="mt-4 rounded border border-black/20 px-4 py-2 text-sm transition-colors hover:border-brand-purple/50 dark:border-white/20"
          >
            {loading ? "Loading..." : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
