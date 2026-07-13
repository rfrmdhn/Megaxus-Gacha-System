"use client";

import Link from "next/link";
import { AuthCard } from "@/components/molecules/AuthCard";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { useRegister } from "@/features/auth/hooks/useRegister";

export default function RegisterPage() {
  const { email, setEmail, password, setPassword, error, loading, onSubmit } = useRegister();

  return (
    <AuthCard title="Create account" subtitle="New accounts start with 500 coins.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          required
          minLength={8}
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="rounded-lg px-4 py-2 font-medium">
          {loading ? "Creating..." : "Register"}
        </Button>
      </form>
      <p className="mt-4 text-sm">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-red-600 underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
