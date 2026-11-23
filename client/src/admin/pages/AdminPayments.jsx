import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import { adminHref } from "../utils/msimamiziMode";
import DataTable from "../components/DataTable";
import StatCard from "../components/StatCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Eye, CreditCard, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function AdminPayments() {
  const [, setLocation] = useLocation();

  const [search, setSearch] = useState("");
  const [environment, setEnvironment] = useState("production");
  const [provider, setProvider] = useState("all");
  const [status, setStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payments", search, environment, provider, status, startDate, endDate, page],
    queryFn: () =>
      adminService.getPayments({ search, environment, provider, status, startDate, endDate, page, limit: 20 })
  });

  const summary = data?.summary || {};

  const columns = [
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
      key: "user",
      label: "Subscriber / Channel Detail",
      render: (t) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200">{t.landlordId?.name || t.customerName || "—"}</p>
          <p className="text-[10.5px] text-slate-500">{t.landlordId?.email || t.customerEmail || "Verified Ledger"}</p>
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
      label: "Amount (KES)",
      align: "right",
      render: (t) => (
        <span className="font-bold tabular-nums">
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
            Landlord Ledger
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
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Payments &amp; Transactions</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor Pesapal, IntaSend &amp; M-Pesa C2B transactions in KES with strict gateway verification and CSV reporting.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => adminService.exportPaymentsCsv({ environment, provider, status, startDate, endDate, search })}
          className="bg-[#0d2240] hover:bg-[#132d4a] text-white text-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Settled Volume (KES)" value={`KES ${Number(summary.paidVolume || 0).toLocaleString()}`} icon={CreditCard} accent="teal" />
        <StatCard title="Successful" value={summary.paidCount || 0} icon={CheckCircle2} accent="teal" />
        <StatCard title="Pending" value={summary.pendingCount || 0} icon={Clock} accent="amber" />
        <StatCard title="Failed / Reversed" value={(summary.failedCount || 0) + (summary.refundedOrReversedCount || 0)} icon={AlertCircle} accent="rose" />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search ref or payer..." className="pl-8 h-8.5 text-xs" />
        </div>
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
        <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="h-8.5 text-xs" />
        <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="h-8.5 text-xs" />
      </div>

      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage="No transactions found for the selected filters."
      />
    </div>
  );
}
