import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { adminHref } from "../../utils/msimamiziMode";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import {
  Building2,
  Home,
  CheckCircle2,
  DoorOpen,
  Users,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Clock,
  Award,
  Activity,
  ShieldAlert,
  ChevronRight,
  Info
} from "lucide-react";
import { formatKES, formatDate, formatDateTime, statusBadgeClass } from "./formatters";

export default function OverviewTab({ userDetail, globalSearch = "", onSelectTab }) {
  const [, setLocation] = useLocation();
  const [growthView, setGrowthView] = useState("portfolio"); // "portfolio" | "revenue" | "occupancy"

  const u = userDetail?.user || {};
  const summary = userDetail?.summary || {};
  const health = userDetail?.health || { score: 0, category: "At Risk", breakdown: [], missingProfileFields: [], incompleteTasks: [] };
  const engagement = userDetail?.engagement || {};
  const growthSeries = userDetail?.growthSeries || [];
  const securityAlerts = userDetail?.securityAlerts || [];

  const q = globalSearch.trim().toLowerCase();

  const properties = useMemo(() => {
    const list = userDetail?.properties || [];
    if (!q) return list;
    return list.filter((p) => `${p.name} ${p.location} ${p.type}`.toLowerCase().includes(q));
  }, [userDetail?.properties, q]);

  const recentPayments = useMemo(() => {
    const list = userDetail?.payments || [];
    if (!q) return list;
    return list.filter((p) => `${p.invoiceNumber || ""} ${p.reference || ""} ${p.tenantName || ""} ${p.propertyName || ""} ${p.method || ""}`.toLowerCase().includes(q));
  }, [userDetail?.payments, q]);

  const recentTenants = useMemo(() => {
    const list = userDetail?.recentTenants || [];
    if (!q) return list;
    return list.filter((t) => `${t.name} ${t.email} ${t.phone} ${t.propertyName} ${t.unitNumber}`.toLowerCase().includes(q));
  }, [userDetail?.recentTenants, q]);

  const occupancyPie = [
    { name: "Occupied", value: summary.occupiedUnits || 0, color: "#00B8B0" },
    { name: "Vacant", value: summary.vacantUnits || 0, color: "#E9A23B" },
    ...(summary.maintenanceUnits > 0 ? [{ name: "Maintenance", value: summary.maintenanceUnits, color: "#738197" }] : [])
  ].filter((d) => d.value > 0);

  const kpiCards = [
    {
      label: "Total Properties",
      value: summary.propertyCount || 0,
      desc: "Registered properties",
      icon: Building2,
      color: "text-[#102B4C]",
      tab: "properties"
    },
    {
      label: "Total Rental Units",
      value: summary.unitCount || 0,
      desc: summary.declaredInitialUnits ? `Declared capacity: ${summary.declaredInitialUnits}` : "Registered units",
      icon: Home,
      color: "text-[#16385E]",
      tab: "properties"
    },
    {
      label: "Occupied Units",
      value: summary.occupiedUnits || 0,
      desc: `${summary.occupancyRate || 0}% actual occupancy`,
      icon: CheckCircle2,
      color: "text-[#16A36A]",
      tab: "properties"
    },
    {
      label: "Vacant Units",
      value: summary.vacantUnits || 0,
      desc: summary.maintenanceUnits ? `${summary.maintenanceUnits} in maintenance` : "Available to lease",
      icon: DoorOpen,
      color: "text-[#E9A23B]",
      tab: "properties"
    },
    {
      label: "Registered Tenants",
      value: summary.tenantCount || 0,
      desc: `${summary.activeTenantsCount || 0} active lease(s)`,
      icon: Users,
      color: "text-[#102B4C]",
      tab: "tenants"
    },
    {
      label: "Payments Recorded",
      value: summary.paymentsCount || 0,
      desc: `${summary.totalPaymentRecords || 0} total ledger entries`,
      icon: CreditCard,
      color: "text-[#16385E]",
      tab: "payments"
    },
    {
      label: "Revenue Generated",
      value: formatKES(summary.revenueGenerated || 0),
      desc:
        summary.revenueGrowthPct !== null && summary.revenueGrowthPct !== undefined
          ? `${summary.revenueGrowthPct >= 0 ? "+" : ""}${summary.revenueGrowthPct}% vs last month`
          : "Total confirmed collections",
      icon: TrendingUp,
      color: "text-[#00B8B0]",
      tab: "payments"
    },
    {
      label: "Outstanding Rent",
      value: formatKES(summary.outstandingRent || 0),
      desc: `Expected/mo: ${formatKES(summary.expectedMonthlyRent || 0)}`,
      icon: Clock,
      color: "text-[#E9A23B]",
      tab: "payments"
    },
    {
      label: "Overdue Rent",
      value: formatKES(summary.overdueRent || 0),
      desc: summary.overdueRent > 0 ? "Past due date invoices" : "No overdue invoices",
      icon: AlertTriangle,
      color: summary.overdueRent > 0 ? "text-[#DC4545]" : "text-[#738197]",
      tab: "payments"
    },
    {
      label: "Subscription Status",
      value: summary.planName || "Starter",
      desc:
        summary.daysRemaining !== null && summary.daysRemaining !== undefined
          ? `${String(summary.subscriptionStatus || "trial").replace(/_/g, " ")} · ${summary.daysRemaining >= 0 ? `${summary.daysRemaining}d left` : `${Math.abs(summary.daysRemaining)}d overdue`}`
          : String(summary.subscriptionStatus || "trial").replace(/_/g, " "),
      icon: Award,
      color: "text-[#102B4C]",
      tab: "subscriptions"
    }
  ];

  const healthColor =
    health.score >= 80
      ? "text-[#16A36A] bg-[#16A36A]"
      : health.score >= 60
        ? "text-[#00B8B0] bg-[#00B8B0]"
        : health.score >= 40
          ? "text-[#E9A23B] bg-[#E9A23B]"
          : "text-[#DC4545] bg-[#DC4545]";

  const healthTextColor = healthColor.split(" ")[0];
  const healthBarBg = healthColor.split(" ")[1];

  return (
    <div className="space-y-5">
      {/* ROW 2: 10 Analytics KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => onSelectTab?.(card.tab)}
              className="text-left bg-white dark:bg-slate-900 border border-[#E1E7EF] dark:border-slate-800 rounded-xl p-3.5 shadow-xs hover:border-[#00B8B0]/60 hover:shadow-sm transition cursor-pointer group"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-medium text-[#738197] truncate">{card.label}</span>
                <Icon className={`w-4 h-4 shrink-0 ${card.color} opacity-85 group-hover:scale-105 transition-transform`} />
              </div>
              <div className={`text-base sm:text-lg font-bold tracking-tight truncate ${card.label === "Revenue Generated" ? "text-[#00B8B0]" : "text-[#152238] dark:text-white"}`}>
                {card.value}
              </div>
              <p className="text-[10.5px] text-[#738197] mt-1 truncate capitalize">{card.desc}</p>
            </button>
          );
        })}
      </div>

      {/* LANDLORD GROWTH TRAJECTORY (12-Month Historical Growth) */}
      <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
        <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00B8B0]" />
              Landlord Growth Trajectory (12 Months)
            </CardTitle>
            <p className="text-[11px] text-[#738197]">
              Real historical progression of properties, rental units, tenants onboarded, occupancy rate, and collections.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-[#F4F6FA] dark:bg-slate-800 p-1 rounded-lg border border-[#E1E7EF] dark:border-slate-700 self-start">
            {[
              { id: "portfolio", label: "Portfolio Growth" },
              { id: "revenue", label: "Revenue Growth" },
              { id: "occupancy", label: "Occupancy %" }
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setGrowthView(mode.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                  growthView === mode.id
                    ? "bg-[#102B4C] text-white shadow-2xs"
                    : "text-[#738197] hover:text-[#152238]"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent style={{ height: 260 }}>
          {growthSeries.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-[#738197]">
              No historical growth data recorded yet.
            </div>
          ) : growthView === "portfolio" ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E7EF" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#738197" }} />
                <YAxis tick={{ fontSize: 11, fill: "#738197" }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Area type="monotone" dataKey="cumulativeUnits" name="Total Units" stroke="#102B4C" fill="#102B4C" fillOpacity={0.12} strokeWidth={2} />
                <Area type="monotone" dataKey="cumulativeTenants" name="Total Tenants" stroke="#00B8B0" fill="#00B8B0" fillOpacity={0.18} strokeWidth={2} />
                <Area type="monotone" dataKey="cumulativeProperties" name="Total Properties" stroke="#16A36A" fill="#16A36A" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : growthView === "revenue" ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E7EF" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#738197" }} />
                <YAxis tick={{ fontSize: 11, fill: "#738197" }} />
                <Tooltip formatter={(val) => formatKES(val)} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="revenue" name="Monthly Revenue (KES)" fill="#00B8B0" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E7EF" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#738197" }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "#738197" }} />
                <Tooltip formatter={(val) => `${val}%`} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Area type="monotone" dataKey="occupancyRate" name="Occupancy Rate (%)" stroke="#16385E" fill="#00B8B0" fillOpacity={0.18} strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ROW 3: Account Health Score | Account Engagement | Subscription Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Account Health Score */}
        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white flex items-center gap-1.5">
              Account Health Score
              <span title="Calculated transparently from profile completeness, verification, properties, tenants, payments, and recent activity.">
                <Info className="w-3.5 h-3.5 text-[#738197]" />
              </span>
            </CardTitle>
            <Badge variant="outline" className={`text-[11px] font-semibold ${statusBadgeClass(health.score >= 60 ? "active" : health.score >= 40 ? "warning" : "danger")}`}>
              {health.category}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-end justify-between">
              <div>
                <span className={`text-3xl font-extrabold ${healthTextColor}`}>{health.score}</span>
                <span className="text-[#738197] text-xs font-medium"> / 100</span>
              </div>
              <span className="text-[11px] text-[#738197]">
                Activity: <strong className="text-[#152238] dark:text-white">{health.activityLevel}</strong>
              </span>
            </div>
            <div className="w-full h-2 bg-[#F4F6FA] rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${healthBarBg}`} style={{ width: `${health.score}%` }} />
            </div>

            <div className="space-y-1.5 pt-1">
              {(health.breakdown || []).map((item) => (
                <div key={item.label} className="flex items-center justify-between text-[11px]">
                  <span className="text-[#738197]">{item.label}</span>
                  <span className="font-semibold text-[#152238] dark:text-slate-200">{item.score}/{item.max}</span>
                </div>
              ))}
            </div>

            {(health.missingProfileFields?.length > 0 || health.incompleteTasks?.length > 0) && (
              <div className="pt-2 border-t border-[#E1E7EF] space-y-1">
                {health.missingProfileFields?.length > 0 && (
                  <p className="text-[11px] text-[#738197]">
                    <strong className="text-[#152238] dark:text-slate-200">Missing Profile:</strong>{" "}
                    {health.missingProfileFields.join(", ")}
                  </p>
                )}
                {health.incompleteTasks?.length > 0 && (
                  <p className="text-[11px] text-[#B47412]">
                    <strong>Pending Tasks:</strong> {health.incompleteTasks.slice(0, 2).join(" · ")}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Engagement */}
        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white">Account Engagement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-lg bg-[#F4F6FA] dark:bg-slate-800/60">
                <span className="text-[10.5px] text-[#738197] block">Total Logins</span>
                <strong className="text-sm text-[#152238] dark:text-white">{engagement.totalLogins || 0}</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F4F6FA] dark:bg-slate-800/60">
                <span className="text-[10.5px] text-[#738197] block">Account Age</span>
                <strong className="text-sm text-[#152238] dark:text-white">{engagement.accountAgeDays || 0} day(s)</strong>
              </div>
            </div>
            <div className="space-y-2 pt-1 text-[11.5px]">
              <div className="flex justify-between">
                <span className="text-[#738197]">Last Login</span>
                <strong className="text-[#152238] dark:text-slate-200">{formatDateTime(engagement.lastLoginAt)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#738197]">Last Active</span>
                <strong className="text-[#152238] dark:text-slate-200">{formatDateTime(engagement.lastActiveAt)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#738197]">30-Day Activity</span>
                <strong className="text-[#152238] dark:text-slate-200">
                  {engagement.recentActivity30d || 0} events ({engagement.activityFrequency || "Dormant"})
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#738197]">Last Property Added</span>
                <strong className="text-[#152238] dark:text-slate-200">{formatDate(engagement.lastPropertyRegisteredAt)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#738197]">Last Payment Logged</span>
                <strong className="text-[#152238] dark:text-slate-200">{formatDate(engagement.lastPaymentRecordedAt)}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Information + Business Profile Snapshot */}
        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-[#152238] dark:text-white">Subscription &amp; Business</CardTitle>
              <Badge variant="outline" className={`text-[10.5px] capitalize ${statusBadgeClass(summary.subscriptionStatus)}`}>
                {String(summary.subscriptionStatus || "trial").replace(/_/g, " ")}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-[11.5px]">
              <div className="flex justify-between">
                <span className="text-[#738197]">Current Plan</span>
                <strong className="text-[#102B4C] dark:text-white">{summary.planName || "Starter"}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#738197]">Unit Entitlement</span>
                <strong className="text-[#152238] dark:text-slate-200">
                  {summary.unitCount || 0} / {userDetail?.entitlement?.isUnlimited ? "Unlimited" : (userDetail?.entitlement?.purchasedLimit || "—")}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#738197]">Days Remaining</span>
                <strong className={summary.daysRemaining !== null && summary.daysRemaining <= 7 ? "text-[#DC4545]" : "text-[#152238] dark:text-slate-200"}>
                  {summary.daysRemaining === null || summary.daysRemaining === undefined
                    ? "—"
                    : summary.daysRemaining >= 0
                      ? `${summary.daysRemaining} days`
                      : `Expired ${Math.abs(summary.daysRemaining)}d ago`}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#738197]">KRA PIN</span>
                <strong className="text-[#152238] dark:text-slate-200">{u.kraPin || "Not provided"}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#738197]">Address</span>
                <strong className="text-[#152238] dark:text-slate-200 truncate max-w-[170px]">{u.address || "Not provided"}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#738197]">SaaS Payments Paid</span>
                <strong className="text-[#00B8B0]">
                  {formatKES(summary.saasSubscriptionPaidTotal || 0)} ({summary.saasSubscriptionPaymentsCount || 0})
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#738197]">Support &amp; Activity</span>
                <strong className="text-[#152238] dark:text-slate-200">
                  {summary.supportTicketCount || 0} ticket(s) · {summary.accountActivityCount || 0} events (30d)
                </strong>
              </div>
              {userDetail?.businessSettings && (
                <div className="flex justify-between">
                  <span className="text-[#738197]">M-Pesa Mode</span>
                  <strong className="text-[#152238] dark:text-slate-200">
                    {userDetail.businessSettings.mpesaType || "Paybill"}{" "}
                    {userDetail.businessSettings.paybillAccount ? `(${userDetail.businessSettings.paybillAccount})` : ""}
                  </strong>
                </div>
              )}
            </CardContent>
          </div>
          <div className="px-6 pb-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSelectTab?.("subscriptions")}
              className="w-full h-8 text-xs border-[#E1E7EF] text-[#102B4C] hover:bg-[#F4F6FA] cursor-pointer"
            >
              Manage Subscription <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </Card>
      </div>

      {/* ROW 4: LEFT (Property Portfolio Summary + Occupancy Chart) | RIGHT (Financial Summary + Revenue Trend) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-[#152238] dark:text-white">Property Portfolio &amp; Occupancy</CardTitle>
              <p className="text-[11px] text-[#738197]">
                Actual registered units ({summary.unitCount || 0}) vs declared capacity ({summary.declaredInitialUnits || 0})
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab?.("properties")}
              className="text-[11px] font-semibold text-[#00B8B0] hover:underline cursor-pointer"
            >
              Full Portfolio
            </button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div style={{ height: 190 }}>
              {occupancyPie.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[#738197]">No units registered yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={occupancyPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3}>
                      {occupancyPie.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-[#F4F6FA] dark:bg-slate-800/60 flex justify-between">
                <span className="text-[#738197]">Occupancy Rate</span>
                <strong className="text-[#00B8B0]">{summary.occupancyRate || 0}%</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F4F6FA] dark:bg-slate-800/60 flex justify-between">
                <span className="text-[#738197]">Occupied / Registered</span>
                <strong className="text-[#152238] dark:text-white">{summary.occupiedUnits || 0} / {summary.unitCount || 0}</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F4F6FA] dark:bg-slate-800/60 flex justify-between">
                <span className="text-[#738197]">Expected Monthly Rent</span>
                <strong className="text-[#152238] dark:text-white">{formatKES(summary.expectedMonthlyRent || 0)}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-[#152238] dark:text-white">Financial Summary &amp; Revenue Trend</CardTitle>
              <p className="text-[11px] text-[#738197]">
                Collected {formatKES(summary.revenueGenerated || 0)} · Outstanding {formatKES(summary.outstandingRent || 0)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab?.("payments")}
              className="text-[11px] font-semibold text-[#00B8B0] hover:underline cursor-pointer"
            >
              Payment Intelligence
            </button>
          </CardHeader>
          <CardContent style={{ height: 190 }}>
            {growthSeries.every((g) => g.revenue === 0) ? (
              <div className="h-full flex items-center justify-center text-xs text-[#738197]">
                No revenue transactions recorded in the last 12 months.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growthSeries.slice(-6)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1E7EF" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#738197" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#738197" }} />
                  <Tooltip formatter={(v) => formatKES(v)} />
                  <Bar dataKey="revenue" name="Revenue (KES)" fill="#102B4C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROW 5: LEFT (Registered Properties Table) | RIGHT (Recent Payment Transactions) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#00B8B0]" /> Registered Properties ({properties.length})
            </CardTitle>
            <button type="button" onClick={() => onSelectTab?.("properties")} className="text-[11px] font-semibold text-[#00B8B0] hover:underline cursor-pointer">
              Manage All
            </button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto text-xs">
            {properties.length === 0 ? (
              <p className="text-[#738197] py-6 text-center">No properties registered under this landlord.</p>
            ) : (
              properties.slice(0, 6).map((p) => (
                <div key={p._id} className="border border-[#E1E7EF] dark:border-slate-800 rounded-lg p-2.5 flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-[#152238] dark:text-white truncate">
                      {p.name} <span className="font-normal text-[#738197]">· {p.location}</span>
                    </p>
                    <p className="text-[11px] text-[#738197]">
                      {p.occupiedUnits || 0}/{p.unitCount || 0} occupied ({p.occupancyRate || 0}%) · {p.tenantCount || 0} tenant(s) · {formatKES(p.revenueGenerated || 0)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocation(adminHref(`/properties/${p._id}`))}
                    className="h-7 text-[11px] shrink-0 border-[#E1E7EF] cursor-pointer"
                  >
                    Open
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#00B8B0]" /> Recent Payment Transactions ({recentPayments.length})
            </CardTitle>
            <button type="button" onClick={() => onSelectTab?.("payments")} className="text-[11px] font-semibold text-[#00B8B0] hover:underline cursor-pointer">
              View All
            </button>
          </CardHeader>
          <CardContent className="space-y-1.5 max-h-72 overflow-y-auto text-xs">
            {recentPayments.length === 0 ? (
              <p className="text-[#738197] py-6 text-center">No collections recorded yet.</p>
            ) : (
              recentPayments.slice(0, 8).map((pay) => (
                <div key={pay._id} className="border border-[#E1E7EF] dark:border-slate-800 rounded-lg p-2.5 flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#152238] dark:text-white truncate">
                      {pay.invoiceNumber || pay.reference || pay.type || "Rent Payment"}
                      {pay.unitId?.unitNumber ? ` · Unit ${pay.unitId.unitNumber}` : ""}
                    </p>
                    <p className="text-[10.5px] text-[#738197] truncate">
                      {pay.tenantName !== "—" ? `${pay.tenantName} · ` : ""}
                      {pay.method} · {formatDate(pay.date || pay.createdAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-[#152238] dark:text-white">{formatKES(pay.amount)}</p>
                    <Badge variant="outline" className={`text-[9.5px] uppercase ${statusBadgeClass(pay.status)}`}>
                      {pay.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROW 6: Recent Tenant Registrations | Subscription Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00B8B0]" /> Recent Tenant Registrations
            </CardTitle>
            <button type="button" onClick={() => onSelectTab?.("tenants")} className="text-[11px] font-semibold text-[#00B8B0] hover:underline cursor-pointer">
              Tenant Directory
            </button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-60 overflow-y-auto text-xs">
            {recentTenants.length === 0 ? (
              <p className="text-[#738197] py-6 text-center">No tenants registered yet.</p>
            ) : (
              recentTenants.map((t) => (
                <div key={t._id} className="border-b border-[#E1E7EF] dark:border-slate-800 pb-2 last:border-0 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#152238] dark:text-white truncate">{t.name}</p>
                    <p className="text-[11px] text-[#738197] truncate">
                      {t.propertyName} · Unit {t.unitNumber} · {t.phone || t.email || "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline" className={`text-[9.5px] capitalize ${statusBadgeClass(t.status)}`}>
                      {t.status}
                    </Badge>
                    <p className="text-[10px] text-[#738197] mt-0.5">{formatDate(t.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-[#00B8B0]" /> Subscription Activity
            </CardTitle>
            <button type="button" onClick={() => onSelectTab?.("subscriptions")} className="text-[11px] font-semibold text-[#00B8B0] hover:underline cursor-pointer">
              Billing &amp; Plans
            </button>
          </CardHeader>
          <CardContent className="space-y-2 max-h-60 overflow-y-auto text-xs">
            {(userDetail?.subscriptionAudits || []).length === 0 ? (
              <p className="text-[#738197] py-6 text-center">No subscription change events recorded yet.</p>
            ) : (
              userDetail.subscriptionAudits.map((ev) => (
                <div key={ev._id} className="border-b border-[#E1E7EF] dark:border-slate-800 pb-2 last:border-0 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#152238] dark:text-white uppercase text-[11px]">
                      {String(ev.action || "").replace(/_/g, " ")}
                    </p>
                    <p className="text-[11px] text-[#738197] truncate">{ev.reason || "Automated plan lifecycle update"}</p>
                  </div>
                  <span className="text-[10.5px] text-[#738197] shrink-0">{formatDateTime(ev.createdAt)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROW 7: Recent Account Activity Timeline | Security Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00B8B0]" /> Recent Account Activity ({userDetail?.activityLogs?.length || 0})
            </CardTitle>
            <button type="button" onClick={() => onSelectTab?.("security")} className="text-[11px] font-semibold text-[#00B8B0] hover:underline cursor-pointer">
              Full Audit Timeline
            </button>
          </CardHeader>
          <CardContent className="space-y-1.5 max-h-60 overflow-y-auto text-xs">
            {(userDetail?.activityLogs || []).length === 0 ? (
              <p className="text-[#738197] py-6 text-center">No recent account activity recorded.</p>
            ) : (
              userDetail.activityLogs.slice(0, 12).map((a) => (
                <div key={a._id} className="border-b border-[#E1E7EF] dark:border-slate-800 py-1.5 last:border-0 flex justify-between gap-3">
                  <span className="text-[#152238] dark:text-slate-200 truncate">
                    <strong>{a.action}</strong> — {a.description}
                  </span>
                  <span className="text-[#738197] text-[10.5px] shrink-0">{formatDateTime(a.timestamp)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#E9A23B]" /> Security Alerts ({securityAlerts.length})
            </CardTitle>
            <button type="button" onClick={() => onSelectTab?.("security")} className="text-[11px] font-semibold text-[#00B8B0] hover:underline cursor-pointer">
              Inspect
            </button>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {securityAlerts.length === 0 ? (
              <div className="p-3 rounded-lg bg-[#16A36A]/10 border border-[#16A36A]/25 text-[#16A36A] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>No active security warnings for this account.</span>
              </div>
            ) : (
              securityAlerts.map((al, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border text-xs ${
                    al.severity === "danger"
                      ? "bg-[#DC4545]/10 border-[#DC4545]/25 text-[#DC4545]"
                      : "bg-[#E9A23B]/10 border-[#E9A23B]/30 text-[#B47412]"
                  }`}
                >
                  <p className="font-bold">{al.title}</p>
                  <p className="text-[11px] mt-0.5 opacity-90">{al.description}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
