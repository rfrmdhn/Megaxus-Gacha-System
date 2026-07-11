"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearToken, getCurrentUser, JwtPayload } from "@/lib/auth";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/events", label: "Events" },
  { href: "/users", label: "Users" },
  { href: "/history", label: "Live history" },
];

export default function NavBar() {
  const [user, setUser] = useState<JwtPayload | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  // The root layout (and this component) never remounts on client-side
  // navigation, so re-check auth state on every route change — otherwise
  // the nav stays stuck showing "Login" right after a login redirect, since
  // the initial mount ran before the token was saved.
  useEffect(() => {
    setUser(getCurrentUser());
  }, [pathname]);

  function logout() {
    clearToken();
    setUser(null);
    router.push("/login");
  }

  return (
    <header className="border-b border-black/10 bg-gradient-to-r from-brand-cyan/10 via-brand-purple/10 to-brand-pink/10 dark:border-white/10">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/ayodance-logo.jpg" alt="AyoDance Audition" width={112} height={60} className="h-7 w-auto" />
          Gacha Admin
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={isActive(link.href) ? "font-medium text-brand-purple underline" : undefined}
                >
                  {link.label}
                </Link>
              ))}
              <span className="text-black/50 dark:text-white/50">{user.email}</span>
              <button onClick={logout} className="underline">
                Logout
              </button>
            </>
          ) : (
            <Link href="/login">Login</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
