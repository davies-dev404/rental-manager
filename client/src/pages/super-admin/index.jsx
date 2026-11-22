import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import {
  ShieldCheck,
  Users,
  CreditCard,
  Building2,
  RefreshCw,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  FileSpreadsheet,
  Activity
} from "lucide-react";

export default function SuperAdminDashboardPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Transaction Filters
  const [filterProvider, setFilterProvider] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Edit Plan Dialog
  const [editingPlan, setEditingPlan] = useState(null);
  const [editPlanForm, setEditPlanForm] = useState({});

  // Override Landlord Dialog
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [overrideForm, setOverrideForm] = useState({ action: "activate", purchasedLimit: 25, reason: "" });

  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ["super-admin-overview"],
    queryFn: api.getSuperAdminOverview
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["super-admin-plans"],
    queryFn: api.getSuperAdminPlans
  });

  const { data: landlords = [] } = useQuery({
    queryKey: ["super-admin-landlords"],
    queryFn: api.getSuperAdminLandlords
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["super-admin-txns", filterProvider, filterStatus, filterCategory, filterStartDate, filterEndDate],
    queryFn: () =>
      api.getSuperAdminTransactions({
        environment: "production",
        provider: filterProvider,
        status: filterStatus,
        category: filterCategory,
        startDate: filterStartDate,
        endDate: filterEndDate
      })
  });

  const { data: sandboxTransactions = [] } = useQuery({
    queryKey: ["super-admin-sandbox-txns", filterProvider, filterStatus, filterCategory, filterStartDate, filterEndDate],
    queryFn: () =>
      api.getSuperAdminTransactions({
        environment: "sandbox",
        provider: filterProvider,
        status: filterStatus,
        category: filterCategory,
        startDate: filterStartDate,
        endDate: filterEndDate
      })
  });

  const { data: unmatched } = useQuery({
    queryKey: ["super-admin-unmatched"],
    queryFn: api.getSuperAdminUnmatched
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["super-admin-audit-logs"],
    queryFn: api.getSubscriptionAuditLogs
  });

  const { data: etimsSubmissions = [] } = useQuery({
    queryKey: ["etims-submissions"],
    queryFn: api.getEtimsSubmissions
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, payload }) => api.updateSuperAdminPlan(id, payload),
    onSuccess: () => {
      toast({ title: "Plan Updated", description: "Subscription pricing and limits updated." });
      setEditingPlan(null);
      queryClient.invalidateQueries({ queryKey: ["super-admin-plans"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Update Error", description: err.message })
  });

  const overrideMutation = useMutation({
    mutationFn: ({ id, payload }) => api.overrideLandlordSubscription(id, payload),
    onSuccess: () => {
      toast({ title: "Subscription Updated", description: "Landlord entitlement updated & logged." });
      setOverrideTarget(null);
      queryClient.invalidateQueries({ queryKey: ["super-admin-landlords"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-audit-logs"] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Override Failed", description: err.message })
  });

  const verifyTxnMutation = useMutation({
    mutationFn: (id) => api.verifySuperAdminTransaction(id),
    onSuccess: (res) => {
      toast({ title: "Verification Complete", description: `Transaction status: ${res.transaction?.status}` });
      queryClient.invalidateQueries({ queryKey: ["super-admin-txns"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-overview"] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Verification Error", description: err.message })
  });

  const reverseTxnMutation = useMutation({
    mutationFn: ({ id, reason }) => api.reverseSuperAdminTransaction(id, reason),
    onSuccess: () => {
      toast({ title: "Transaction Reversed", description: "Payment marked reversed and invoice reopened." });
      queryClient.invalidateQueries({ queryKey: ["super-admin-txns"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-overview"] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Reversal Error", description: err.message })
  });

  const expirySweepMutation = useMutation({
    mutationFn: api.processSubscriptionExpirations,
    onSuccess: (res) => {
      toast({
        title: "Expiry & Grace Sweep Complete",
        description: `Warnings: ${res.summary?.warningsSent}, Grace: ${res.summary?.movedToGrace}, Expired: ${res.summary?.expiredCount}`
      });
      queryClient.invalidateQueries({ queryKey: ["super-admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-landlords"] });
    }
  });

  const retryEtimsMutation = useMutation({
    mutationFn: (id) => api.retryEtimsSubmission(id),
    onSuccess: (res) => {
      toast({ title: "eTIMS Retry Processed", description: res.submission?.lastError || "Validated" });
      queryClient.invalidateQueries({ queryKey: ["etims-submissions"] });
    }
  });

  const exportTransactionsCSV = () => {
    const headers = ["Date", "Internal ID", "Account Ref", "Provider Ref", "Category", "Provider", "Channel", "Amount (KES)", "Status"];
    const rows = transactions.map((t) => [
      new Date(t.createdAt).toISOString(),
      t.internalTransactionId,
      t.accountReference,
      t.providerReference || "",
      t.paymentCategory,
      t.provider,
      t.paymentChannel,
      t.amount,
      t.status
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `makaziflow-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const m = overview?.metrics || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#00a99d]" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Super Admin SaaS &amp; Financial Control
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monitor real production SaaS revenue, separate gateway sandbox test transactions, unit allocations, and KRA eTIMS submissions.
            <Badge variant="outline" className="ml-2 text-[10px] uppercase">
              Gateway Env: {m.activeGatewayEnvironment || "sandbox"}
            </Badge>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => api.downloadSuperAdminReport({ environment: "production" })}
            className="text-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Production Report CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={expirySweepMutation.isPending}
            onClick={() => expirySweepMutation.mutate()}
            className="text-xs cursor-pointer"
          >
            Run Expiry Sweep
          </Button>
          <Button size="sm" variant="outline" onClick={() => refetchOverview()} className="text-xs cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: "overview", label: "Overview & Revenue" },
          { id: "landlords", label: `Landlords (${landlords.length})` },
          { id: "plans", label: "Subscription Plans" },
          { id: "transactions", label: `Production Payments (${transactions.length})` },
          { id: "sandbox", label: `Sandbox Tests (${sandboxTransactions.length})` },
          { id: "unmatched", label: `Unmatched (${(unmatched?.unmatchedCallbacks?.length || 0) + (unmatched?.unmatchedTxns?.length || 0)})` },
          { id: "etims", label: `KRA eTIMS (${etimsSubmissions.length})` },
          { id: "audit", label: "Audit Logs" }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg whitespace-nowrap transition cursor-pointer ${
              activeTab === tab.id
                ? "bg-[#0b1065] text-white"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {[
              { label: "Total Real Revenue", value: `KES ${Number(m.totalSubscriptionRevenue || 0).toLocaleString()}` },
              { label: "Monthly Revenue", value: `KES ${Number(m.monthlyRevenue || 0).toLocaleString()}` },
              { label: "Annual Revenue", value: `KES ${Number(m.annualRevenue || 0).toLocaleString()}` },
              { label: "Active Subscriptions", value: m.activeSubscriptions || 0 },
              { label: "Expired Subscriptions", value: m.expiredSubscriptions || 0 },
              { label: "Prod. Successful", value: m.successfulPayments || 0 },
              { label: "Prod. Pending", value: m.pendingPayments || 0 },
              { label: "Prod. Failed", value: m.failedPayments || 0 },
              { label: "Total Landlords", value: m.totalLandlords || 0 },
              { label: "Sandbox Test Volume (Excluded)", value: `KES ${Number(overview?.sandboxMetrics?.totalTestVolume || 0).toLocaleString()}` }
            ].map((kpi) => (
              <Card key={kpi.label} className="shadow-2xs">
                <CardContent className="p-4">
                  <p className="text-[11px] text-slate-500">{kpi.label}</p>
                  <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Subscription Revenue by Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview?.revenueByChannel || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#0b1065" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Subscription Revenue by Plan</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview?.revenueByPlan || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="plan" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#00a99d" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 2. LANDLORDS TAB */}
      {activeTab === "landlords" && (
        <Card className="shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-4">Landlord</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Units Used / Limit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Expiry</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {landlords.map((l) => (
                  <tr key={l._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <p className="font-bold">{l.name}</p>
                      <p className="text-[11px] text-slate-500">{l.email} · {l.phone || "—"}</p>
                    </td>
                    <td className="py-3 px-4 font-semibold">{l.entitlement?.planName || l.subscriptionTier || "Starter"}</td>
                    <td className="py-3 px-4">
                      {l.entitlement?.activeUnitCount || 0} / {l.entitlement?.isUnlimited ? "Unlimited" : (l.entitlement?.purchasedLimit || 5)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="text-[10px] uppercase">{l.entitlement?.status || "trial"}</Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {l.entitlement?.expiresAt ? new Date(l.entitlement.expiresAt).toLocaleDateString("en-KE") : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setOverrideTarget(l);
                          setOverrideForm({
                            action: "activate",
                            purchasedLimit: l.entitlement?.purchasedLimit || 10,
                            reason: ""
                          });
                        }}
                        className="h-7 text-[11px] cursor-pointer"
                      >
                        Manage / Override
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 3. PLANS TAB */}
      {activeTab === "plans" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <Card key={p._id} className="shadow-xs">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold">{p.name}</CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    {p.isCustomUnlimited ? "Custom Units" : `Max ${p.maxUnits} units`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded">
                  <span>Monthly: <strong>KES {Number(p.pricing?.monthly || 0).toLocaleString()}</strong></span>
                  <span>Quarterly: <strong>KES {Number(p.pricing?.quarterly || 0).toLocaleString()}</strong></span>
                  <span>Semi-Annual: <strong>KES {Number(p.pricing?.semi_annual || 0).toLocaleString()}</strong></span>
                  <span>Annual: <strong>KES {Number(p.pricing?.annual || 0).toLocaleString()}</strong></span>
                </div>
                <p className="text-slate-500">Discount: {p.discountPercent || 0}% · Trial: {p.trialDays}d · Grace: {p.gracePeriodDays}d</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingPlan(p);
                    setEditPlanForm({
                      maxUnits: p.maxUnits,
                      monthly: p.pricing?.monthly || 0,
                      quarterly: p.pricing?.quarterly || 0,
                      semi_annual: p.pricing?.semi_annual || 0,
                      annual: p.pricing?.annual || 0,
                      discountPercent: p.discountPercent || 0,
                      gracePeriodDays: p.gracePeriodDays || 7,
                      trialDays: p.trialDays || 14
                    });
                  }}
                  className="w-full h-8 text-xs cursor-pointer"
                >
                  <Pencil className="w-3 h-3 mr-1.5" /> Edit Plan Pricing &amp; Limits
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 4. TRANSACTIONS TAB */}
      {activeTab === "transactions" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border">
            <select value={filterProvider} onChange={(e) => setFilterProvider(e.target.value)} className="h-8 rounded border px-2 text-xs">
              <option value="all">All Providers</option>
              <option value="intasend">IntaSend</option>
              <option value="pesaflow">Pesaflow</option>
              <option value="equity_eazzybiz">Equity EazzyBiz</option>
              <option value="kcb_buni">KCB Buni</option>
              <option value="coop_bank">Co-op Bank</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-8 rounded border px-2 text-xs">
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="reversed">Reversed</option>
            </select>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="h-8 rounded border px-2 text-xs">
              <option value="all">All Categories</option>
              <option value="subscription">Subscription</option>
              <option value="unit_upgrade">Unit Upgrade</option>
              <option value="rent">Tenant Rent</option>
              <option value="combined">Combined Rental</option>
            </select>
            <Input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="h-8 text-xs" />
            <Input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="h-8 text-xs" />
            <Button size="sm" variant="outline" onClick={exportTransactionsCSV} className="h-8 text-xs cursor-pointer">
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
          </div>

          <Card className="shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b font-semibold text-slate-600">
                  <tr>
                    <th className="py-2.5 px-4">Reference</th>
                    <th className="py-2.5 px-4">Landlord / Payer</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Provider / Channel</th>
                    <th className="py-2.5 px-4 text-right">Amount (KES)</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map((t) => (
                    <tr key={t._id}>
                      <td className="py-2.5 px-4 font-mono">
                        <p className="font-bold">{t.accountReference}</p>
                        <p className="text-[10px] text-slate-500">{t.providerReference || t.internalTransactionId}</p>
                      </td>
                      <td className="py-2.5 px-4">
                        <p className="font-semibold">{t.landlordId?.name || t.customerName || "—"}</p>
                        <p className="text-[10px] text-slate-500">{t.tenantId?.name ? `Tenant: ${t.tenantId.name}` : t.landlordId?.email}</p>
                      </td>
                      <td className="py-2.5 px-4 capitalize">{t.paymentCategory}</td>
                      <td className="py-2.5 px-4">{t.provider} ({t.paymentChannel})</td>
                      <td className="py-2.5 px-4 text-right font-bold">{Number(t.amount).toLocaleString()}</td>
                      <td className="py-2.5 px-4">
                        <Badge className="text-[10px] uppercase">{t.status}</Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right space-x-1">
                        {t.status === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => verifyTxnMutation.mutate(t._id)} className="h-7 text-[10px] cursor-pointer">
                            Verify
                          </Button>
                        )}
                        {t.status === "paid" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reverseTxnMutation.mutate({ id: t._id, reason: "Admin authorized refund/reversal" })}
                            className="h-7 text-[10px] text-rose-600 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" /> Reverse
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 4B. SANDBOX TEST TRANSACTIONS TAB (STRICTLY SEPARATED FROM REAL REVENUE) */}
      {activeTab === "sandbox" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-100">
            <div>
              <strong>Sandbox Test Ledger</strong> — All sandbox transactions shown here are strictly isolated and{" "}
              <strong>excluded from real production revenue</strong>.
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => api.downloadSuperAdminReport({ environment: "sandbox" })}
              className="h-8 text-xs cursor-pointer bg-white text-slate-900"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Export Sandbox CSV
            </Button>
          </div>
          <Card className="shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b font-semibold text-slate-600">
                  <tr>
                    <th className="py-2.5 px-4">Merchant / Tracking Ref</th>
                    <th className="py-2.5 px-4">Landlord</th>
                    <th className="py-2.5 px-4">Plan / Category</th>
                    <th className="py-2.5 px-4">Method</th>
                    <th className="py-2.5 px-4 text-right">Amount (KES)</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sandboxTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No sandbox test transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    sandboxTransactions.map((t) => (
                      <tr key={t._id}>
                        <td className="py-2.5 px-4 font-mono">
                          <p className="font-bold">{t.accountReference}</p>
                          <p className="text-[10px] text-slate-500">{t.trackingId || t.providerReference || t.internalTransactionId}</p>
                        </td>
                        <td className="py-2.5 px-4">
                          <p className="font-semibold">{t.landlordId?.name || t.customerName || "—"}</p>
                          <p className="text-[10px] text-slate-500">{t.landlordId?.email || t.customerEmail}</p>
                        </td>
                        <td className="py-2.5 px-4 capitalize">
                          {t.subscriptionId?.planName || t.planCode || t.paymentCategory} {t.billingCycle ? `(${t.billingCycle})` : ""}
                        </td>
                        <td className="py-2.5 px-4">{t.provider} · {t.paymentMethodDetail || t.paymentChannel}</td>
                        <td className="py-2.5 px-4 text-right font-bold">{Number(t.amount).toLocaleString()}</td>
                        <td className="py-2.5 px-4">
                          <Badge variant="outline" className="text-[10px] uppercase">{t.status}</Badge>
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-500">
                          {t.createdAt ? new Date(t.createdAt).toLocaleString("en-KE") : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 5. UNMATCHED PAYMENTS TAB */}
      {activeTab === "unmatched" && (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Unmatched Callbacks &amp; Amount Mismatches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {(unmatched?.unmatchedCallbacks?.length || 0) === 0 && (unmatched?.unmatchedTxns?.length || 0) === 0 ? (
              <p className="text-slate-500 py-8 text-center">All incoming gateway payments are cleanly matched.</p>
            ) : (
              <>
                {(unmatched?.unmatchedCallbacks || []).map((cb) => (
                  <div key={cb._id} className="border rounded p-3 flex justify-between items-center">
                    <div>
                      <p className="font-mono font-bold">Ref: {cb.accountReference || cb.providerReference}</p>
                      <p className="text-slate-500">{cb.processingMessage} · Amount: {cb.currencyReceived} {cb.amountReceived}</p>
                    </div>
                    <Badge variant="outline">{cb.processingStatus}</Badge>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* 6. KRA eTIMS TAB */}
      {activeTab === "etims" && (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-bold">KRA eTIMS Tax Submissions Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {etimsSubmissions.length === 0 ? (
              <p className="text-slate-500 py-8 text-center">No eTIMS submissions attempted yet.</p>
            ) : (
              etimsSubmissions.map((sub) => (
                <div key={sub._id} className="border rounded p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="font-mono font-bold">Invoice: {sub.trdInvcNo} · TIN: {sub.tin}</p>
                    <p className="text-slate-500">
                      Status: <strong>{sub.status}</strong> · {sub.etimsReceiptNo ? `CU Receipt: ${sub.etimsReceiptNo}` : sub.lastError}
                    </p>
                  </div>
                  {sub.status === "failed" && (
                    <Button size="sm" variant="outline" onClick={() => retryEtimsMutation.mutate(sub._id)} className="h-7 text-xs cursor-pointer">
                      Retry Submission
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* 7. AUDIT LOGS TAB */}
      {activeTab === "audit" && (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Subscription &amp; Entitlement Audit Logs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {auditLogs.map((log) => (
              <div key={log._id} className="border rounded p-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#0b1065]">{log.action}</span>
                  <span className="text-slate-500 ml-2">
                    {log.landlordId?.email || ""} · {log.reason || JSON.stringify(log.newState)}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(log.createdAt).toLocaleString("en-KE")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Edit Plan Dialog */}
      <Dialog open={Boolean(editingPlan)} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Plan: {editingPlan?.name}</DialogTitle>
            <DialogDescription>Configure pricing (KES), unit allowance, discounts, and grace period.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-xs py-2">
            <div>
              <Label>Max Units</Label>
              <Input type="number" value={editPlanForm.maxUnits || 0} onChange={(e) => setEditPlanForm({ ...editPlanForm, maxUnits: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Monthly Price (KES)</Label>
              <Input type="number" value={editPlanForm.monthly || 0} onChange={(e) => setEditPlanForm({ ...editPlanForm, monthly: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Quarterly Price (KES)</Label>
              <Input type="number" value={editPlanForm.quarterly || 0} onChange={(e) => setEditPlanForm({ ...editPlanForm, quarterly: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Semi-Annual Price (KES)</Label>
              <Input type="number" value={editPlanForm.semi_annual || 0} onChange={(e) => setEditPlanForm({ ...editPlanForm, semi_annual: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Annual Price (KES)</Label>
              <Input type="number" value={editPlanForm.annual || 0} onChange={(e) => setEditPlanForm({ ...editPlanForm, annual: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Discount (%)</Label>
              <Input type="number" value={editPlanForm.discountPercent || 0} onChange={(e) => setEditPlanForm({ ...editPlanForm, discountPercent: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlan(null)}>Cancel</Button>
            <Button
              onClick={() =>
                updatePlanMutation.mutate({
                  id: editingPlan._id,
                  payload: {
                    maxUnits: editPlanForm.maxUnits,
                    discountPercent: editPlanForm.discountPercent,
                    pricing: {
                      monthly: editPlanForm.monthly,
                      quarterly: editPlanForm.quarterly,
                      semi_annual: editPlanForm.semi_annual,
                      annual: editPlanForm.annual
                    }
                  }
                })
              }
            >
              Save Plan Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override Landlord Dialog */}
      <Dialog open={Boolean(overrideTarget)} onOpenChange={() => setOverrideTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Subscription: {overrideTarget?.name}</DialogTitle>
            <DialogDescription>All overrides are logged to the immutable subscription audit log.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-xs py-2">
            <div>
              <Label>Action</Label>
              <select
                value={overrideForm.action}
                onChange={(e) => setOverrideForm({ ...overrideForm, action: e.target.value })}
                className="w-full h-9 rounded border px-2"
              >
                <option value="activate">Activate / Adjust Unit Allowance</option>
                <option value="suspend">Suspend Subscription</option>
              </select>
            </div>
            <div>
              <Label>Purchased Unit Limit</Label>
              <Input
                type="number"
                value={overrideForm.purchasedLimit}
                onChange={(e) => setOverrideForm({ ...overrideForm, purchasedLimit: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Audit Reason</Label>
              <Input
                placeholder="Reason for admin action..."
                value={overrideForm.reason}
                onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideTarget(null)}>Cancel</Button>
            <Button onClick={() => overrideMutation.mutate({ id: overrideTarget._id, payload: overrideForm })}>
              Apply &amp; Log Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
