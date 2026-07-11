"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken, getCurrentUser, JwtPayload } from "@/lib/auth";

export function useRequireAdmin(): JwtPayload | null {
  const router = useRouter();
  const [user, setUser] = useState<JwtPayload | null>(null);

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
    setUser(current);
  }, [router]);

  return user;
}
