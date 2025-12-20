import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { LayoutDashboard, Building2, Users, CreditCard, Settings, LogOut, Bell, Search, Menu, Clock, BarChart3, FileText, Activity, ChevronLeft, ChevronRight } from "lucide-react";
import logo from "@/assets/logo.png";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { generateReport } from "@/lib/reports";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

function SidebarContent({ className, onClose, collapsed, onToggleCollapse }) {
    const [location] = useLocation();
    const { logout, user } = useAuth();
    const { t } = useTranslation();
    const menuItems = [
        { icon: LayoutDashboard, label: t("dashboard"), href: "/" },
        { icon: Building2, label: t("properties"), href: "/properties" },
        { icon: Users, label: t("tenants"), href: "/tenants" },
        { icon: CreditCard, label: t("payments"), href: "/payments" },
    ];
    const toolsMenuItems = [
        { icon: Clock, label: t("reminders"), href: "/reminders" },
        { icon: BarChart3, label: t("reports"), href: "/reports" },
        { icon: FileText, label: t("documents"), href: "/documents" },
        { icon: Activity, label: t("logs"), href: "/activity-logs" },
    ];
    return (
        <div className={cn("flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300", className)}>
          {/* Logo Section */}
          <div className={cn("p-6 flex items-center gap-3 transition-all duration-300", collapsed ? "justify-center px-2 py-6" : "")}>
             <img 
                src={logo} 
                alt="Logo" 
                className={cn("object-contain transition-all duration-300", collapsed ? "w-8 h-8" : "w-10 h-10")}
             />
             {!collapsed && (
                <span className="font-heading font-bold text-xl tracking-tight animate-in fade-in duration-300">Dwello</span>
             )}
          </div>

          <ScrollArea className="flex-1 py-4 px-3 space-y-1">
            {/* Main Menu */}
            <div className="space-y-1">
                {menuItems.map((item) => {
                    const isActive = location === item.href;
                    return (
                        <Link key={item.href} href={item.href} onClick={onClose}>
                          <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer group relative", 
                                isActive ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/80",
                                collapsed ? "justify-center px-2" : ""
                                )}>
                            <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground")}/>
                            {!collapsed && <span>{item.label}</span>}
                            {/* Tooltip for collapsed state */}
                            {collapsed && (
                                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-border">
                                    {item.label}
                                </div>
                            )}
                          </div>
                        </Link>
                    );
                })}
            </div>

            {/* Tools Menu */}
            {!collapsed && <p className="px-4 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider mb-2 mt-6 animate-in fade-in duration-300">{t("tools") || "Tools"}</p>}
            {collapsed && <div className="h-4" />} {/* Spacer for collapsed mode */}
            
            <div className="space-y-1">
                {toolsMenuItems.map((item) => {
                    const isActive = location === item.href;
                    return (
                        <Link key={item.href} href={item.href} onClick={onClose}>
                          <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer group relative", 
                                isActive ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/80",
                                collapsed ? "justify-center px-2" : ""
                                )}>
                            <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground")}/>
                            {!collapsed && <span>{item.label}</span>}
                            {collapsed && (
                                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-border">
                                    {item.label}
                                </div>
                            )}
                          </div>
                        </Link>
                    );
                })}
            </div>
            
            {!collapsed && <p className="px-4 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider mb-2 mt-6 animate-in fade-in duration-300">{t("account")}</p>}
            {collapsed && <div className="h-4" />}
            
            <Link href="/settings" onClick={onClose}>
              <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer group relative", 
                    location === "/settings" ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/80",
                    collapsed ? "justify-center px-2" : ""
                )}>
                <Settings className={cn("w-5 h-5 shrink-0", location === "/settings" ? "text-white" : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground")}/>
                {!collapsed && t("settings")}
                {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-border">
                        {t("settings")}
                    </div>
                )}
              </div>
            </Link>
          </ScrollArea>

          <div className="p-4 border-t border-sidebar-border mt-auto">
            <div className={cn("flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50 mb-3", collapsed ? "justify-center p-0 bg-transparent mb-4" : "")}>
                <Avatar className="h-9 w-9 border border-sidebar-border">
                    <AvatarImage src={user?.avatar}/>
                    <AvatarFallback className="bg-primary text-white text-xs">{user?.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                {!collapsed && (
                    <div className="flex-1 min-w-0 animate-in fade-in duration-300">
                        <p className="text-sm font-medium truncate text-sidebar-foreground">{user?.name}</p>
                        <p className="text-xs text-sidebar-foreground/60 truncate capitalize">{user?.role}</p>
                    </div>
                )}
            </div>
            <Button variant="outline" className={cn("w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent border-sidebar-border", collapsed ? "justify-center px-2" : "")} onClick={logout}>
              <LogOut className={cn("w-4 h-4 shrink-0", !collapsed && "mr-2")}/>
              {!collapsed && t("logout") || "Logout"}
            </Button>
            

            {/* Toggle Button (Desktop Only) */}
            {onToggleCollapse && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-2 h-6 text-sidebar-foreground/40 hover:text-sidebar-foreground hidden md:flex" 
                    onClick={onToggleCollapse}
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </Button>
            )}

          </div>
        </div>
    );
}

export default function AppLayout({ children }) {
    const { t } = useTranslation();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const { toast } = useToast();

    // Load notifications
    useEffect(() => {
        const loadNotifications = async () => {
            const data = await api.getNotifications();
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.read).length);
        };
        loadNotifications();
        // Poll for updates every minute
        const interval = setInterval(loadNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleMarkAsRead = async (id) => {
        await api.markNotificationRead(id);
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleGenerateReport = async () => {
        try {
            await generateReport('properties'); // Default to properties report for the header button
            toast({ title: "Report Generated", description: "Properties report downloaded successfully." });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Could not generate report." });
        }
    };

    return (<div className="flex min-h-screen bg-gray-50/50 dark:bg-black">
      {/* Desktop Sidebar */}
      <aside className={cn("hidden md:block fixed inset-y-0 left-0 z-50 transition-all duration-300", isCollapsed ? "w-20" : "w-64")}>
        <SidebarContent collapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed(!isCollapsed)} />
      </aside>

      {/* Main Content */}
      <main className={cn("flex-1 flex flex-col min-h-screen transition-all duration-300", isCollapsed ? "md:ml-20" : "md:ml-64")}>
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
                    <Input placeholder={t('search_all_placeholder')} className="pl-9 bg-secondary/50 border-transparent focus-visible:bg-background focus-visible:border-primary/50 transition-all rounded-full h-9 text-sm"/>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-secondary">
                            <Bell className="w-5 h-5 text-muted-foreground"/>
                            {unreadCount > 0 && <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-background"></span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end">
                        <div className="p-4 font-medium border-b text-sm">{t('notifications')}</div>
                        <ScrollArea className="h-[300px]">
                            {notifications.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">{t('no_notifications') || "No notifications"}</div>
                            ) : (
                                notifications.map((notification) => (
                                    <div 
                                        key={notification.id} 
                                        className={cn("p-4 border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors", !notification.read && "bg-muted/30")}
                                        onClick={() => handleMarkAsRead(notification.id)}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={cn("text-sm font-medium", !notification.read && "text-primary")}>{notification.title}</span>
                                            <span className="text-[10px] text-muted-foreground">{notification.time}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                                    </div>
                                ))
                            )}
                        </ScrollArea>
                    </PopoverContent>
                </Popover>
            </div>
        </header>
        
        <div className="flex-1 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
        </div>
      </main>
    </div>);
}
