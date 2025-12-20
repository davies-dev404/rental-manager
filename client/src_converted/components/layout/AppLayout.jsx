import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { LayoutDashboard, Building2, Users, CreditCard, Settings, LogOut, Bell, Search, Menu, Clock, BarChart3, FileText, Activity } from "lucide-react";
import logo from "@assets/generated_images/minimalist_geometric_building_logo.png";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
function SidebarContent({ className, onClose }) {
    const [location] = useLocation();
    const { logout, user } = useAuth();
    const menuItems = [
        { icon: LayoutDashboard, label: "Dashboard", href: "/" },
        { icon: Building2, label: "Properties", href: "/properties" },
        { icon: Users, label: "Tenants", href: "/tenants" },
        { icon: CreditCard, label: "Payments", href: "/payments" },
    ];
    const toolsMenuItems = [
        { icon: Clock, label: "Reminders", href: "/reminders" },
        { icon: BarChart3, label: "Reports", href: "/reports" },
        { icon: FileText, label: "Documents", href: "/documents" },
        { icon: Activity, label: "Activity Logs", href: "/activity-logs" },
    ];
    return (<div className={cn("flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border", className)}>
      <div className="p-6 flex items-center gap-3">
         <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
             <img src={logo} alt="Logo" className="w-5 h-5 object-contain brightness-0 invert"/>
         </div>
        <span className="font-heading font-bold text-xl tracking-tight">RentalManager</span>
      </div>

      <div className="flex-1 py-6 px-4 space-y-1">
        <p className="px-4 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider mb-2">Core</p>
        {menuItems.map((item) => {
            const isActive = location === item.href;
            return (<Link key={item.href} href={item.href} onClick={onClose}>
              <div className={cn("flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer group", isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/80")}>
                <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground")}/>
                {item.label}
              </div>
            </Link>);
        })}

        <p className="px-4 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider mb-2 mt-6">Tools</p>
        {toolsMenuItems.map((item) => {
            const isActive = location === item.href;
            return (<Link key={item.href} href={item.href} onClick={onClose}>
              <div className={cn("flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer group", isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/80")}>
                <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground")}/>
                {item.label}
              </div>
            </Link>);
        })}
        
        <p className="px-4 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider mb-2 mt-6">Account</p>
        <Link href="/settings" onClick={onClose}>
          <div className={cn("flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer group", location === "/settings"
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
            : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/80")}>
            <Settings className={cn("w-5 h-5", location === "/settings" ? "text-white" : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground")}/>
            Settings
          </div>
        </Link>
      </div>

      <div className="p-4 border-t border-sidebar-border mt-auto">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/50 mb-4">
            <Avatar className="h-9 w-9 border border-sidebar-border">
                <AvatarImage src={user?.avatar}/>
                <AvatarFallback className="bg-primary text-white text-xs">{user?.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-sidebar-foreground">{user?.name}</p>
                <p className="text-xs text-sidebar-foreground/60 truncate capitalize">{user?.role}</p>
            </div>
        </div>
        <Button variant="outline" className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent border-sidebar-border" onClick={logout}>
          <LogOut className="w-4 h-4 mr-2"/>
          Logout
        </Button>
      </div>
    </div>);
}
export default function AppLayout({ children }) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    return (<div className="flex min-h-screen bg-gray-50/50 dark:bg-black">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 fixed inset-y-0 left-0 z-50">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen transition-all duration-300">
        {/* Top Header */}
        <header className="sticky top-0 z-40 h-16 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden">
                            <Menu className="w-5 h-5"/>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-64 border-r-0">
                        <SidebarContent onClose={() => setIsMobileOpen(false)}/>
                    </SheetContent>
                </Sheet>
                
                <div className="relative hidden md:block w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                    <Input placeholder="Search properties, tenants, units..." className="pl-9 bg-secondary/50 border-transparent focus-visible:bg-background focus-visible:border-primary/50 transition-all rounded-full h-9 text-sm"/>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-secondary">
                    <Bell className="w-5 h-5 text-muted-foreground"/>
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-background"></span>
                </Button>
            </div>
        </header>
        
        <div className="flex-1 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
        </div>
      </main>
    </div>);
}
