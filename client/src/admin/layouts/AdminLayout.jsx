import React, { useState, useEffect, useRef } from "react";
import { Link, Redirect, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Loader2 } from "lucide-react";
import AdminSidebar from "../components/AdminSidebar";
import AdminNavbar from "../components/AdminNavbar";
import { useAdminAuth } from "../hooks/useAdminAuth";

export default function AdminLayout({ children }) {
  const { user, isLoading, isAuthenticated, isSuperAdmin, logout } = useAdminAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [location] = useLocation();
  const mainRef = useRef(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f4f6fa] dark:bg-slate-950 text-slate-600 dark:text-slate-300 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#00a99d]" />
        <p className="text-sm font-medium">Verifying Super Admin session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#f4f6fa] dark:bg-slate-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Access Denied</h1>
          <p className="text-xs text-slate-500">
            This administration area is restricted to authorized MakaziFlow Super Administrators only.
          </p>
          <Link href="/dashboard">
            <Button className="bg-[#0d2240] hover:bg-[#132d4a] text-white text-xs cursor-pointer">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsDesktopCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f4f6fa] dark:bg-slate-950 flex font-sans">
      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="p-0 w-60 border-r-0">
          <AdminSidebar onClose={() => setIsMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop Fixed Sidebar */}
      <aside
        className={cn(
          "hidden md:block shrink-0 h-screen select-none transition-all duration-300 ease-in-out bg-[#0a1e35]",
          isDesktopCollapsed ? "w-16" : "w-60"
        )}
      >
        <div className="w-full h-full overflow-hidden">
          <AdminSidebar isCollapsed={isDesktopCollapsed} />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <AdminNavbar
          user={user}
          isDesktopCollapsed={isDesktopCollapsed}
          onToggleSidebar={handleToggleSidebar}
          onLogout={logout}
        />

        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-7 bg-[#f4f6fa] dark:bg-slate-950 flex flex-col justify-between"
        >
          <div className="flex-1 max-w-7xl w-full mx-auto">
            {children}
          </div>
          <footer className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} MakaziFlow Super Admin Control. All rights reserved.
          </footer>
        </main>
      </div>
    </div>
  );
}
