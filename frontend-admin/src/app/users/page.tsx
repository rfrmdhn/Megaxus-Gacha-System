"use client";

import { useEffect, useState } from "react";
import {
  CheckCircleOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { apiFetch, ApiError } from "@/lib/api";
import { useRequireAdmin } from "@/lib/useRequireAdmin";
import { Card } from "@/components/Card";
import { IconButton } from "@/components/IconButton";
import { AdminUser, UserEditDialog } from "./UserEditDialog";
import { UserCreateDialog } from "./UserCreateDialog";

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
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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

  async function toggleBan(target: AdminUser) {
    const next = !target.isBanned;
    if (!window.confirm(`${next ? "Ban" : "Unban"} ${target.email}?`)) return;
    setError(null);
    try {
      await patchUser(target.id, { isBanned: next });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update user");
    }
  }

  const editingUser = users.find((u) => u.id === editingUserId) ?? null;

  const filteredUsers = users.filter((u) => roleFilter === "all" || u.role === roleFilter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 border-l-4 border-brand-purple pl-3 text-2xl font-semibold">
          <TeamOutlined className="text-brand-purple" />
          Users
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadPage(null, true)}
            className="flex items-center gap-2 rounded-lg border border-black/15 px-4 py-2 text-sm transition-colors hover:border-brand-purple/50"
          >
            <ReloadOutlined /> Reload
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-cyan via-brand-purple to-brand-pink px-4 py-2 text-sm font-medium text-white shadow-md shadow-brand-purple/30 transition-opacity hover:opacity-90"
          >
            <PlusOutlined /> New user
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            placeholder="Search by email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "all" | "user" | "admin")}
            className="rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30"
          >
            <option value="all">All roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-black/50">Loading users…</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-sm text-black/50">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left">
                  <th className="py-2">Email</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Coins</th>
                  <th className="py-2">Banned</th>
                  <th className="py-2">Pulls</th>
                  <th className="py-2">Created</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-black/5">
                    <td className="py-2">{u.email}</td>
                    <td className="py-2 capitalize">{u.role}</td>
                    <td className="py-2">{u.coins}</td>
                    <td className="py-2">{u.isBanned ? "Yes" : "No"}</td>
                    <td className="py-2">{u.pullCount}</td>
                    <td className="py-2 text-black/50">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="py-2">
                      <div className="flex justify-end gap-1.5">
                        <IconButton icon={<EditOutlined />} label="Edit user" onClick={() => setEditingUserId(u.id)} />
                        <IconButton
                          icon={u.isBanned ? <CheckCircleOutlined /> : <StopOutlined />}
                          label={u.isBanned ? "Unban" : "Ban"}
                          danger={!u.isBanned}
                          onClick={() => toggleBan(u)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hasMore && (
          <button
            onClick={() => loadPage(cursor, false)}
            disabled={loadingMore}
            className="self-start rounded-lg border border-black/15 px-4 py-2 text-sm transition-colors hover:border-brand-purple/50 disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        )}
      </Card>

      {editingUser && (
        <UserEditDialog user={editingUser} onClose={() => setEditingUserId(null)} onPatch={patchUser} />
      )}

      {creating && (
        <UserCreateDialog onClose={() => setCreating(false)} onCreated={() => void loadPage(null, true)} />
      )}
    </div>
  );
}
