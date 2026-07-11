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

  if (pathname === "/login") return null;

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-black/10 bg-gradient-to-b from-brand-cyan/10 via-brand-purple/10 to-brand-pink/10">
      <Link href="/" className="flex items-center gap-2 border-b border-black/10 px-4 py-4 font-semibold">
        <Image src="/ayodance-logo.jpg" alt="AyoDance Audition" width={112} height={60} className="h-7 w-auto" />
        Gacha Admin
      </Link>
      {user ? (
        <>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 text-sm">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 transition-colors ${
                  isActive(link.href)
                    ? "bg-brand-purple/10 font-medium text-brand-purple"
                    : "hover:bg-black/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-black/10 p-3 text-sm">
            <p className="truncate text-black/50">{user.email}</p>
            <button onClick={logout} className="mt-1 underline">
              Logout
            </button>
          </div>
        </>
      ) : (
        <div className="p-3 text-sm">
          <Link href="/login">Login</Link>
        </div>
      )}
    </aside>
  );
}
