import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import { adminHref } from "../../utils/msimamiziMode";
import DataTable from "../DataTable";
import StatCard from "../StatCard";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, Clock, RefreshCw, Search, ShieldCheck } from "lucide-react";

export default function EtimsMonitoringTab() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-etims-submissions", status, search, page],
    queryFn: () => adminService.getEtimsSubmissions({ status, search, page, limit: 15 })
  });

  const retryMutation = useMutation({
    mutationFn: (id) => adminService.retryEtimsSubmission(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-etims-submissions"] });
      toast({
        title: res?.success ? "eTIMS Validated" : "eTIMS Retry Attempted",
        description: res?.success
          ? `Validated by KRA (Receipt: ${res?.submission?.etimsReceiptNo || "issued"})`
          : res?.submission?.lastError || "KRA submission recorded as failed."
      });
    },
    onError: (err) => toast({ variant: "destructive", title: "Retry Failed", description: err.message })
  });

  const summary = data?.summary || {};
  const unsubmitted = data?.paidUnsubmittedInvoices || [];

  const columns = [
    {
      key: "invoice",
      label: "Invoice & Category",
      render: (s) => (
        <div>
          <p className="font-mono font-bold text-[#0d2240] dark:text-[#00d4c8]">{s.trdInvcNo}</p>
          <p className="text-[10.5px] text-slate-500 capitalize">
            {s.invoiceId?.invoiceCategory || "tax"} · {s.environment}
          </p>
        </div>
      )
    },
    {
      key: "landlord",
      label: "Subscriber / Landlord",
      render: (s) =>
        s.landlordId?._id ? (
          <button
            type="button"
            onClick={() => setLocation(adminHref(`/users/${s.landlordId._id}`))}
            className="text-left hover:underline cursor-pointer"
          >
            <p className="font-semibold text-slate-800 dark:text-slate-200">{s.landlordId.name}</p>
            <p className="text-[10.5px] text-slate-500">KRA PIN: {s.landlordId.kraPin || "Not set"}</p>
          </button>
        ) : (
          <span>—</span>
        )
    },
    {
      key: "tax",
      label: "Tax & Total (KES)",
      align: "right",
      render: (s) => (
        <div>
          <p className="font-bold tabular-nums">KES {Number(s.totalAmount || 0).toLocaleString()}</p>
          <p className="text-[10.5px] text-slate-500">VAT: KES {Number(s.taxAmount || 0).toLocaleString()}</p>
        </div>
      )
    },
    {
      key: "status",
      label: "eTIMS Status",
      render: (s) => (
        <div>
          <Badge
            variant="outline"
            className={`text-[10px] uppercase ${
              s.status === "validated"
                ? "bg-[#00a99d]/15 text-[#00a99d] border-[#00a99d]/30"
                : s.status === "failed"
                ? "bg-rose-100 text-rose-700 border-rose-200"
                : "bg-amber-100 text-amber-800 border-amber-200"
            }`}
          >
            {s.status}
          </Badge>
          {s.etimsReceiptNo && <p className="font-mono text-[10px] text-emerald-700 mt-0.5">#{s.etimsReceiptNo}</p>}
        </div>
      )
    },
    {
      key: "error",
      label: "Error / Retries",
      render: (s) => (
        <div className="max-w-xs">
          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">{s.lastError || "OK"}</p>
          <p className="text-[10px] text-slate-400">Retries: {s.retryCount || 0}</p>
        </div>
      )
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (s) =>
        s.status !== "validated" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={retryMutation.isPending}
            onClick={() => retryMutation.mutate(s._id)}
            className="h-7 px-2.5 text-[11px] cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Retry
          </Button>
        ) : (
          <Badge variant="outline" className="text-[10px] text-emerald-700">Compliant</Badge>
        )
    }
  ];

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00a99d]" />
            <span>
              KRA eTIMS Integration Status:{" "}
              <strong>{summary.configured ? `Configured (${summary.configEnvironment})` : "Credentials Not Configured"}</strong>
            </span>
          </div>
          {!summary.configured && (
            <span className="text-[11px] text-amber-700">
              Set ETIMS_TIN, ETIMS_CMC_KEY &amp; ETIMS_DEVICE_SERIAL_NO on backend to transmit live OSCU receipts.
            </span>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Validated Receipts" value={summary.validatedCount || 0} icon={CheckCircle2} accent="teal" />
        <StatCard title="Failed Submissions" value={summary.failedCount || 0} icon={AlertTriangle} accent={summary.failedCount > 0 ? "rose" : "teal"} />
        <StatCard title="Pending / Submitted" value={(summary.pendingCount || 0) + (summary.submittedCount || 0)} icon={Clock} accent="amber" />
        <StatCard title="Validated VAT Total" value={`KES ${Number(summary.validatedTaxTotal || 0).toLocaleString()}`} icon={ShieldCheck} accent="navy" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative sm:col-span-2">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search invoice #, eTIMS receipt #, error..." className="pl-8 h-8.5 text-xs" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
          <option value="all">All Submission Statuses</option>
          <option value="validated">Validated</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.submissions || []}
        isLoading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage="No eTIMS tax submissions recorded yet."
      />

      {unsubmitted.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30 dark:bg-slate-900 shadow-xs">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-bold text-slate-800 dark:text-white">
              Paid Invoices Pending eTIMS Transmission ({unsubmitted.length})
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {unsubmitted.slice(0, 6).map((inv) => (
                <div key={inv._id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-mono font-semibold">{inv.invoiceNumber}</p>
                    <p className="text-[11px] text-slate-500">
                      {inv.landlordId?.name || "Landlord"} · KES {Number(inv.totalAmount || 0).toLocaleString()} ({inv.etimsStatus})
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={retryMutation.isPending}
                    onClick={() => retryMutation.mutate(inv._id)}
                    className="h-7 text-[11px] cursor-pointer"
                  >
                    Submit Now
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
