"use client";

import { FormEvent, useState } from "react";
import { Dialog } from "@/components/Dialog";
import { apiFetch, ApiError } from "@/lib/api";

export function UserCreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [coinsInput, setCoinsInput] = useState("500");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const coins = parseInt(coinsInput, 10);
      await apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          role,
          ...(Number.isNaN(coins) ? {} : { coins }),
        }),
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      title="New user"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-black/15 px-4 py-2 text-sm transition-colors hover:border-black/30"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="user-create-form"
            disabled={saving}
            className="rounded-lg bg-gradient-to-r from-brand-cyan via-brand-purple to-brand-pink px-4 py-2 text-sm font-medium text-white shadow-md shadow-brand-purple/30 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create"}
          </button>
        </>
      }
    >
      <form id="user-create-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-black/50">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-black/50">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30"
          />
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-black/50">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "user" | "admin")}
              className="rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30"
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-black/50">Coins</label>
            <input
              type="number"
              min="0"
              value={coinsInput}
              onChange={(e) => setCoinsInput(e.target.value)}
              className="w-28 rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30"
            />
          </div>
        </div>
      </form>
    </Dialog>
  );
}
