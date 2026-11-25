import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import { adminHref } from "../utils/msimamiziMode";
import DataTable from "../components/DataTable";
import StatCard from "../components/StatCard";
import ReconciliationOverviewTab from "../components/payments/ReconciliationOverviewTab";
import CallbacksTab from "../components/payments/CallbacksTab";
import EtimsMonitoringTab from "../components/payments/EtimsMonitoringTab";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Download,
  Eye,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  ShieldCheck,
  Scale,
  Webhook,
  ReceiptText
} from "lucide-react";

function getInitialPropertyFilter() {
  if (typeof window === "undefined") return "all";
  const params = new URLSearchParams(window.location.search);
  return params.get("propertyId") || "all";
}

function getInitialTab() {
  if (typeof window === "undefined") return "transactions";
  const params = new URLSearchParams(window.location.search);
  return params.get("tab") || "transactions";
}

export default function AdminPayments() {
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [propertyId, setPropertyId] = useState(getInitialPropertyFilter);
  const [search, setSearch] = useState("");
  const [environment, setEnvironment] = useState("production");
  const [provider, setProvider] = useState("all");
  const [category, setCategory] = useState("all");
  const [reconciliationStatus, setReconciliationStatus] = useState("all");
  const [status, setStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const p = getInitialPropertyFilter();
    if (p && p !== propertyId) {
      setPropertyId(p);
    }
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payments", propertyId, search, environment, provider, category, reconciliationStatus, status, startDate, endDate, page],
    queryFn: () =>
      adminService.getPayments({
        propertyId,
        search,
        environment,
        provider,
        category,
        reconciliationStatus,
        status,
        startDate,
        endDate,
        page,
        limit: 20
      }),
    enabled: activeTab === "transactions"
  });

  const summary = data?.summary || {};
  const properties = data?.properties || [];
  const selectedPropObj = properties.find((pr) => String(pr._id) === String(propertyId));

  const columns = [
    {
      key: "property",
      label: "Property & Unit",
      render: (t) => (
        <div>
          <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#00a99d] shrink-0" />
            {t.propertyName || (t.paymentCategory === "subscription" ? "Platform Subscription" : "Property Payment")}
          </p>
          <p className="text-[10.5px] text-slate-500">
            {t.unitNumber ? `Unit ${t.unitNumber} · ` : ""}Tenant Identity Hidden (ODPP)
          </p>
        </div>
      )
    },
    {
      key: "ref",
      label: "Reference",
      render: (t) => (
        <div className="font-mono">
          <p className="font-bold text-slate-900 dark:text-white">{t.accountReference}</p>
          <p className="text-[10.5px] text-slate-500">{t.providerReference || t.internalTransactionId}</p>
        </div>
      )
    },
    {
      key: "method",
      label: "Method & Provider",
      render: (t) => (
        <div>
          <p className="capitalize font-medium">{t.provider}</p>
          <p className="text-[10.5px] text-slate-500">{t.paymentMethodDetail || t.paymentChannel}</p>
        </div>
      )
    },
    {
      key: "amount",
      label: "Total Paid (KES)",
      align: "right",
      render: (t) => (
        <span className="font-bold tabular-nums text-[#0d2240] dark:text-[#00d4c8]">
          {t.currency || "KES"} {Number(t.amountPaid || t.amount || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (t) => (
        <Badge
          variant="outline"
          className={`text-[10px] uppercase ${
            t.status === "paid"
              ? "bg-[#00a99d]/15 text-[#00a99d] border-[#00a99d]/30"
              : ["failed", "reversed", "cancelled"].includes(t.status)
              ? "bg-rose-100 text-rose-700 border-rose-200"
              : "bg-amber-100 text-amber-800 border-amber-200"
          }`}
        >
          {t.status}
        </Badge>
      )
    },
    {
      key: "createdAt",
      label: "Timestamp",
      render: (t) => (
        <span className="text-slate-500">{t.createdAt ? new Date(t.createdAt).toLocaleString("en-KE") : "—"}</span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (t) =>
        t.isWorkspacePayment ? (
          <Badge variant="outline" className="text-[10px] text-slate-600">
            Verified Ledger
          </Badge>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setLocation(adminHref(`/payments/${t._id}`))} className="h-7 px-2.5 text-[10.5px] cursor-pointer">
            <Eye className="w-3 h-3 mr-1" /> Open Details
          </Button>
        )
    }
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Financial Reconciliation &amp; Monitoring</h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00a99d] shrink-0" />
            Strict separation between Landlord Rent Collections &amp; AfriNexTech SaaS Revenue. Tenant identities masked per Kenya ODPP Act.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => adminService.exportReport("reconciliation", "xlsx", { startDate, endDate })}
            className="text-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Excel Recon
          </Button>
          <Button
            size="sm"
            onClick={() => adminService.exportPaymentsCsv({ propertyId, environment, provider, category, reconciliationStatus, status, startDate, endDate, search })}
            className="bg-[#0d2240] hover:bg-[#132d4a] text-white text-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 overflow-x-auto shadow-xs">
        <nav className="flex items-center gap-1 min-w-max">
          {[
            { id: "transactions", label: "Transactions & Property Totals", icon: CreditCard },
            { id: "reconciliation", label: "Financial Control & Separation", icon: Scale },
            { id: "callbacks", label: "M-Pesa & Gateway Callbacks", icon: Webhook },
            { id: "etims", label: "KRA eTIMS Monitoring", icon: ReceiptText }
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

      {activeTab === "reconciliation" && (
        <ReconciliationOverviewTab environment={environment} provider={provider} startDate={startDate} endDate={endDate} />
      )}
      {activeTab === "callbacks" && <CallbacksTab environment={environment} />}
      {activeTab === "etims" && <EtimsMonitoringTab />}

      {activeTab === "transactions" && (
        <>

      {/* Selected Property Total Banner or Per-Property Total Paid Cards */}
      {selectedPropObj ? (
        <div className="bg-[#0d2240] text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#00d4c8] font-semibold">Selected Property Summary</p>
            <h2 className="text-base font-bold mt-0.5 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#00d4c8]" />
              {selectedPropObj.name}
              {selectedPropObj.location ? <span className="text-xs font-normal text-slate-300">({selectedPropObj.location})</span> : ""}
            </h2>
            <p className="text-xs text-slate-300">Landlord: {selectedPropObj.landlordName}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[11px] text-slate-300">Total Paid for Property</p>
              <p className="text-2xl font-bold text-[#00d4c8]">
                KES {Number(selectedPropObj.totalPaid || summary.paidVolume || 0).toLocaleString()}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setPropertyId("all"); setPage(1); }}
              className="text-xs text-slate-900 bg-white hover:bg-slate-100 cursor-pointer"
            >
              Show All Properties
            </Button>
          </div>
        </div>
      ) : properties.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Select a Property to Inspect Total Paid &amp; ODPP-Protected Payment Records
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {properties.map((pr) => (
              <button
                key={pr._id}
                type="button"
                onClick={() => { setPropertyId(pr._id); setPage(1); }}
                className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#00a99d] rounded-xl p-3.5 shadow-2xs transition cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#00a99d] shrink-0" />
                      {pr.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {pr.landlordName} · {pr.paymentCount || 0} {pr.paymentCount === 1 ? "record" : "records"}
                    </p>
                  </div>
                </div>
                <p className="text-base font-bold text-[#0d2240] dark:text-[#00d4c8] mt-2">
                  KES {Number(pr.totalPaid || 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-[#00a99d] font-semibold uppercase tracking-wide">Total Paid</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title={selectedPropObj ? `${selectedPropObj.name} Total Paid` : "Total Paid (KES)"}
          value={`KES ${Number(summary.paidVolume || 0).toLocaleString()}`}
          icon={CreditCard}
          accent="teal"
        />
        <StatCard title="Successful Payments" value={summary.paidCount || 0} icon={CheckCircle2} accent="teal" />
        <StatCard title="Pending" value={summary.pendingCount || 0} icon={Clock} accent="amber" />
        <StatCard title="Failed / Reversed" value={(summary.failedCount || 0) + (summary.refundedOrReversedCount || 0)} icon={AlertCircle} accent="rose" />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <select
          value={propertyId}
          onChange={(e) => { setPropertyId(e.target.value); setPage(1); }}
          className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800 font-medium"
        >
          <option value="all">All Properties</option>
          {properties.map((pr) => (
            <option key={pr._id} value={pr._id}>
              {pr.name}
            </option>
          ))}
        </select>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search ref..." className="pl-8 h-8.5 text-xs" />
        </div>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
          <option value="all">All Streams</option>
          <option value="saas">SaaS Subscriptions Only</option>
          <option value="rental">Landlord Rent Collections Only</option>
        </select>
        <select value={environment} onChange={(e) => { setEnvironment(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
          <option value="production">Production Ledger</option>
          <option value="sandbox">Sandbox Tests</option>
          <option value="all">All Environments</option>
        </select>
        <select value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
          <option value="all">All Methods / Gateways</option>
          <option value="pesapal">Pesapal</option>
          <option value="intasend">IntaSend</option>
          <option value="mpesa_c2b">M-Pesa Paybill C2B</option>
          <option value="pesaflow">Pesaflow</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
          <option value="all">All Statuses</option>
          <option value="paid">Successful (Paid)</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="reversed">Reversed / Refunded</option>
        </select>
        <select value={reconciliationStatus} onChange={(e) => { setReconciliationStatus(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
          <option value="all">Recon: All</option>
          <option value="reconciled">Reconciled</option>
          <option value="pending">Pending Recon</option>
          <option value="amount_mismatch">Amount Mismatch</option>
          <option value="unmatched">Unmatched</option>
          <option value="reversed">Reversed</option>
        </select>
        <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="h-8.5 text-xs" />
        <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="h-8.5 text-xs" />
      </div>

      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage="No transactions found for the selected property or filters."
      />
        </>
      )}
    </div>
  );
}
