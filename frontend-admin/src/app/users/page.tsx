"use client";

import { Fragment, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useRequireAdmin } from "@/lib/useRequireAdmin";
import { AdminUser, UserDetailRow } from "./UserDetailRow";

interface UsersListResponse {
  items: AdminUser[];
  nextCursor: string | null;
}

export default function UsersPage() {
  const user = useRequireAdmin();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) void loadPage(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => void loadPage(null, true), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, user]);

  async function loadPage(after: string | null, replace: boolean) {
    if (replace) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (after) params.set("cursor", after);
      if (search) params.set("email", search);
      const page = await apiFetch<UsersListResponse>(`/admin/users?${params.toString()}`);
      setUsers((prev) => (replace ? page.items : [...prev, ...page.items]));
      setCursor(page.nextCursor);
      setHasMore(page.nextCursor !== null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function patchUser(id: string, body: Partial<Pick<AdminUser, "coins" | "role" | "isBanned">>) {
    await apiFetch(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(body) });
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...body } : u)));
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="border-l-4 border-brand-purple pl-3 text-2xl font-semibold">Users</h1>

      <input
        placeholder="Search by email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm rounded border border-black/20 px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30 dark:border-white/20"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-black/50 dark:text-white/50">Loading users…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">No users found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left dark:border-white/10">
              <th className="py-2">Email</th>
              <th className="py-2">Role</th>
              <th className="py-2">Coins</th>
              <th className="py-2">Banned</th>
              <th className="py-2">Pulls</th>
              <th className="py-2">Created</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <Fragment key={u.id}>
                <tr
                  onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}
                  className="cursor-pointer border-b border-black/5 hover:bg-brand-purple/5 dark:border-white/5 dark:hover:bg-brand-purple/10"
                >
                  <td className="py-2">{u.email}</td>
                  <td className="py-2 capitalize">{u.role}</td>
                  <td className="py-2">{u.coins}</td>
                  <td className="py-2">{u.isBanned ? "Yes" : "No"}</td>
                  <td className="py-2">{u.pullCount}</td>
                  <td className="py-2 text-black/50 dark:text-white/50">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 text-right text-black/50 dark:text-white/50">
                    {expandedId === u.id ? "▲" : "▼"}
                  </td>
                </tr>
                {expandedId === u.id && <UserDetailRow user={u} onPatch={patchUser} />}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}

      {hasMore && (
        <button
          onClick={() => loadPage(cursor, false)}
          disabled={loadingMore}
          className="rounded border border-black/20 px-4 py-2 text-sm transition-colors hover:border-brand-purple/50 disabled:opacity-50 dark:border-white/20"
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
