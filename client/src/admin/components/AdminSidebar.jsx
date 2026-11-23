import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import DwelloLogo from "@/components/DwelloLogo";
import {
  LayoutGrid,
  Users,
  Building2,
  UserCheck,
  CreditCard,
  Layers,
  BarChart3,
  LifeBuoy,
  Settings,
  ShieldAlert,
  ArrowLeft
} from "lucide-react";

export const ADMIN_NAV_ITEMS = [
  { id: "overview", label: "Overview", href: "/admin", icon: LayoutGrid },
  { id: "users", label: "Users", href: "/admin/users", icon: Users },
  { id: "properties", label: "Properties", href: "/admin/properties", icon: Building2 },
  { id: "tenants", label: "Tenants", href: "/admin/tenants", icon: UserCheck },
  { id: "payments", label: "Payments", href: "/admin/payments", icon: CreditCard },
  { id: "subscriptions", label: "Subscriptions", href: "/admin/subscriptions", icon: Layers },
  { id: "reports", label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { id: "support", label: "Support", href: "/admin/support", icon: LifeBuoy },
  { id: "settings", label: "Platform Settings", href: "/admin/settings", icon: Settings },
  { id: "activity", label: "Security & Audit Logs", href: "/admin/activity", icon: ShieldAlert }
];

export default function AdminSidebar({ onClose, isCollapsed = false }) {
  const [location] = useLocation();

  const isItemActive = (href) => {
    if (href === "/admin") {
      return location === "/admin" || location === "/super-admin";
    }
    return location === href || location.startsWith(`${href}/`);
  };

  if (isCollapsed) {
    return (
      <div className="flex flex-col h-full bg-[#0a1e35] text-[#a8bfd4] select-none border-r border-[#1a3a5c] w-16 items-center justify-between py-2">
        <div className="flex-1 w-full space-y-1.5 pt-2">
          {ADMIN_NAV_ITEMS.map((item) => {
            const active = isItemActive(item.href);
            return (
              <Link key={item.id} href={item.href} onClick={onClose} title={item.label}>
                <div
                  className={cn(
                    "relative flex items-center justify-center h-10 w-full transition-colors cursor-pointer",
                    active ? "text-white bg-[#132d4a]/70" : "text-[#7fa8c0] hover:text-white"
                  )}
                >
                  {active && <div className="absolute left-0 top-1 bottom-1 w-1 bg-[#00a99d] rounded-r-lg" />}
                  <item.icon className="w-4.5 h-4.5 shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>

        <div className="w-full pt-2 border-t border-[#1a3a5c]/80 flex flex-col items-center gap-2 pb-2">
          <Link href="/dashboard" onClick={onClose} title="Workspace Dashboard">
            <div className="p-2 text-[#7fa8c0] hover:text-white rounded-md transition cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0d2240] text-[#a8bfd4] select-none border-r border-[#1a3a5c]">
      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-[#1a3a5c]/80 flex items-center justify-between">
        <Link href="/admin" onClick={onClose} className="cursor-pointer block">
          <DwelloLogo />
          <span className="mt-1.5 inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#00a99d]/20 text-[#00d4c8] border border-[#00a99d]/30">
            Super Admin
          </span>
        </Link>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-3 space-y-0.5">
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = isItemActive(item.href);
          return (
            <Link key={item.id} href={item.href} onClick={onClose}>
              <div
                className={cn(
                  "relative flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium transition-colors cursor-pointer",
                  active
                    ? "text-white font-semibold bg-[#132d4a]"
                    : "text-[#a8bfd4] hover:text-white hover:bg-[#132d4a]/60"
                )}
              >
                {active && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00a99d] rounded-r-lg" />
                )}
                <item.icon className={cn("w-4 h-4 shrink-0", active ? "text-[#00d4c8]" : "text-[#7fa8c0]")} />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer Link back to Standard Workspace */}
      <div className="p-4 border-t border-[#1a3a5c]/80 bg-[#0a1e35]">
        <Link href="/dashboard" onClick={onClose}>
          <div className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#a8bfd4] hover:text-white hover:bg-[#132d4a]/60 rounded-md transition cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5 text-[#00a99d]" />
            <span>Back to Property View</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
