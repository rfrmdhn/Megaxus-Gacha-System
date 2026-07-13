"use client";

import Link from "next/link";
import { AuthCard } from "@/components/molecules/AuthCard";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { useLogin } from "@/features/auth/hooks/useLogin";

export default function LoginPage() {
  const { email, setEmail, password, setPassword, error, loading, onSubmit } = useLogin();

  return (
    <AuthCard title="Log in">
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
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="rounded-lg px-4 py-2 font-medium">
          {loading ? "Logging in..." : "Log in"}
        </Button>
      </form>
      <p className="mt-4 text-sm">
        No account yet?{" "}
        <Link href="/register" className="font-medium text-brand-red-600 underline">
          Register
        </Link>
      </p>
    </AuthCard>
  );
}
