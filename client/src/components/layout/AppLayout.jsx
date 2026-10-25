import React, { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import DwelloLogo from "@/components/DwelloLogo";
import {
  LayoutGrid,
  DollarSign,
  User,
  Home,
  BarChart2,
  Mail,
  Settings,
  Headphones,
  Video,
  ChevronDown,
  ChevronRight,
  Menu,
  LogOut,
  FlaskConical,
  Search,
  Power,
  Zap,
  Wrench,
  FileText,
  Receipt,
  CreditCard,
  TrendingDown,
  Building2,
  Layers,
  FolderTree,
  FileSpreadsheet,
  Sparkles,
  Sliders,
  Database,
  Bell,
  UserCheck,
  Files,
  MessageSquare,
  Users,
  FormInput,
  Smartphone,
  History,
  RefreshCw
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { ActionModals } from "@/components/dashboard/Modals";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

function SidebarNavigation({ onClose, onOpenModal, isCollapsed = false }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [isDemoMode, setIsDemoMode] = useState(() => {
    return user?.isDemoMode === true || localStorage.getItem("dwello_demo_mode") === "true";
  });
  const [isProcessingDemo, setIsProcessingDemo] = useState(false);

  useEffect(() => {
    if (user?.isDemoMode !== undefined) {
      setIsDemoMode(Boolean(user.isDemoMode));
    }
  }, [user?.isDemoMode]);

  const handleToggleDemoMode = async () => {
    const next = !isDemoMode;
    setIsProcessingDemo(true);
    try {
      if (next) {
        await api.seedDemoMode();
        toast({
          title: "Demo Mode Activated 🚀",
          description: "Sample Kenyan properties and tenants loaded (Bomahut style)."
        });
      } else {
        await api.clearDemoMode();
        toast({
          title: "Live Mode Active 🎉",
          description: "Sample data cleared. Ready for your real properties."
        });
      }
      setIsDemoMode(next);
      localStorage.setItem("dwello_demo_mode", String(next));
      const stored = localStorage.getItem("rental_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.isDemoMode = next;
        localStorage.setItem("rental_user", JSON.stringify(parsed));
      }
      queryClient.invalidateQueries();
      window.location.reload();
    } catch (err) {
      toast({
        title: "Action Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessingDemo(false);
    }
  };

  // Expand Financials, Property/Unit, Reports, and Settings by default to match Bomahut screenshot
  const [expandedMenus, setExpandedMenus] = useState({
    financials: true,
    property: true,
    reports: true,
    settings: true
  });

  const toggleSubmenu = (menu) => {
    setExpandedMenus((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  // Track search query parameter for active tabs (e.g. ?tab=backup)
  const [currentQueryTab, setCurrentQueryTab] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("tab") || "general";
    }
    return "general";
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const tab = new URLSearchParams(window.location.search).get("tab") || "general";
      setCurrentQueryTab(tab);
    };
    window.addEventListener("popstate", handleUrlChange);
    window.addEventListener("dwello_tab_change", handleUrlChange);
    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      window.removeEventListener("dwello_tab_change", handleUrlChange);
    };
  }, []);

  const handleTabClick = (href) => {
    if (onClose) onClose();
    if (href.includes("?tab=")) {
      const tab = href.split("?tab=")[1];
      setCurrentQueryTab(tab);
      window.dispatchEvent(new CustomEvent("dwello_tab_change", { detail: { tab } }));
    }
  };

  const menuItems = [
    {
      id: "dashboard",
      icon: LayoutGrid,
      label: "Dashboard",
      href: "/"
    },
    {
      id: "financials",
      icon: DollarSign,
      label: "Financials",
      hasSubmenu: true,
      subItems: [
        { label: "Invoices", href: "/financials/invoices", icon: Receipt },
        { label: "Payments", href: "/financials/payments", icon: CreditCard },
        { label: "Expenses", href: "/financials/expenses", icon: TrendingDown }
      ]
    },
    {
      id: "tenants",
      icon: User,
      label: "Tenants",
      href: "/tenants"
    },
    {
      id: "property",
      icon: Home,
      label: "Property/Unit",
      hasSubmenu: true,
      subItems: [
        { label: "Properties", href: "/properties", icon: Building2 },
        { label: "Units", href: "/units", icon: Layers },
        { label: "Utilities", href: "/utilities", icon: Zap },
        { label: "Maintenance", href: "/maintenance", icon: Wrench },
        { label: "Property Grouping", href: "/property-grouping", icon: FolderTree }
      ]
    },
    {
      id: "reports",
      icon: BarChart2,
      label: "Reports",
      hasSubmenu: true,
      subItems: [
        { label: "Statements", href: "/reports/statements", icon: FileSpreadsheet },
        { label: "Insights (beta)", href: "/reports/insights", icon: Sparkles }
      ]
    },
    {
      id: "communication",
      icon: Mail,
      label: "Communication",
      href: "/reminders"
    },
    {
      id: "settings",
      icon: Settings,
      label: "Settings",
      hasSubmenu: true,
      subItems: [
        { label: "General", href: "/settings?tab=general", tabId: "general", icon: Sliders },
        { label: "Backup", href: "/settings?tab=backup", tabId: "backup", icon: Database },
        { label: "Alerts", href: "/settings?tab=alerts", tabId: "alerts", icon: Bell },
        { label: "Account Info", href: "/settings?tab=account", tabId: "account", icon: UserCheck },
        { label: "Documents (beta)", href: "/settings?tab=documents", tabId: "documents", icon: Files },
        { label: "Custom Message Template", href: "/settings?tab=templates", tabId: "templates", icon: MessageSquare },
        { label: "Team", href: "/settings?tab=team", tabId: "team", icon: Users },
        { label: "Custom Fields", href: "/settings?tab=custom_fields", tabId: "custom_fields", icon: FormInput },
        { label: "Billing", href: "/settings?tab=billing", tabId: "billing", icon: CreditCard },
        { label: "MPESA Transactions", href: "/settings?tab=mpesa", tabId: "mpesa", icon: Smartphone },
        { label: "Audit Trail", href: "/settings?tab=audit", tabId: "audit", icon: History }
      ]
    }
  ];

  if (isCollapsed) {
    return (
      <div className="flex flex-col h-full bg-[#0a1e35] text-[#a8bfd4] select-none border-r border-[#1a3a5c] w-16 items-center justify-between py-2">
        {/* Main Navigation Icons matching Screenshot 3 */}
        <div className="flex-1 w-full space-y-2 pt-2">
          {menuItems.map((item) => {
            const isDashboard = item.id === "dashboard";
            const isTopActive = isDashboard
              ? location === "/" || location === "/dashboard"
              : item.id === "property"
              ? location.startsWith("/properties") || location.startsWith("/units") || location.startsWith("/utilities") || location.startsWith("/maintenance") || location.startsWith("/property-grouping")
              : location.startsWith(item.href || (item.subItems ? item.subItems[0].href : "___"));

            const targetHref = item.href || (item.subItems ? item.subItems[0].href : "/");

            return (
              <Link key={item.id} href={targetHref} onClick={onClose} title={item.label}>
                <div
                  className={cn(
                    "relative flex items-center justify-center h-10 w-full transition-colors cursor-pointer",
                    isTopActive ? "text-white" : "text-[#7fa8c0] hover:text-white"
                  )}
                >
                  {isTopActive && (
                    <div className="absolute left-0 top-1 bottom-1 w-1 bg-[#00a99d] rounded-r-lg" />
                  )}
                  <item.icon className="w-5 h-5 shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer Icons matching Screenshot 3 */}
        <div className="w-full pt-2 border-t border-[#1a3a5c]/80 flex flex-col items-center gap-2.5 bg-[#0a1e35] pb-2">
          <Link href="/support" onClick={onClose} title="Support">
            <div className="p-1.5 text-[#7fa8c0] hover:text-white rounded-md transition cursor-pointer">
              <Headphones className="w-4 h-4" />
            </div>
          </Link>
          <div
            onClick={() => {
              toast({
                title: "Tutorials & Guides",
                description: "Opening MakaziFlow video tutorials and documentation."
              });
            }}
            title="Tutorials"
            className="p-1.5 text-[#7fa8c0] hover:text-white rounded-md transition cursor-pointer"
          >
            <Video className="w-4 h-4" />
          </div>
          {/* Flask + Demo Switch */}
          <div className="flex items-center justify-center gap-1 pt-1.5 border-t border-[#1a3a5c] w-full px-1" title="Demo Mode">
            <FlaskConical className="w-3.5 h-3.5 text-[#7fa8c0] shrink-0" />
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isDemoMode}
                onChange={handleToggleDemoMode}
                className="sr-only peer"
              />
              <div className="w-6.5 h-3.5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1.5px] after:left-[1.5px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0d2240] text-[#a8bfd4] select-none border-r border-[#1a3a5c]">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-[#1a3a5c]/80 flex items-center justify-between">
        <Link href="/" onClick={onClose} className="cursor-pointer">
          <DwelloLogo />
        </Link>
      </div>

      {/* Main Navigation List */}
      <div className="flex-1 overflow-y-auto py-3 px-0 space-y-0.5 custom-sidebar-scroll">
        {menuItems.map((item) => {
          const isDashboard = item.id === "dashboard";
          const isTopActive = isDashboard
            ? location === "/" || location === "/dashboard"
            : location.startsWith(item.href || "___");
          const isExpanded = expandedMenus[item.id];

          if (item.hasSubmenu) {
            return (
              <div key={item.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleSubmenu(item.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-5 py-2.5 text-[13.5px] font-medium transition-colors text-[#a8bfd4] hover:text-white hover:bg-[#132d4a]/60 cursor-pointer"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-[#7fa8c0] shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#6e96af]" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#6e96af]" />
                  )}
                </button>

                {isExpanded && (
                  <div className="space-y-0.5 py-0.5 animate-in fade-in duration-200">
                    {item.subItems.map((sub, sIdx) => {
                      const SubIcon = sub.icon;

                      if (sub.action) {
                        return (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => {
                              if (onOpenModal) onOpenModal(sub.action);
                              if (onClose) onClose();
                            }}
                            className="w-full flex items-center gap-2.5 pl-10 pr-4 py-2 text-[13px] text-[#7fa8c0] hover:text-white hover:bg-[#132d4a]/40 transition-colors cursor-pointer text-left"
                          >
                            {SubIcon && (
                              <SubIcon className="w-3.5 h-3.5 shrink-0 text-[#7fa8c0]" />
                            )}
                            <span>{sub.label}</span>
                          </button>
                        );
                      }

                      // Check sub-item active state
                      let isSubActive = false;
                      if (item.id === "settings") {
                        isSubActive =
                          (location === "/settings" || location.startsWith("/settings")) &&
                          currentQueryTab === (sub.tabId || "general");
                      } else {
                        isSubActive =
                          location === sub.href ||
                          (sub.href && sub.href !== "/" && location.startsWith(sub.href.split("?")[0]));
                      }

                      return (
                        <Link
                          key={sIdx}
                          href={sub.href}
                          onClick={() => handleTabClick(sub.href)}
                          className={cn(
                            "relative flex items-center gap-2.5 pl-10 pr-4 py-2 text-[13px] transition-colors cursor-pointer",
                            isSubActive
                              ? "text-white font-semibold bg-[#132d4a]/80"
                              : "text-[#7fa8c0] hover:text-white hover:bg-[#132d4a]/40"
                          )}
                        >
                          {isSubActive && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00a99d] rounded-r-lg" />
                          )}
                          {SubIcon && (
                            <SubIcon
                              className={cn(
                                "w-3.5 h-3.5 shrink-0 transition-colors",
                                isSubActive ? "text-[#00a99d]" : "text-[#7fa8c0]"
                              )}
                            />
                          )}
                          <span>{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link key={item.id} href={item.href} onClick={onClose}>
              <div
                className={cn(
                  "relative flex items-center gap-3 px-5 py-2.5 text-[13.5px] font-medium transition-colors cursor-pointer",
                  isTopActive
                    ? "text-white font-semibold bg-[#132d4a]"
                    : "text-[#a8bfd4] hover:text-white hover:bg-[#132d4a]/60"
                )}
              >
                {/* Active Teal vertical bar on the very left edge */}
                {isTopActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00a99d] rounded-r-lg" />
                )}
                <item.icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    isTopActive ? "text-white" : "text-[#7fa8c0]"
                  )}
                />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Sidebar Footer Controls */}
      <div className="p-4 border-t border-[#1a3a5c]/80 space-y-2 bg-[#0a1e35]">
        <Link href="/support" onClick={onClose}>
          <div className="flex items-center gap-3 px-3 py-2 text-xs text-[#a8bfd4] hover:text-white hover:bg-[#132d4a]/50 rounded-md transition cursor-pointer">
            <Headphones className="w-3.5 h-3.5 text-[#7fa8c0]" />
            <span>Support</span>
          </div>
        </Link>

        <div
          onClick={() => {
            toast({
              title: "Tutorials & Guides",
              description: "Opening MakaziFlow video tutorials and documentation."
            });
          }}
          className="flex items-center gap-3 px-3 py-2 text-xs text-[#a8bfd4] hover:text-white hover:bg-[#132d4a]/50 rounded-md transition cursor-pointer"
        >
          <Video className="w-3.5 h-3.5 text-[#7fa8c0]" />
          <span>Tutorials</span>
        </div>

        {/* Demo mode with Flask icon and toggle switch matching the screenshot */}
        <div className="pt-2 border-t border-[#1a3a5c] flex items-center justify-between px-3 py-1 text-xs text-[#a8bfd4]">
          <div className="flex items-center gap-3">
            <FlaskConical className="w-3.5 h-3.5 text-[#7fa8c0]" />
            <span>Demo mode</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isDemoMode}
              onChange={handleToggleDemoMode}
              className="sr-only peer"
            />
            <div className="w-8 h-4.5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const searchString = useSearch();

  // Determine page title and icon for top bar
  const getHeaderInfo = () => {
    if (location === "/" || location === "/dashboard") {
      return { title: "Dashboard", Icon: LayoutGrid };
    }
    if (location === "/financials/invoices" || location.includes("tab=invoices")) {
      return { title: "Invoices", Icon: DollarSign };
    }
    if (location === "/financials/payments" || location === "/payments") {
      return { title: "Payments", Icon: DollarSign };
    }
    if (location === "/financials/expenses" || location === "/expenses") {
      return { title: "Expenses", Icon: DollarSign };
    }
    if (location.startsWith("/settings")) {
      const tab = new URLSearchParams(searchString).get("tab") || "";
      const tabNames = {
        general: "General",
        account: "Account Info",
        team: "Team",
        alerts: "Alerts",
        billing: "Billing",
        mpesa: "MPESA Transactions Status",
        documents: "Documents (beta)",
        templates: "Custom Message Template",
        custom_fields: "Custom Fields",
        integrations: "Cloudflare & Meta Pixel",
        audit: "Audit Trail",
        backup: "Backup"
      };
      if (tab === "documents") {
        return { title: "Documents (beta)", Icon: FileText };
      }
      if (tab === "mpesa") {
        return { title: "MPESA Transactions Status", Icon: CreditCard };
      }
      if (tab === "integrations") {
        return { title: "Cloudflare & Meta Pixel", Icon: BarChart2 };
      }
      return { title: tabNames[tab] || "General", Icon: Settings };
    }
    if (location.startsWith("/documents")) {
      return { title: "Documents (beta)", Icon: FileText };
    }
    if (location.startsWith("/tenants")) {
      return { title: "Tenants", Icon: User };
    }
    if (location.startsWith("/units")) {
      return { title: "Units", Icon: Home };
    }
    if (location.startsWith("/properties")) {
      return { title: "Properties", Icon: Home };
    }
    if (location.startsWith("/utilities")) {
      return { title: "Utilities", Icon: Zap };
    }
    if (location.startsWith("/maintenance")) {
      return { title: "Maintenance", Icon: Wrench };
    }
    if (location.startsWith("/property-grouping")) {
      return { title: "Property Grouping", Icon: Home };
    }
    if (location.startsWith("/reports/statements")) {
      return { title: "Reports", Icon: BarChart2 };
    }
    if (location.startsWith("/reports/insights")) {
      return { title: "Insights", Icon: BarChart2 };
    }
    if (location.startsWith("/reports")) {
      return { title: "Reports", Icon: BarChart2 };
    }
    if (location.startsWith("/reminders")) {
      return { title: "Communication", Icon: Mail };
    }
    return { title: "Dashboard", Icon: LayoutGrid };
  };

  const { title: headerTitle, Icon: HeaderIcon } = getHeaderInfo();

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f4f6fa] dark:bg-slate-950 flex font-sans">
      {/* Mobile Sidebar Sheet */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="p-0 w-60 border-r-0">
          <SidebarNavigation
            onClose={() => setIsMobileOpen(false)}
            onOpenModal={(modal) => setActiveModal(modal)}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop Fixed Left Sidebar: toggles between w-60 (full) and w-16 (mini icon sidebar) matching Screenshot 3 */}
      <aside
        className={cn(
          "hidden md:block shrink-0 h-screen select-none transition-all duration-300 ease-in-out bg-[#0a1e35]",
          isDesktopCollapsed ? "w-16" : "w-60"
        )}
      >
        <div className="w-full h-full overflow-hidden">
          <SidebarNavigation
            isCollapsed={isDesktopCollapsed}
            onOpenModal={(modal) => setActiveModal(modal)}
          />
        </div>
      </aside>

      {/* Main Content Area with Bomahut Top Header Bar */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden transition-all duration-300">
        {/* Top Header Bar */}
        <header className="h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth < 768) {
                  setIsMobileOpen((prev) => !prev);
                } else {
                  setIsDesktopCollapsed((prev) => !prev);
                }
              }}
              className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              title={isDesktopCollapsed ? "Maximize Sidebar" : "Minimize Sidebar"}
              aria-label="Toggle Navigation Sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-medium text-xs sm:text-sm">
              <HeaderIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{headerTitle}</span>
            </div>
          </div>

          {/* Center Search Input */}
          <div className="relative w-64 md:w-80 lg:w-96 hidden sm:block">
            <input
              type="text"
              placeholder="Search... Pages, Actions, Tutorials"
              className="w-full h-7.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md pl-3 pr-8 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
          </div>

          {/* Right Logout */}
          <div className="flex items-center gap-4">
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-medium transition cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Demo Mode Top Banner (Bomahut style) */}
        {(user?.isDemoMode || localStorage.getItem("dwello_demo_mode") === "true") && (
          <div className="bg-linear-to-r from-teal-700 via-teal-600 to-emerald-700 text-white text-xs px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs shrink-0 z-10 border-b border-teal-500/30 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white px-2 py-0.5 rounded font-extrabold uppercase text-[10px] tracking-wider border border-white/20">
                Demo Mode Active
              </span>
              <span className="text-white/95 text-[11px] sm:text-xs">
                You are exploring MakaziFlow with sample Kenyan properties, tenants & M-Pesa records (Bomahut style). Test any feature!
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm("Switch to Live Mode? This will clear the sample demo properties and tenants so you can start managing your real properties.")) return;
                  try {
                    await api.clearDemoMode();
                    localStorage.setItem("dwello_demo_mode", "false");
                    const stored = localStorage.getItem("rental_user");
                    if (stored) {
                      const parsed = JSON.parse(stored);
                      parsed.isDemoMode = false;
                      localStorage.setItem("rental_user", JSON.stringify(parsed));
                    }
                    queryClient.invalidateQueries();
                    window.location.reload();
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="bg-white text-teal-800 hover:bg-slate-100 font-bold px-3 py-1 rounded text-[11px] shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-teal-600" />
                <span>Switch to Live Mode (Clear Data)</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#f4f6fa] dark:bg-slate-950 flex flex-col justify-between">
          <div className="flex-1">
            {children}
          </div>
          <footer className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} MakaziFlow. All rights reserved.
          </footer>
        </main>
      </div>

      {/* Global Action Modals triggered from Nav */}
      <ActionModals
        modalType={activeModal}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}

