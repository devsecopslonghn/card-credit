"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { canManageUsers } from "@/lib/auth/rbac";

type NavigationUser = { role: "admin" | "user"; displayName?: string; email: string };

const links = [
  { href: "/cards", label: "Thẻ & giao dịch" },
  { href: "/reports", label: "Báo cáo" },
  { href: "/masterdata/banks", label: "Ngân hàng" },
  { href: "/masterdata/cardtypes", label: "Loại thẻ" },
];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function NavigationBar() {
  const pathname = usePathname();
  const [user, setUser] = useState<NavigationUser | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/profile", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() as Promise<{ user: NavigationUser }> : null))
      .then((body) => {
        if (active) setUser(body?.user ?? null);
      })
      .catch(() => {
        if (active) setUser(null);
      });
    return () => { active = false; };
  }, [pathname]);

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
      <nav aria-label="Điều hướng chính" className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 md:px-8">
        <Link href="/cards" className="mr-2 text-lg font-bold tracking-tight text-blue-800">Card Credit</Link>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {links.map((link) => (
            <Link key={link.href} href={link.href} aria-current={isActive(pathname, link.href) ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive(pathname, link.href) ? "bg-blue-100 text-blue-800" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}>
              {link.label}
            </Link>
          ))}
          {canManageUsers(user) ? <Link href="/admin/users" className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive(pathname, "/admin/users") ? "bg-blue-100 text-blue-800" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}>Quản lý user</Link> : null}
          {canManageUsers(user) ? <Link href="/admin/card-catalog" className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive(pathname, "/admin/card-catalog") ? "bg-blue-100 text-blue-800" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}>Card Catalog</Link> : null}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/profile" aria-label="Mở hồ sơ" className={`hidden max-w-40 truncate rounded-lg px-3 py-2 text-sm font-semibold sm:block ${isActive(pathname, "/profile") ? "bg-emerald-100 text-emerald-800" : "text-gray-600 hover:bg-gray-100"}`}>
            {user.displayName || user.email}
          </Link>
          <LogoutButton className="items-center" />
        </div>
      </nav>
    </header>
  );
}
