"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearToken, getCurrentUser, JwtPayload } from "@/lib/auth";

export default function NavBar() {
  const [user, setUser] = useState<JwtPayload | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // The root layout (and this component) never remounts on client-side
  // navigation, so re-check auth state on every route change — otherwise
  // the nav stays stuck showing "Login/Register" right after a login/register
  // redirect, since the initial mount ran before the token was saved.
  useEffect(() => {
    setUser(getCurrentUser());
  }, [pathname]);

  function logout() {
    clearToken();
    setUser(null);
    router.push("/login");
  }

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/gacha" className="font-semibold">
          Gacha Event System
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/gacha">Gacha</Link>
              <Link href="/profile">Profile</Link>
              {user.role === "admin" && <Link href="/admin">Admin</Link>}
              <span className="text-black/50 dark:text-white/50">{user.email}</span>
              <button onClick={logout} className="underline">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link href="/register">Register</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
