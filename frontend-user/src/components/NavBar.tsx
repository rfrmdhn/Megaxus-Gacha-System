"use client";

import Link from "next/link";
import Image from "next/image";
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

  if (pathname === "/login" || pathname === "/register") return null;

  return (
    <header className="border-b border-black/10 bg-gradient-to-r from-brand-cyan/10 via-brand-purple/10 to-brand-pink/10">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/gacha" className="flex items-center gap-2 font-semibold">
          <Image src="/ayodance-logo.jpg" alt="AyoDance Audition" width={112} height={60} className="h-7 w-auto" />
          Gacha Event System
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/gacha">Gacha</Link>
              <Link href="/profile">Profile</Link>
              <span className="text-black/50">{user.email}</span>
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
