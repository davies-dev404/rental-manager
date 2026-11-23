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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Layers, Award, AlertCircle, XCircle, CreditCard, Plus, Pencil, RefreshCw } from "lucide-react";

export default function AdminSubscriptions() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const summary = data?.summary || {};
  const plans = data?.plans || [];

  const columns = [
    {
      key: "landlord",
      label: "Subscriber / Landlord",
      render: (s) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{s.landlordId?.name || "—"}</p>
          <p className="text-[11px] text-slate-500">{s.landlordId?.email}</p>
        </div>
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
              : s.status === "expired"
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
      label: "Actions",
      align: "right",
      render: (s) =>
        s.landlordId?._id && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLocation(adminHref(`/subscriptions/override/${s.landlordId._id}`))}
            className="h-7 px-2.5 text-[11px] cursor-pointer"
          >
            Override
          </Button>
        )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Subscription Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure SaaS tiers, billing intervals, unit allowances, renewals, and subscription revenue.
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Subscription Revenue" value={`KES ${Number(summary.totalSubscriptionRevenue || 0).toLocaleString()}`} icon={CreditCard} accent="teal" />
        <StatCard title="Active & Trial" value={summary.active || 0} icon={Award} accent="navy" />
        <StatCard title="Expired" value={summary.expired || 0} icon={AlertCircle} accent="amber" />
        <StatCard title="Cancelled / Suspended" value={(summary.cancelled || 0) + (summary.suspended || 0)} icon={XCircle} accent="rose" />
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

      {/* Subscriptions Table */}
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
    </div>
  );
}
