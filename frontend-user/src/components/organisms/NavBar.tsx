"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getCurrentUser, JwtPayload } from "@/lib/auth";
import { Skeleton } from "@/components/Skeleton";
import { Button } from "@/components/atoms/Button";

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
      ) : (
        <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
      )}
    </svg>
  );
}

const SCROLL_THRESHOLD_PX = 8;

export default function NavBar() {
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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

  // Solid background once the page scrolls, so page content never shows
  // through the sticky header — transparent/blur only reads well at the top.
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > SCROLL_THRESHOLD_PX);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function logout() {
    clearSession();
    setUser(null);
    setMenuOpen(false);
    router.push("/login");
  }

  function isActive(href: string) {
    return pathname.startsWith(href);
  }

  if (pathname === "/login" || pathname === "/register") return null;

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors ${
        scrolled
          ? "border-black/10 bg-white shadow-sm"
          : "border-black/10 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60"
      }`}
    >
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/gacha" className="flex items-center gap-2 font-semibold">
          <Image src="/megaxuslogo.png" alt="Megaxus" width={112} height={29} className="h-7 w-auto" priority />
          <span className="bg-gradient-to-r from-brand-red-600 via-brand-red-700 to-brand-gray-900 bg-clip-text text-transparent">
            Gacha Event System
          </span>
        </Link>
        <div className="relative flex items-center gap-1 text-sm">
          {checking ? (
            <>
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-14" />
            </>
          ) : user ? (
            <>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                className="rounded-lg p-2 text-black/60 hover:bg-black/5 sm:hidden"
              >
                <MenuIcon open={menuOpen} />
              </button>
              <div
                className={`${
                  menuOpen ? "flex" : "hidden"
                } absolute right-0 top-full mt-2 min-w-[10rem] flex-col gap-1 rounded-xl border border-black/10 bg-white p-2 shadow-lg sm:static sm:mt-0 sm:flex sm:min-w-0 sm:flex-row sm:items-center sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none`}
              >
                {[
                  { href: "/events", label: "Events" },
                  { href: "/gacha", label: "Gacha" },
                  { href: "/profile", label: "Profile" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-3 py-1.5 transition-colors ${
                      isActive(link.href)
                        ? "bg-brand-red-600/10 font-medium text-brand-red-600"
                        : "hover:bg-black/5"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <span className="truncate px-3 text-black/50 sm:ml-2 sm:px-0">{user.email}</span>
                <Button
                  variant="secondary"
                  onClick={logout}
                  className="rounded-lg px-3 py-1.5 text-sm sm:ml-2"
                >
                  Logout
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-1.5 transition-colors hover:bg-black/5">
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg px-3 py-1.5 font-medium text-brand-red-600 transition-colors hover:bg-brand-red-600/10"
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
