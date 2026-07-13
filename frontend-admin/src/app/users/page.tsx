"use client";

import { useState } from "react";
import { PlusOutlined, ReloadOutlined, TeamOutlined } from "@ant-design/icons";
import { useRequireAdmin } from "@/lib/useRequireAdmin";
import { Card } from "@/components/molecules/Card";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { Skeleton, TableSkeleton } from "@/components/atoms/Skeleton";
import { useUsers } from "@/features/users/hooks/useUsers";
import { UsersTable } from "@/features/users/components/UsersTable";
import { UserEditDialog } from "@/features/users/components/UserEditDialog";
import { UserCreateDialog } from "@/features/users/components/UserCreateDialog";

function UsersSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-28" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <TableSkeleton cols={7} />
      </Card>
    </div>
  );
}

export default function UsersPage() {
  const { user, checking } = useRequireAdmin();
  const {
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
    deleteUser,
  } = useUsers(user);
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const editingUser = users.find((u) => u.id === editingUserId) ?? null;

  const filteredUsers = users.filter((u) => roleFilter === "all" || u.role === roleFilter);

  if (checking) return <UsersSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 border-l-4 border-brand-red-600 pl-3 text-2xl font-semibold">
          <TeamOutlined className="text-brand-red-600" />
          Users
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void loadPage(null, true)}
            className="flex items-center gap-2 hover:border-brand-red-600/50"
          >
            <ReloadOutlined /> Reload
          </Button>
          <Button onClick={() => setCreating(true)} className="flex items-center gap-2">
            <PlusOutlined /> New user
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search by email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs flex-1"
          />
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as "all" | "user" | "admin")}>
            <option value="all">All roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </Select>
        </div>

        {loading ? (
          <p className="text-sm text-black/50">Loading users…</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-sm text-black/50">No users found.</p>
        ) : (
          <UsersTable
            users={filteredUsers}
            onEdit={(userId) => setEditingUserId(userId)}
            onToggleBan={toggleBan}
            onDelete={deleteUser}
          />
        )}

        {hasMore && (
          <Button
            variant="outline"
            onClick={() => loadPage(cursor, false)}
            disabled={loadingMore}
            className="self-start hover:border-brand-red-600/50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
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
