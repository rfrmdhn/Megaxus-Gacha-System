"use client";

import { FormEvent, useState } from "react";
import { Dialog } from "@/components/molecules/Dialog";
import { FormField } from "@/components/molecules/FormField";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { ApiError } from "@/lib/api";
import { createUser } from "../api";

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
      await createUser({
        email,
        password,
        role,
        ...(Number.isNaN(coins) ? {} : { coins }),
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
          <Button variant="outline" onClick={onClose} className="hover:border-black/30">
            Cancel
          </Button>
          <Button type="submit" form="user-create-form" disabled={saving}>
            {saving ? "Creating…" : "Create"}
          </Button>
        </>
      }
    >
      <form id="user-create-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <FormField label="Email">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <FormField label="Password">
          <Input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>
        <div className="flex flex-wrap items-end gap-4">
          <FormField label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value as "user" | "admin")}>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </Select>
          </FormField>
          <FormField label="Coins">
            <Input
              type="number"
              min="0"
              value={coinsInput}
              onChange={(e) => setCoinsInput(e.target.value)}
              className="w-28"
            />
          </FormField>
        </div>
      </form>
    </Dialog>
  );
}
