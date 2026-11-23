import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import DataTable from "../components/DataTable";
import StatCard from "../components/StatCard";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Search, Download, RotateCcw, Eye, CreditCard, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function AdminPayments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [environment, setEnvironment] = useState("production");
  const [provider, setProvider] = useState("all");
  const [status, setStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const [detailId, setDetailId] = useState(null);
  const [reverseTarget, setReverseTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payments", search, environment, provider, status, startDate, endDate, page],
    queryFn: () =>
      adminService.getPayments({ search, environment, provider, status, startDate, endDate, page, limit: 20 })
  });

  const { data: detail } = useQuery({
    queryKey: ["admin-payment-detail", detailId],
    queryFn: () => adminService.getPaymentDetail(detailId),
    enabled: Boolean(detailId)
  });

  const verifyMutation = useMutation({
    mutationFn: (id) => adminService.verifyPayment(id),
    onSuccess: (res) => {
      toast({ title: "Gateway Verification Checked", description: `Status: ${res?.transaction?.status}` });
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Verification Error", description: err.message })
  });

  const reverseMutation = useMutation({
    mutationFn: ({ id, reason }) => adminService.reversePayment(id, reason),
    onSuccess: () => {
      toast({ title: "Transaction Reversed", description: "Payment reversed and linked invoice reopened cleanly." });
      setReverseTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Reversal Failed", description: err.message })
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
      label: "User / Payer",
      render: (t) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200">{t.landlordId?.name || t.customerName || "—"}</p>
          <p className="text-[10.5px] text-slate-500">{t.tenantId?.name ? `Tenant: ${t.tenantId.name}` : (t.landlordId?.email || t.customerEmail)}</p>
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
      render: (t) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setDetailId(t._id)} className="h-7 px-2 text-[10.5px] cursor-pointer">
            <Eye className="w-3 h-3 mr-1" /> Details
          </Button>
          {t.status === "pending" && (
            <Button
              size="sm"
              variant="outline"
              disabled={verifyMutation.isPending}
              onClick={() => verifyMutation.mutate(t._id)}
              className="h-7 px-2 text-[10.5px] cursor-pointer"
            >
              Verify
            </Button>
          )}
          {t.status === "paid" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReverseTarget(t)}
              className="h-7 px-2 text-[10.5px] text-rose-600 border-rose-200 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Reverse
            </Button>
          )}
        </div>
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

      {/* Transaction Detail Modal */}
      <Dialog open={Boolean(detailId)} onOpenChange={() => setDetailId(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-mono">
              {detail?.transaction?.internalTransactionId || "Transaction Details"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Account Ref: {detail?.transaction?.accountReference} · Provider Ref: {detail?.transaction?.providerReference || "—"}
            </DialogDescription>
          </DialogHeader>
          {detail?.transaction && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg">
                <div><span className="text-slate-500 block">Amount</span><strong>{detail.transaction.currency} {Number(detail.transaction.amountPaid || detail.transaction.amount).toLocaleString()}</strong></div>
                <div><span className="text-slate-500 block">Status</span><strong className="uppercase">{detail.transaction.status}</strong></div>
                <div><span className="text-slate-500 block">Provider / Channel</span><strong>{detail.transaction.provider} ({detail.transaction.paymentChannel})</strong></div>
                <div><span className="text-slate-500 block">Environment</span><strong className="uppercase">{detail.transaction.gatewayEnvironment}</strong></div>
              </div>
              {detail.invoice && (
                <div className="border rounded-md p-2.5">
                  <p className="font-bold">Linked Invoice #{detail.invoice.invoiceNumber}</p>
                  <p className="text-slate-500">Status: {detail.invoice.status} · Total: KES {Number(detail.invoice.totalAmount || 0).toLocaleString()}</p>
                </div>
              )}
              {(detail.callbacks || []).length > 0 && (
                <div>
                  <p className="font-bold mb-1">Webhook Callbacks ({detail.callbacks.length})</p>
                  {detail.callbacks.map((cb) => (
                    <div key={cb._id} className="border rounded p-2 text-[11px] mb-1">
                      <strong>{cb.processingStatus}</strong> — {cb.processingMessage} ({new Date(cb.receivedAt).toLocaleString("en-KE")})
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reversal Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(reverseTarget)}
        onOpenChange={() => setReverseTarget(null)}
        title={`Reverse Transaction ${reverseTarget?.accountReference}?`}
        description="Reversing marks the transaction reversed and reopens any settled invoice balance. All reversals are recorded in the Admin Audit Log."
        confirmLabel="Confirm Authorized Reversal"
        confirmVariant="destructive"
        requireReason={true}
        isPending={reverseMutation.isPending}
        onConfirm={(reason) => reverseMutation.mutate({ id: reverseTarget._id, reason })}
      />
    </div>
  );
}
