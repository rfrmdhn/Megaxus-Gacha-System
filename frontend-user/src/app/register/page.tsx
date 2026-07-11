"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { apiFetch, ApiError } from "@/lib/api";
import { saveToken } from "@/lib/auth";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      saveToken(res.token);
      router.push("/gacha");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="mx-auto w-full max-w-sm">
        <div className="rounded-3xl bg-gradient-to-br from-brand-cyan via-brand-purple to-brand-pink p-[2px] shadow-xl shadow-brand-purple/20">
          <div className="rounded-[calc(1.5rem-2px)] bg-white px-6 py-8">
            <div className="mb-6 flex flex-col items-center gap-3">
              <Image
                src="/ayodance-logo.jpg"
                alt="AyoDance Audition"
                width={200}
                height={106}
                className="h-auto w-40"
                priority
              />
              <h1 className="text-xl font-semibold text-brand-ink">Create account</h1>
              <p className="text-center text-sm text-black/60">
                New accounts start with 500 coins.
              </p>
            </div>
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30"
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/30"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-gradient-to-r from-brand-cyan via-brand-purple to-brand-pink px-4 py-2 font-medium text-white shadow-md shadow-brand-purple/30 transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Register"}
              </button>
            </form>
            <p className="mt-4 text-sm">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-brand-purple underline">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
