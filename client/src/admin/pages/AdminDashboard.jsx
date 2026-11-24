import React from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import { adminHref } from "../utils/msimamiziMode";
import StatCard from "../components/StatCard";
import RevenueChart from "../components/RevenueChart";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserCheck,
  Building2,
  Home,
  Layers,
  CheckCircle2,
  DoorOpen,
  CreditCard,
  TrendingUp,
  Award,
  AlertCircle,
  Ban,
  RefreshCw,
  Bell,
  Activity,
  Trash2,
  ChevronRight
} from "lucide-react";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: adminService.getDashboard,
    staleTime: 30_000
  });

  const clearDemoMutation = useMutation({
    mutationFn: () => adminService.clearDemoData(),
    onSuccess: (res) => {
      toast({
        title: "Demo Data Cleared",
        description: `Removed ${res.deletedProperties || 0} demo properties, ${res.deletedTenants || 0} demo tenants, and ${res.deletedPayments || 0} demo payments.`
      });
      queryClient.invalidateQueries();
    },
    onError: (err) => toast({ variant: "destructive", title: "Cleanup Failed", description: err.message })
  });

  const cleanupTestAccountsMutation = useMutation({
    mutationFn: () => adminService.cleanupTestAccounts(["kipsoidavis@gmail.com"]),
    onSuccess: (res) => {
      toast({
        title: "Dashboard Focused on kipsoidavis@gmail.com",
        description: `Cleared ${res.deletedUsers || 0} test user(s) & ${res.deletedProperties || 0} test properties.`
      });
      queryClient.invalidateQueries();
    },
    onError: (err) => toast({ variant: "destructive", title: "Cleanup Failed", description: err.message })
  });

  const m = data?.metrics || {};
  const charts = data?.charts || {};
  const feeds = data?.feeds || {};
  const currency = m.currency || "KES";
  const hasDemoLeftovers = (m.demoPropertiesRemaining || 0) > 0 || (m.demoUsersRemaining || 0) > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Platform Overview Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Live multi-tenant SaaS telemetry across landlords, properties, units, subscriptions, and verified payments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] uppercase border-[#00a99d]/40 text-[#0d2240] dark:text-[#00d4c8]">
            {m.gatewayProvider || "pesapal"} · {m.gatewayEnvironment || "sandbox"}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs cursor-pointer h-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Demo Data & Old Test Account Cleanup Prompt */}
      {(hasDemoLeftovers || (m.activeLandlords || 0) > 1) && (
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs">
              <p className="font-bold text-slate-900 dark:text-white">
                Workspace Hygiene &amp; Active Test Landlord Focus
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {hasDemoLeftovers
                  ? `${m.demoPropertiesRemaining || 0} demo property record(s) and ${m.demoUsersRemaining || 0} demo-mode account(s) are already filtered out. `
                  : ""}
                Keep only <strong>kipsoidavis@gmail.com</strong> (and Super Admin accounts) and purge older unused test accounts/properties permanently.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {hasDemoLeftovers && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={clearDemoMutation.isPending}
                  onClick={() => clearDemoMutation.mutate()}
                  className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  {clearDemoMutation.isPending ? "Clearing..." : "Purge Demo Data"}
                </Button>
              )}
              {(m.activeLandlords || 0) > 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={cleanupTestAccountsMutation.isPending}
                  onClick={() => cleanupTestAccountsMutation.mutate()}
                  className="text-xs text-[#0d2240] border-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
                  {cleanupTestAccountsMutation.isPending ? "Cleaning..." : "Keep Only kipsoidavis@gmail.com"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Notifications Banner */}
      {(feeds.systemNotifications || []).length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/20 shadow-xs">
          <CardContent className="p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
              <Bell className="w-4 h-4 text-amber-600" />
              <span>System Notifications ({feeds.systemNotifications.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {feeds.systemNotifications.map((n) => (
                <div
                  key={n.id}
                  className="bg-white/90 dark:bg-slate-900/70 border border-amber-200/70 dark:border-amber-800/50 rounded-lg px-3 py-2 text-xs"
                >
                  <p className="font-semibold text-slate-900 dark:text-white">{n.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{n.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 12 Core Platform KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
        <StatCard title="Registered Users" value={isLoading ? "…" : m.totalUsers || 0} icon={Users} accent="navy" />
        <StatCard title="Active Landlords" value={isLoading ? "…" : m.activeLandlords || 0} icon={UserCheck} accent="teal" />
        <StatCard title="Total Properties" value={isLoading ? "…" : m.totalProperties || 0} icon={Building2} accent="navy" />
        <StatCard title="Registered Tenants" value={isLoading ? "…" : m.totalTenants || 0} icon={Home} accent="teal" />

        <StatCard title="Total Units" value={isLoading ? "…" : m.totalUnits || 0} icon={Layers} accent="navy" />
        <StatCard title="Occupied Units" value={isLoading ? "…" : m.occupiedUnits || 0} icon={CheckCircle2} accent="teal" />
        <StatCard title="Vacant Units" value={isLoading ? "…" : m.vacantUnits || 0} icon={DoorOpen} accent="slate" />
        <StatCard
          title="Landlord Collections"
          value={`${currency} ${Number(m.landlordRentalRevenueTotal || 0).toLocaleString()}`}
          subtitle={`${m.landlordPaymentsCount || 0} settled · Gateway: ${m.totalPaymentsProcessed || 0} (${currency} ${Number(m.totalProcessedVolume || 0).toLocaleString()})`}
          icon={CreditCard}
          accent="teal"
        />

        <StatCard
          title="Platform SaaS Revenue"
          value={`${currency} ${Number(m.monthlyPlatformRevenue || 0).toLocaleString()}`}
          subtitle={`Lifetime Subs: ${currency} ${Number(m.totalPlatformRevenue || 0).toLocaleString()}`}
          icon={TrendingUp}
          accent="teal"
        />
        <StatCard title="Active Subscriptions" value={isLoading ? "…" : m.activeSubscriptions || 0} icon={Award} accent="navy" />
        <StatCard title="Expired Subscriptions" value={isLoading ? "…" : m.expiredSubscriptions || 0} icon={AlertCircle} accent="amber" />
        <StatCard title="Suspended Accounts" value={isLoading ? "…" : m.suspendedAccounts || 0} icon={Ban} accent="rose" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <RevenueChart
            title="Revenue Analytics (Last 6 Months)"
            subtitle="Production SaaS subscription revenue vs. tenant rent volume (KES)"
            type="bar"
            data={charts.revenueAnalytics || []}
          />
        </div>
        <RevenueChart
          title="Subscription Distribution"
          subtitle="Active, trial & grace-period accounts by plan"
          type="pie"
          data={charts.subscriptionDistribution || []}
        />
      </div>

      <RevenueChart
        title="User Registration Growth (Last 6 Months)"
        subtitle="New user signups across MakaziFlow"
        type="line"
        height={220}
        data={charts.userRegistrationGrowth || []}
      />

      {/* Feeds Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Activities */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00a99d]" /> Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 max-h-80 overflow-y-auto text-xs">
            {(feeds.recentActivities || []).length === 0 ? (
              <p className="text-slate-400 text-center py-6">No recent activity logged.</p>
            ) : (
              feeds.recentActivities.map((act) => (
                <div key={act._id} className="border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#0d2240] dark:text-[#00d4c8] truncate">{act.action}</span>
                    <Badge variant="outline" className="text-[9.5px] uppercase shrink-0">{act.source}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{act.description || act.actor}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {act.timestamp ? new Date(act.timestamp).toLocaleString("en-KE") : "—"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions (Grouped by Property) */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs rounded-xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#00a99d]" /> Transactions by Property
            </CardTitle>
            <button
              type="button"
              onClick={() => setLocation(adminHref("/payments"))}
              className="text-[11px] font-semibold text-[#00a99d] hover:underline cursor-pointer"
            >
              All Payments
            </button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto text-xs">
            {(feeds.propertyTransactions || []).length === 0 ? (
              <p className="text-slate-400 text-center py-6">No property transactions recorded yet.</p>
            ) : (
              feeds.propertyTransactions.map((p) => (
                <button
                  key={p.propertyId}
                  type="button"
                  onClick={() => setLocation(adminHref(`/payments?propertyId=${p.propertyId}`))}
                  className="w-full text-left border-b border-slate-100 dark:border-slate-800 pb-2.5 last:border-0 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md px-1.5 py-1 transition cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#00a99d] shrink-0" />
                      {p.propertyName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {p.landlordName} · {p.paymentCount || 0} {p.paymentCount === 1 ? "payment" : "payments"}
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-1.5">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {p.currency || "KES"} {Number(p.totalPaid || 0).toLocaleString()}
                      </p>
                      <Badge className="text-[9.5px] uppercase bg-[#00a99d] text-white">
                        Total Paid
                      </Badge>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* New User Registrations */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs rounded-xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00a99d]" /> New Registrations
            </CardTitle>
            <button
              type="button"
              onClick={() => setLocation(adminHref("/users"))}
              className="text-[11px] font-semibold text-[#00a99d] hover:underline cursor-pointer"
            >
              View All
            </button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto text-xs">
            {(feeds.newRegistrations || []).length === 0 ? (
              <p className="text-slate-400 text-center py-6">No registered landlords yet.</p>
            ) : (
              feeds.newRegistrations.map((u) => {
                const displayRole =
                  u.roleLabel ||
                  (["admin", "landlord"].includes(String(u.role || "").toLowerCase()) ? "Landlord" : u.role);
                return (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => setLocation(adminHref(`/users/${u._id}`))}
                    className="w-full text-left border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md px-1.5 py-1 transition cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{u.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-1.5">
                      <div>
                        <Badge variant="outline" className="text-[9.5px] bg-[#00a99d]/10 text-[#0d2240] dark:text-[#00d4c8] border-[#00a99d]/30">
                          {displayRole}
                        </Badge>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-KE") : "—"}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
