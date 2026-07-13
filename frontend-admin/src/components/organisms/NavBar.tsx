"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DashboardOutlined,
  GiftOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  MenuOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { clearToken, getCurrentUser, JwtPayload } from "@/lib/auth";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Button } from "@/components/atoms/Button";

const LINKS = [
  { href: "/", label: "Dashboard", icon: DashboardOutlined },
  { href: "/events", label: "Events", icon: GiftOutlined },
  { href: "/users", label: "Users", icon: TeamOutlined },
  { href: "/history", label: "Live history", icon: ClockCircleOutlined },
];

export default function NavBar() {
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
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
    setChecking(false);
  }, [pathname]);

  function logout() {
    clearToken();
    setUser(null);
    router.push("/login");
  }

  if (pathname === "/login") return null;

  return (
    <aside className="border-b border-black/10 bg-gradient-to-b from-brand-red-400/10 via-brand-red-600/10 to-brand-red-900/10 md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-4 py-4 md:border-b md:border-black/10">
        <Link href="/" className="flex items-center gap-2 font-semibold" onClick={() => setMenuOpen(false)}>
          <Image src="/megaxuslogo.png" alt="Megaxus" width={112} height={29} className="h-7 w-auto" />
          Gacha Admin
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="rounded-lg p-2 text-black/60 hover:bg-black/5 md:hidden"
        >
          {menuOpen ? <CloseOutlined /> : <MenuOutlined />}
        </button>
      </div>

      <div className={`${menuOpen ? "flex" : "hidden"} flex-1 flex-col md:flex`}>
        {checking ? (
          <>
            <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
              {LINKS.map((link) => (
                <Skeleton key={link.href} className="h-9 w-full" />
              ))}
            </div>
            <div className="border-t border-black/10 p-3">
              <Skeleton className="h-4 w-32" />
            </div>
          </>
        ) : user ? (
          <>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 text-sm">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                    isActive(link.href)
                      ? "bg-brand-red-600/10 font-medium text-brand-red-600"
                      : "hover:bg-black/5"
                  }`}
                >
                  <link.icon />
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-black/10 p-3 text-sm">
              <p className="truncate text-black/50">{user.email}</p>
              <Button variant="outline" onClick={logout} className="mt-1 w-full">
                Logout
              </Button>
            </div>
          </>
        ) : (
          <div className="p-3 text-sm">
            <Link href="/login">Login</Link>
          </div>
        )}
      </div>
    </aside>
  );
}
