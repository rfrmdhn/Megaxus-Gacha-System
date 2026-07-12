"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/Dialog";
import { apiFetch, ApiError } from "@/lib/api";

export interface AdminUser {
  id: string;
  email: string;
  role: "user" | "admin";
  coins: number;
  isBanned: boolean;
  pullCount: number;
  createdAt: string;
}

interface RecentHistoryItem {
  id: string;
  eventName: string;
  itemName: string;
  rarity: string;
  coinsSpent: number;
  createdAt: string;
}

interface AdminUserDetail extends AdminUser {
  recentHistory: RecentHistoryItem[];
}

export function UserEditDialog({
  user,
  onClose,
  onPatch,
}: {
  user: AdminUser;
  onClose: () => void;
  onPatch: (id: string, body: Partial<Pick<AdminUser, "coins" | "role" | "isBanned">>) => Promise<void>;
}) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coinsInput, setCoinsInput] = useState(String(user.coins));
  const [savingCoins, setSavingCoins] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [banning, setBanning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<AdminUserDetail>(`/admin/users/${user.id}`)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load user detail");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  async function saveCoins() {
    const coins = parseInt(coinsInput, 10);
    if (Number.isNaN(coins) || coins < 0) return;
    setSavingCoins(true);
    try {
      await onPatch(user.id, { coins });
    } finally {
      setSavingCoins(false);
    }
  }

  async function changeRole(next: "user" | "admin") {
    if (next === user.role) return;
    if (!window.confirm(`Change ${user.email}'s role to ${next}?`)) return;
    setSavingRole(true);
    try {
      await onPatch(user.id, { role: next });
    } finally {
      setSavingRole(false);
    }
  }

  async function toggleBan() {
    const next = !user.isBanned;
    if (!window.confirm(`${next ? "Ban" : "Unban"} ${user.email}?`)) return;
    setBanning(true);
    try {
      await onPatch(user.id, { isBanned: next });
    } finally {
      setBanning(false);
    }
  }

  return (
    <Dialog title={user.email} onClose={onClose} widthClassName="max-w-xl">
      <div className="flex flex-col gap-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-black/50">Coins</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={coinsInput}
                onChange={(e) => setCoinsInput(e.target.value)}
                className="w-28 rounded-lg border border-black/15 px-2 py-1.5 text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30"
              />
              <button
                onClick={saveCoins}
                disabled={savingCoins || parseInt(coinsInput, 10) === user.coins}
                className="rounded-lg border border-black/15 px-3 py-1.5 text-sm transition-colors hover:border-brand-purple/50 disabled:opacity-50"
              >
                {savingCoins ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-black/50">Role</label>
            <select
              value={user.role}
              disabled={savingRole}
              onChange={(e) => changeRole(e.target.value as "user" | "admin")}
              className="rounded-lg border border-black/15 px-2 py-1.5 text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30 disabled:opacity-50"
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <button
            onClick={toggleBan}
            disabled={banning}
            className={`rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 ${
              user.isBanned ? "border-black/15" : "border-red-300 text-red-600"
            }`}
          >
            {banning ? "Saving…" : user.isBanned ? "Unban" : "Ban"}
          </button>
        </div>

        <div className="border-t border-black/10 pt-4">
          <h3 className="mb-2 text-sm font-medium">Recent pulls</h3>
          {loading ? (
            <p className="text-sm text-black/50">Loading…</p>
          ) : !detail || detail.recentHistory.length === 0 ? (
            <p className="text-sm text-black/50">No pulls yet.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {detail.recentHistory.map((h) => (
                <li key={h.id}>
                  <strong>{h.itemName}</strong> ({h.rarity}) from {h.eventName} — {h.coinsSpent} coins —{" "}
                  {new Date(h.createdAt).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  );
}
