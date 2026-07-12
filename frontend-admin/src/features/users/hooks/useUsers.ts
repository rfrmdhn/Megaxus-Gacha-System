"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { JwtPayload } from "@/lib/auth";
import { AdminUser } from "../types";
import { listUsers, updateUser } from "../api";

export function useUsers(user: JwtPayload | null) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function loadPage(after: string | null, replace: boolean) {
    if (replace) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const page = await listUsers({ limit: 20, cursor: after, email: search || undefined });
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

  async function patchUser(id: string, body: Partial<Pick<AdminUser, "coins" | "role" | "isBanned">>) {
    await updateUser(id, body);
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

  return {
    users,
    cursor,
    hasMore,
    loading,
    loadingMore,
    error,
    search,
    setSearch,
    loadPage,
    patchUser,
    toggleBan,
  };
}
