"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearToken, getCurrentUser, JwtPayload } from "@/lib/auth";
import { Skeleton } from "@/components/Skeleton";
import { Button } from "@/components/atoms/Button";

export default function NavBar() {
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // The root layout (and this component) never remounts on client-side
  // navigation, so re-check auth state on every route change — otherwise
  // the nav stays stuck showing "Login/Register" right after a login/register
  // redirect, since the initial mount ran before the token was saved.
  useEffect(() => {
    setUser(getCurrentUser());
    setChecking(false);
  }, [pathname]);

  function logout() {
    clearToken();
    setUser(null);
    router.push("/login");
  }

  function isActive(href: string) {
    return pathname.startsWith(href);
  }

  if (pathname === "/login" || pathname === "/register") return null;

  return (
    <header className="sticky top-0 z-10 border-b border-black/10 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/gacha" className="flex items-center gap-2 font-semibold">
          <Image src="/ayodance-logo.jpg" alt="AyoDance Audition" width={112} height={60} className="h-7 w-auto" />
          <span className="bg-gradient-to-r from-brand-cyan via-brand-purple to-brand-pink bg-clip-text text-transparent">
            Gacha Event System
          </span>
        </Link>
        <div className="flex items-center gap-1 text-sm">
          {checking ? (
            <>
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-14" />
            </>
          ) : user ? (
            <>
              {[
                { href: "/events", label: "Events" },
                { href: "/gacha", label: "Gacha" },
                { href: "/profile", label: "Profile" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 transition-colors ${
                    isActive(link.href)
                      ? "bg-brand-purple/10 font-medium text-brand-purple"
                      : "hover:bg-black/5"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <span className="ml-2 hidden truncate text-black/50 sm:inline">{user.email}</span>
              <Button
                variant="secondary"
                onClick={logout}
                className="ml-2 rounded-lg px-3 py-1.5 text-sm"
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-1.5 transition-colors hover:bg-black/5">
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg px-3 py-1.5 font-medium text-brand-purple transition-colors hover:bg-brand-purple/10"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
