"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken, getCurrentUser, JwtPayload } from "@/lib/auth";

export function useRequireAdmin(): { user: JwtPayload | null; checking: boolean } {
  const router = useRouter();
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/login");
      return;
    }
    if (current.role !== "admin") {
      clearToken();
      router.push("/login");
      return;
    }
    // Mirrors the existing auth-check pattern in NavBar.tsx (localStorage read, not React state).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(current);
    setChecking(false);
  }, [router]);

  return { user, checking };
}
