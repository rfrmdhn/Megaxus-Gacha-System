"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { register } from "../api";

export function useRegister() {
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
      const res = await register({ email, password });
      saveSession(res);
      router.push("/gacha");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return { email, setEmail, password, setPassword, error, loading, onSubmit };
}
