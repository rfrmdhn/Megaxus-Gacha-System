"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, JwtPayload } from "@/lib/auth";

export function useRequireAuth(): { user: JwtPayload | null; checking: boolean } {
  const router = useRouter();
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(current);
    setChecking(false);
  }, [router]);

  return { user, checking };
}
