"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { canManageUsers } from "@/lib/auth/rbac";

type NavigationUser = { role: "admin" | "user"; displayName?: string; email: string };
type NavigationLink = { href: string; label: string; icon?: string };

const userLinks: NavigationLink[] = [
  { href: "/cards", label: "Tổng quan", icon: "▦" },
  { href: "/cards", label: "Thẻ của tôi", icon: "▣" },
  { href: "/transactions", label: "Giao dịch", icon: "▤" },
  { href: "/payments", label: "Thanh toán", icon: "$" },
  { href: "/analytics", label: "Phân tích", icon: "⌁" },
  { href: "/notifications", label: "Thông báo", icon: "◉" },
  { href: "/fees", label: "Trung tâm phí", icon: "₫" },
  { href: "/cashback", label: "Cashback", icon: "%" },
  { href: "/profile", label: "Cài đặt", icon: "⚙" },
];

const adminLinks: NavigationLink[] = [
  { href: "/admin/users", label: "Quản lý người dùng" },
  { href: "/admin/card-catalog", label: "Card Catalog" },
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
  const isAdmin = canManageUsers(user);
  const adminMode = isAdmin && (pathname.startsWith("/admin/") || pathname.startsWith("/masterdata/"));
  const navLink = (href: string) => `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${active(href) ? (adminMode ? "bg-slate-800 text-white" : "bg-[#dce7ff] text-[#00687a]") : (adminMode ? "text-slate-300 hover:bg-slate-800 hover:text-white" : "text-[#3d494c] hover:bg-[#eff4ff] hover:text-[#0b1c30]")}`;
  const menuLinks = adminMode ? adminLinks : userLinks;
  const linkIcon = (link: NavigationLink) => link.icon ?? "•";

  return (
    <>
      <aside className={`cc-sidebar fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r lg:flex ${adminMode ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-white"}`} aria-label={adminMode ? "Điều hướng quản trị" : "Điều hướng chính"}>
        <div className="flex items-center gap-3 p-6">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-white ${adminMode ? "bg-slate-700" : "bg-blue-700"}`}>C</span>
          <Link href={adminMode ? "/admin/users" : "/cards"} className={`text-xl font-bold tracking-tight ${adminMode ? "text-white" : "text-gray-900"}`}>Card Credit</Link>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-4">
          {adminMode ? <Link href="/cards" className="mb-4 flex items-center gap-3 rounded-xl border border-slate-700 px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">← Quay lại User Dashboard</Link> : null}
          {!adminMode && isAdmin ? <Link href="/admin/users" className="mb-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-100"><span>Admin Console</span><span aria-hidden="true">→</span></Link> : null}
          {menuLinks.map((link) => <Link key={`${link.href}-${link.label}`} href={link.href} aria-current={active(link.href) ? "page" : undefined} className={navLink(link.href)}><span className="w-5 text-center text-lg leading-none" aria-hidden="true">{linkIcon(link)}</span>{link.label}</Link>)}
        </nav>
        <div className={`flex items-center justify-between border-t p-4 ${adminMode ? "border-slate-700" : "border-gray-100"}`}>
          <Link href="/profile" className={`min-w-0 truncate text-sm font-semibold ${adminMode ? "text-slate-200" : "text-gray-700"}`}>{user.displayName || user.email}</Link>
          <LogoutButton className="items-center" />
        </div>
      </aside>

      <header className={`cc-mobile-top sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 shadow-sm backdrop-blur lg:hidden ${adminMode ? "border-slate-700 bg-slate-900 text-white" : "border-gray-200 bg-white/95"}`}>
        <Link href={adminMode ? "/admin/users" : "/cards"} className={`flex items-center gap-2 text-lg font-bold tracking-tight ${adminMode ? "text-white" : "text-gray-900"}`}><span className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm text-white ${adminMode ? "bg-slate-700" : "bg-blue-700"}`}>C</span>{adminMode ? "Admin Console" : "Card Credit"}</Link>
        <Link href="/profile" aria-label="Mở hồ sơ" className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${adminMode ? "bg-slate-700 text-white" : "bg-blue-50 text-blue-700"}`}>{(user.displayName || user.email).slice(0, 1).toUpperCase()}</Link>
      </header>

      <nav className={`cc-mobile-bottom fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(17,24,39,0.05)] backdrop-blur lg:hidden ${adminMode ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-white/95"}`} aria-label={adminMode ? "Điều hướng quản trị mobile" : "Điều hướng mobile"}>
        <div className="grid h-16 grid-cols-4">
          {(adminMode ? adminLinks.slice(0, 4) : userLinks.slice(0, 4)).map((link) => <Link key={`${link.href}-${link.label}`} href={link.href} className={`flex items-center justify-center px-1 text-center text-[11px] font-semibold ${active(link.href) ? (adminMode ? "text-white" : "text-[#00687a]") : (adminMode ? "text-slate-400" : "text-gray-500")}`}><span className="mr-1 text-base" aria-hidden="true">{linkIcon(link)}</span>{link.label}</Link>)}
        </div>
      </nav>
    </>
  );
}
