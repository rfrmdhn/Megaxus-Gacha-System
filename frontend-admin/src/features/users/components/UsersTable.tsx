"use client";

import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { IconButton } from "@/components/atoms/IconButton";
import { AdminUser } from "../types";

export function UsersTable({
  users,
  onEdit,
  onToggleBan,
  onDelete,
}: {
  users: AdminUser[];
  onEdit: (userId: string) => void;
  onToggleBan: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}) {
  return (
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
          {users.map((u) => (
            <tr key={u.id} className="border-b border-black/5">
              <td className="py-2">{u.email}</td>
              <td className="py-2 capitalize">{u.role}</td>
              <td className="py-2">{u.coins}</td>
              <td className="py-2">{u.isBanned ? "Yes" : "No"}</td>
              <td className="py-2">{u.pullCount}</td>
              <td className="py-2 text-black/50">{new Date(u.createdAt).toLocaleDateString()}</td>
              <td className="py-2">
                <div className="flex justify-end gap-1.5">
                  <IconButton icon={<EditOutlined />} label="Edit user" onClick={() => onEdit(u.id)} />
                  <IconButton
                    icon={u.isBanned ? <CheckCircleOutlined /> : <StopOutlined />}
                    label={u.isBanned ? "Unban" : "Ban"}
                    danger={!u.isBanned}
                    onClick={() => onToggleBan(u)}
                  />
                  <IconButton
                    icon={<DeleteOutlined />}
                    label="Delete user"
                    danger
                    onClick={() => onDelete(u)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
