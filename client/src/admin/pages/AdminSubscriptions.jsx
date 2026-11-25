import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import { adminHref } from "../utils/msimamiziMode";
import DataTable from "../components/DataTable";
import StatCard from "../components/StatCard";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  Layers,
  Award,
  AlertCircle,
  XCircle,
  CreditCard,
  Plus,
  Pencil,
  RefreshCw,
  TrendingUp,
  Clock,
  Receipt,
  CalendarPlus,
  UserCheck
} from "lucide-react";

export default function AdminSubscriptions() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-subscriptions", statusFilter, planFilter, page],
    queryFn: () => adminService.getSubscriptions({ status: statusFilter, planCode: planFilter, page, limit: 15 })
  });

  const sweepMutation = useMutation({
    mutationFn: adminService.runExpirySweep,
    onSuccess: (res) => {
      toast({
        title: "Expiry Sweep Complete",
        description: `Warnings: ${res.summary?.warningsSent || 0}, Grace: ${res.summary?.movedToGrace || 0}, Expired: ${res.summary?.expiredCount || 0}`
      });
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    }
  });

  const extendTrialMutation = useMutation({
    mutationFn: ({ landlordId, extraDays }) =>
      adminService.extendTrial(landlordId, { extraDays, reason: `Super Admin extended trial by ${extraDays} days` }),
    onSuccess: (res) => {
      toast({
        title: "Trial Extended",
        description: `Extended until ${new Date(res.expiryDate).toLocaleDateString("en-KE")}.`
      });
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Failed", description: err.message })
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({ subId, action }) =>
      adminService.manageSubscriptionLifecycle(subId, { action, reason: `Subscription ${action} from control centre` }),
    onSuccess: () => {
      toast({ title: "Subscription Updated", description: "Lifecycle state and unit entitlements synced." });
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Action Failed", description: err.message })
  });

  const summary = data?.summary || {};
  const plans = data?.plans || [];
  const alerts = data?.alerts || {};
  const billingInvoices = data?.billingInvoices || [];

  const columns = [
    {
      key: "landlord",
      label: "Subscriber / Landlord",
      render: (s) =>
        s.landlordId?._id ? (
          <button
            type="button"
            onClick={() => setLocation(adminHref(`/users/${s.landlordId._id}`))}
            className="text-left group cursor-pointer"
          >
            <p className="font-bold text-[#0d2240] dark:text-[#00d4c8] group-hover:underline">
              {s.landlordId?.name || "—"}
            </p>
            <p className="text-[11px] text-slate-500">{s.landlordId?.email}</p>
          </button>
        ) : (
          <span>—</span>
        )
    },
    {
      key: "plan",
      label: "Plan & Cycle",
      render: (s) => (
        <div>
          <p className="font-semibold">{s.planName}</p>
          <p className="text-[10.5px] text-slate-500 capitalize">
            {s.billingCycle} · {s.isCustomUnlimited ? "Unlimited" : `${s.purchasedUnits} units`}
          </p>
        </div>
      )
    },
    {
      key: "price",
      label: "Amount",
      render: (s) => <span className="font-bold">{s.currency || "KES"} {Number(s.priceAmount || 0).toLocaleString()}</span>
    },
    {
      key: "status",
      label: "Status",
      render: (s) => (
        <Badge
          variant="outline"
          className={`text-[10px] uppercase ${
            ["active", "trial"].includes(s.status)
              ? "bg-[#00a99d]/15 text-[#00a99d] border-[#00a99d]/30"
              : s.status === "expired" || s.status === "suspended"
              ? "bg-rose-100 text-rose-700 border-rose-200"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {s.status.replace(/_/g, " ")}
        </Badge>
      )
    },
    {
      key: "dates",
      label: "Renewal / Expiry",
      render: (s) => (
        <span className="text-slate-500">
          {s.expiryDate ? new Date(s.expiryDate).toLocaleDateString("en-KE") : "—"}
        </span>
      )
    },
    {
      key: "actions",
      label: "Lifecycle Actions",
      align: "right",
      render: (s) =>
        s.landlordId?._id && (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={extendTrialMutation.isPending}
              onClick={() => extendTrialMutation.mutate({ landlordId: s.landlordId._id, extraDays: 7 })}
              className="h-7 px-2 text-[10.5px] cursor-pointer"
              title="Extend by 7 days"
            >
              +7d Trial
            </Button>
            {s.status === "suspended" || s.status === "expired" || s.status === "cancelled" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={lifecycleMutation.isPending}
                onClick={() => lifecycleMutation.mutate({ subId: s._id, action: "activate" })}
                className="h-7 px-2 text-[10.5px] text-emerald-700 cursor-pointer"
              >
                Activate
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={lifecycleMutation.isPending}
                onClick={() => lifecycleMutation.mutate({ subId: s._id, action: "suspend" })}
                className="h-7 px-2 text-[10.5px] text-rose-700 cursor-pointer"
              >
                Suspend
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocation(adminHref(`/subscriptions/override/${s.landlordId._id}`))}
              className="h-7 px-2.5 text-[10.5px] cursor-pointer"
            >
              Override
            </Button>
          </div>
        )
    }
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Subscription &amp; Billing Control Centre</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track SaaS recurring revenue (MRR/ARR), trial conversions, expiring accounts, billing invoices, and configurable tiers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={sweepMutation.isPending} onClick={() => sweepMutation.mutate()} className="text-xs cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${sweepMutation.isPending ? "animate-spin" : ""}`} />
            Run Expiry Sweep
          </Button>
          <Button
            size="sm"
            onClick={() => setLocation(adminHref("/subscriptions/plans/new"))}
            className="bg-[#00a99d] hover:bg-[#008f85] text-white text-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Plan
          </Button>
        </div>
      </div>

      {/* SaaS Subscription KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Monthly Recurring Revenue (MRR)" value={`KES ${Number(summary.mrr || 0).toLocaleString()}`} subtitle={`ARR: KES ${Number(summary.arr || 0).toLocaleString()}`} icon={TrendingUp} accent="teal" />
        <StatCard title="Total SaaS Revenue" value={`KES ${Number(summary.totalSubscriptionRevenue || 0).toLocaleString()}`} subtitle={`${summary.paidSubscriptionCount || 0} settled txns`} icon={CreditCard} accent="navy" />
        <StatCard title="Active Subscriptions" value={summary.active || 0} subtitle={`${summary.trial || 0} on trial`} icon={Award} accent="teal" />
        <StatCard title="Expiring Within 14 Days" value={summary.expiringSoonCount || 0} subtitle={`${summary.gracePeriod || 0} in grace period`} icon={Clock} accent={summary.expiringSoonCount > 0 ? "amber" : "teal"} />
        <StatCard title="Trial Conversion Rate" value={`${summary.trialConversionRate || 0}%`} subtitle="Paid vs trialed landlords" icon={CheckIconFallback} accent="navy" />
        <StatCard title="Churn Rate" value={`${summary.churnRate || 0}%`} subtitle={`${summary.expired || 0} exp · ${summary.cancelled || 0} canc`} icon={XCircle} accent={summary.churnRate > 15 ? "rose" : "amber"} />
      </div>

      {/* Section Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 overflow-x-auto shadow-xs">
        <nav className="flex items-center gap-1 min-w-max">
          {[
            { id: "overview", label: "Alerts & Plans Overview", icon: Layers },
            { id: "subscribers", label: "Subscribers & Lifecycle Actions", icon: Award },
            { id: "invoices", label: `Billing & Subscription Invoices (${billingInvoices.length})`, icon: Receipt }
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  active
                    ? "bg-[#0d2240] text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? "text-[#00d4c8]" : ""}`} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* Actionable Subscription Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" /> Expiring Within 14 Days ({alerts.expiring14Days?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto text-xs">
                {(alerts.expiring14Days || []).length === 0 ? (
                  <p className="text-slate-400 text-center py-4">No active/trial subscriptions expiring in the next 14 days.</p>
                ) : (
                  alerts.expiring14Days.map((sub) => (
                    <div key={sub._id} className="p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => sub.landlordId?._id && setLocation(adminHref(`/users/${sub.landlordId._id}`))}
                          className="font-semibold text-[#0d2240] dark:text-[#00d4c8] hover:underline truncate block cursor-pointer"
                        >
                          {sub.landlordId?.name || "Landlord"}
                        </button>
                        <p className="text-[11px] text-slate-500">
                          {sub.planName} ({sub.status}) · {new Date(sub.expiryDate).toLocaleDateString("en-KE")}
                        </p>
                      </div>
                      {sub.landlordId?._id && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={extendTrialMutation.isPending}
                          onClick={() => extendTrialMutation.mutate({ landlordId: sub.landlordId._id, extraDays: 7 })}
                          className="h-7 px-2 text-[10.5px] shrink-0 cursor-pointer"
                        >
                          <CalendarPlus className="w-3 h-3 mr-1" /> +7d
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-600" /> Unpaid Subscription Invoices ({alerts.unpaidInvoices?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto text-xs">
                {(alerts.unpaidInvoices || []).length === 0 ? (
                  <p className="text-slate-400 text-center py-4">Zero open or unpaid subscription invoices.</p>
                ) : (
                  alerts.unpaidInvoices.map((inv) => (
                    <div key={inv._id} className="p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-mono font-bold">{inv.invoiceNumber}</p>
                        <p className="text-[11px] text-slate-500">
                          {inv.landlordId?.name || "Landlord"} · Due KES {Number(inv.balanceDue || inv.totalAmount || 0).toLocaleString()}
                        </p>
                      </div>
                      {inv.landlordId?._id && (
                        <Button size="sm" variant="ghost" onClick={() => setLocation(adminHref(`/users/${inv.landlordId._id}`))} className="h-7 px-2 text-[11px] cursor-pointer">
                          <UserCheck className="w-3.5 h-3.5 text-[#00a99d]" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" /> Failed Renewal Attempts ({alerts.failedRenewals?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto text-xs">
                {(alerts.failedRenewals || []).length === 0 ? (
                  <p className="text-slate-400 text-center py-4">No failed SaaS renewal payments recently.</p>
                ) : (
                  alerts.failedRenewals.map((t) => (
                    <div key={t._id} className="p-2 rounded-lg border border-rose-100 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{t.landlordId?.name || "Landlord"}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          KES {Number(t.amount || 0).toLocaleString()} · {t.failureReason || "Failed payment"}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setLocation(adminHref(`/payments/${t._id}`))} className="h-7 px-2 text-[10.5px] cursor-pointer">
                        Inspect
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Configurable Plans */}
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#00a99d]" /> Configured Subscription Plans ({plans.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((p) => (
                <Card key={p._id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-sm font-bold">{p.name}</CardTitle>
                      <p className="text-[10.5px] font-mono text-slate-400">code: {p.code}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {p.isCustomUnlimited ? "Unlimited Units" : `Max ${p.maxUnits} units`}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-2.5 text-xs">
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg">
                      <span>Monthly: <strong>KES {Number(p.pricing?.monthly || 0).toLocaleString()}</strong></span>
                      <span>Quarterly: <strong>KES {Number(p.pricing?.quarterly || 0).toLocaleString()}</strong></span>
                      <span>Semi-Annual: <strong>KES {Number(p.pricing?.semi_annual || 0).toLocaleString()}</strong></span>
                      <span>Annual: <strong>KES {Number(p.pricing?.annual || 0).toLocaleString()}</strong></span>
                    </div>
                    {(p.features || []).length > 0 && (
                      <p className="text-[11px] text-slate-500 line-clamp-2">Features: {p.features.join(" · ")}</p>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLocation(adminHref(`/subscriptions/plans/${p._id}/edit`))}
                      className="w-full h-8 text-xs cursor-pointer"
                    >
                      <Pencil className="w-3 h-3 mr-1.5" /> Edit Plan
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "subscribers" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2.5 text-xs bg-white dark:bg-slate-800">
              <option value="all">All Subscription Statuses</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="grace_period">Grace Period</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
              <option value="suspended">Suspended</option>
            </select>
            <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2.5 text-xs bg-white dark:bg-slate-800">
              <option value="all">All Plans</option>
              {plans.map((p) => <option key={p._id} value={p.code}>{p.name}</option>)}
            </select>
          </div>

          <DataTable
            columns={columns}
            data={data?.subscriptions || []}
            isLoading={isLoading}
            pagination={data?.pagination}
            onPageChange={setPage}
            emptyMessage="No landlord subscriptions match your filters."
          />
        </div>
      )}

      {activeTab === "invoices" && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">SaaS Subscription Billing Invoices</CardTitle>
            <CardDescription className="text-xs">
              Direct view of AfriNexTech subscription tax invoices, settlement state, and KRA eTIMS validation status.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {billingInvoices.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No subscription invoices issued yet.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase text-slate-500">
                    <th className="text-left py-2">Invoice #</th>
                    <th className="text-left py-2">Landlord</th>
                    <th className="text-right py-2">Total</th>
                    <th className="text-left py-2 pl-3">Status</th>
                    <th className="text-left py-2">eTIMS</th>
                    <th className="text-right py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {billingInvoices.map((inv) => (
                    <tr key={inv._id} className="border-b border-slate-100 dark:border-slate-800/60">
                      <td className="py-2 font-mono font-bold text-[#0d2240] dark:text-[#00d4c8]">{inv.invoiceNumber}</td>
                      <td className="py-2">
                        {inv.landlordId?._id ? (
                          <button
                            type="button"
                            onClick={() => setLocation(adminHref(`/users/${inv.landlordId._id}`))}
                            className="font-semibold hover:underline cursor-pointer"
                          >
                            {inv.landlordId.name}
                          </button>
                        ) : (
                          <span>{inv.customerName || "—"}</span>
                        )}
                      </td>
                      <td className="py-2 text-right font-bold tabular-nums">
                        {inv.currency || "KES"} {Number(inv.totalAmount || 0).toLocaleString()}
                      </td>
                      <td className="py-2 pl-3">
                        <Badge variant="outline" className="text-[10px] uppercase">{inv.status}</Badge>
                      </td>
                      <td className="py-2">
                        <Badge variant="outline" className="text-[10px] capitalize">{String(inv.etimsStatus || "not_submitted").replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="py-2 text-right text-slate-500">
                        {inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString("en-KE") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CheckIconFallback(props) {
  return <Award {...props} />;
}
