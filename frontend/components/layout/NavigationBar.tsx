"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { canManageUsers } from "@/lib/auth/rbac";

type NavigationUser = { role: "admin" | "user"; displayName?: string; email: string };

const links = [
  { href: "/cards", label: "Tổng quan" },
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

  const active = (href: string) => isActive(pathname, href);
  const navLink = (href: string) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active(href) ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`;

  return (
    <>
      <aside className="cc-sidebar fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-gray-200 bg-white lg:flex" aria-label="Điều hướng chính">
        <div className="flex items-center gap-3 p-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 font-bold text-white">C</span>
          <Link href="/cards" className="text-xl font-bold tracking-tight text-gray-900">Card Credit</Link>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-4">
          {links.map((link) => <Link key={link.href} href={link.href} aria-current={active(link.href) ? "page" : undefined} className={navLink(link.href)}>{link.label}</Link>)}
          <Link href="/profile" aria-current={active("/profile") ? "page" : undefined} className={navLink("/profile")}>Hồ sơ</Link>
          <div className="my-4 border-t border-gray-100" />
          <Link href="/masterdata/banks" className={navLink("/masterdata/banks")}>Ngân hàng</Link>
          <Link href="/masterdata/cardtypes" className={navLink("/masterdata/cardtypes")}>Loại thẻ</Link>
          {canManageUsers(user) ? <Link href="/admin/users" className={navLink("/admin/users")}>Quản lý user</Link> : null}
          {canManageUsers(user) ? <Link href="/admin/card-catalog" className={navLink("/admin/card-catalog")}>Card Catalog</Link> : null}
        </nav>
        <div className="flex items-center justify-between border-t border-gray-100 p-4">
          <Link href="/profile" className="min-w-0 truncate text-sm font-semibold text-gray-700">{user.displayName || user.email}</Link>
          <LogoutButton className="items-center" />
        </div>
      </aside>

      <header className="cc-mobile-top sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <Link href="/cards" className="flex items-center gap-2 text-lg font-bold tracking-tight text-gray-900"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-700 text-sm text-white">C</span>Card Credit</Link>
        <Link href="/profile" aria-label="Mở hồ sơ" className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">{(user.displayName || user.email).slice(0, 1).toUpperCase()}</Link>
      </header>

      <nav className="cc-mobile-bottom fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(17,24,39,0.05)] backdrop-blur lg:hidden" aria-label="Điều hướng mobile">
        <div className="grid h-16 grid-cols-4">
          {[{ href: "/cards", label: "Tổng quan" }, { href: "/cards", label: "Ví thẻ" }, { href: "/reports", label: "Báo cáo" }, { href: "/profile", label: "Hồ sơ" }].map((link, index) => <Link key={`${link.label}-${index}`} href={link.href} className={`flex items-center justify-center text-[11px] font-semibold ${active(link.href) && (index !== 1 || pathname !== "/cards") ? "text-blue-700" : "text-gray-500"}`}>{link.label}</Link>)}
        </div>
      </nav>
    </>
  );
}
