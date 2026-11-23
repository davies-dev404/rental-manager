import React from "react";
import { useLocation } from "wouter";
import { ADMIN_NAV_ITEMS } from "./AdminSidebar";
import { Menu, Power, ShieldCheck } from "lucide-react";

export default function AdminNavbar({
  user,
  isDesktopCollapsed,
  onToggleSidebar,
  onLogout
}) {
  const [location] = useLocation();
  const activeItem =
    ADMIN_NAV_ITEMS.find((i) =>
      i.href === "/admin"
        ? location === "/admin" || location === "/super-admin"
        : location === i.href || location.startsWith(`${i.href}/`)
    ) || ADMIN_NAV_ITEMS[0];

  const HeaderIcon = activeItem.icon || ShieldCheck;

  return (
    <header className="h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          title={isDesktopCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label="Toggle Admin Sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-semibold text-xs sm:text-sm truncate">
          <HeaderIcon className="w-4 h-4 text-[#00a99d] shrink-0" />
          <span className="truncate">{activeItem.label}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0d2240]/5 dark:bg-[#00a99d]/15 border border-slate-200 dark:border-[#00a99d]/30 text-[11px] font-semibold text-[#0d2240] dark:text-[#00d4c8]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00a99d]" />
          <span>{user?.name || "Super Admin"}</span>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-medium transition cursor-pointer"
        >
          <Power className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
