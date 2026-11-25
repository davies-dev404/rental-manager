import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ADMIN_NAV_ITEMS } from "./AdminSidebar";
import { adminHref } from "../utils/msimamiziMode";
import { adminService } from "../services/adminService";
import { Input } from "@/components/ui/input";
import {
  Menu,
  Power,
  ShieldCheck,
  ChevronRight,
  Search,
  Bell,
  Users,
  Building2,
  CreditCard,
  LifeBuoy,
  X
} from "lucide-react";

export default function AdminNavbar({
  user,
  isDesktopCollapsed,
  onToggleSidebar,
  onLogout
}) {
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const searchRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchTerm.trim()), 260);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const { data: searchResults } = useQuery({
    queryKey: ["admin-global-search", debouncedQ],
    queryFn: () => adminService.globalSearch(debouncedQ),
    enabled: debouncedQ.length >= 2
  });

  const { data: sysHealth } = useQuery({
    queryKey: ["admin-navbar-alerts"],
    queryFn: adminService.getSystemHealth,
    refetchInterval: 60_000,
    staleTime: 30_000
  });

  const alerts = sysHealth?.alerts || {};
  const urgentCount =
    Number(alerts.unmatchedCallbacksCount || 0) +
    Number(alerts.failedEtimsCount || 0) +
    Number(alerts.expiringSubscriptionsCount || 0) +
    Number(alerts.openSupportTicketsCount || 0);
  const activeItem =
    ADMIN_NAV_ITEMS.find((i) => {
      const targetHref = adminHref(i.path);
      return i.path === "/"
        ? location === targetHref || location === `${targetHref}/`
        : location === targetHref || location.startsWith(`${targetHref}/`);
    }) || ADMIN_NAV_ITEMS[0];

  const HeaderIcon = activeItem.icon || ShieldCheck;
  const usersBase = adminHref("/users");
  const isUserDetail = location.startsWith(`${usersBase}/`) && location.length > usersBase.length + 1;

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
        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-semibold text-xs sm:text-sm truncate">
          <HeaderIcon className="w-4 h-4 text-[#00B8B0] shrink-0" />
          {isUserDetail ? (
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 truncate">
              <button
                type="button"
                onClick={() => setLocation(usersBase)}
                className="text-[#738197] hover:text-[#102B4C] dark:hover:text-white transition cursor-pointer"
              >
                Users
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-[#738197] shrink-0" />
              <span className="truncate text-[#152238] dark:text-white">User Details</span>
            </nav>
          ) : (
            <span className="truncate">{activeItem.label}</span>
          )}
        </div>
      </div>

      {/* Center: Global Command Search */}
      <div ref={searchRef} className="relative hidden md:block w-72 lg:w-96 mx-3">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        <Input
          value={searchTerm}
          onFocus={() => setSearchOpen(true)}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setSearchOpen(true);
          }}
          placeholder="Search landlords, properties, refs, tickets..."
          className="pl-8 pr-7 h-8 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => { setSearchTerm(""); setDebouncedQ(""); }}
            className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {searchOpen && debouncedQ.length >= 2 && searchResults && (
          <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-96 overflow-y-auto z-50 p-2 space-y-2 text-xs">
            {(searchResults.users || []).length > 0 && (
              <div>
                <p className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Landlords &amp; Users
                </p>
                {searchResults.users.map((u) => (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => { setSearchOpen(false); setLocation(adminHref(`/users/${u._id}`)); }}
                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex justify-between cursor-pointer"
                  >
                    <span className="font-semibold truncate">{u.name}</span>
                    <span className="text-[11px] text-slate-500 truncate ml-2">{u.email}</span>
                  </button>
                ))}
              </div>
            )}
            {(searchResults.properties || []).length > 0 && (
              <div>
                <p className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Properties
                </p>
                {searchResults.properties.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => { setSearchOpen(false); setLocation(adminHref(`/properties/${p._id}`)); }}
                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex justify-between cursor-pointer"
                  >
                    <span className="font-semibold truncate">{p.name}</span>
                    <span className="text-[11px] text-slate-500 truncate ml-2">{p.location}</span>
                  </button>
                ))}
              </div>
            )}
            {(searchResults.transactions || []).length > 0 && (
              <div>
                <p className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <CreditCard className="w-3 h-3" /> Transactions
                </p>
                {searchResults.transactions.map((t) => (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => { setSearchOpen(false); setLocation(adminHref(`/payments/${t._id}`)); }}
                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex justify-between cursor-pointer"
                  >
                    <span className="font-mono font-semibold truncate">{t.internalTransactionId}</span>
                    <span className="text-[11px] text-[#00a99d] font-bold ml-2">
                      KES {Number(t.amountPaid || t.amount || 0).toLocaleString()} ({t.status})
                    </span>
                  </button>
                ))}
              </div>
            )}
            {(searchResults.tickets || []).length > 0 && (
              <div>
                <p className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <LifeBuoy className="w-3 h-3" /> Support Tickets
                </p>
                {searchResults.tickets.map((tk) => (
                  <button
                    key={tk._id}
                    type="button"
                    onClick={() => { setSearchOpen(false); setLocation(adminHref(`/support/${tk._id}`)); }}
                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex justify-between cursor-pointer"
                  >
                    <span className="font-semibold truncate">{tk.ticketNumber} · {tk.subject}</span>
                    <span className="text-[11px] text-slate-500 uppercase ml-2">{tk.status}</span>
                  </button>
                ))}
              </div>
            )}
            {!searchResults.users?.length &&
              !searchResults.properties?.length &&
              !searchResults.transactions?.length &&
              !searchResults.tickets?.length && (
                <p className="text-center text-slate-400 py-3">No matching platform records.</p>
              )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Notification Centre Bell */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            className="relative p-1.5 text-slate-600 hover:text-[#0d2240] dark:text-slate-300 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Platform Alert Centre"
            aria-label="Platform Alert Centre"
          >
            <Bell className="w-4 h-4" />
            {urgentCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9.5px] font-bold flex items-center justify-center">
                {urgentCount > 99 ? "99+" : urgentCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-1.5 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 p-3 space-y-2 text-xs">
              <p className="font-bold text-[#0d2240] dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1.5">
                Notification &amp; Alert Centre
              </p>
              {[
                { label: "Subscriptions expiring (14d)", count: alerts.expiringSubscriptionsCount || 0, href: "/subscriptions" },
                { label: "Unmatched gateway callbacks", count: alerts.unmatchedCallbacksCount || 0, href: "/payments?tab=callbacks" },
                { label: "Failed eTIMS submissions", count: alerts.failedEtimsCount || 0, href: "/payments?tab=etims" },
                { label: "Open support tickets", count: alerts.openSupportTicketsCount || 0, href: "/support" },
                { label: "Failed payments (24h)", count: alerts.failedPayments24h || 0, href: "/payments?tab=reconciliation" }
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => { setNotifOpen(false); setLocation(adminHref(item.href)); }}
                  className="w-full text-left flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded-full text-[10.5px] ${item.count > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"}`}>
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

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
