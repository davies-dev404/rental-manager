import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import DataTable from "../DataTable";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, CheckCircle2, Link2, Ban } from "lucide-react";

export default function CallbacksTab({ environment = "production" }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingStatus, setProcessingStatus] = useState("all");
  const [provider, setProvider] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [resolvingId, setResolvingId] = useState(null);
  const [matchTxnRef, setMatchTxnRef] = useState("");
  const [notes, setNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reconciliation-callbacks", environment, processingStatus, provider, search, page],
    queryFn: () =>
      adminService.getReconciliationCallbacks({ environment, processingStatus, provider, search, page, limit: 15 })
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, payload }) => adminService.resolveCallback(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reconciliation-callbacks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reconciliation-overview"] });
      setResolvingId(null);
      setMatchTxnRef("");
      setNotes("");
      toast({ title: "Callback Updated", description: "Reconciliation log and audit entry saved." });
    },
    onError: (err) => toast({ variant: "destructive", title: "Action Failed", description: err.message })
  });

  const statusCounts = data?.statusCounts || {};

  const columns = [
    {
      key: "provider",
      label: "Provider & Ref",
      render: (c) => (
        <div>
          <p className="font-semibold capitalize">{String(c.provider || "").replace(/_/g, " ")}</p>
          <p className="font-mono text-[10.5px] text-slate-500">
            {c.providerReference || c.accountReference || c.trackingId || "—"}
          </p>
        </div>
      )
    },
    {
      key: "amount",
      label: "Amount Received",
      align: "right",
      render: (c) => (
        <span className="font-bold tabular-nums">
          {c.currencyReceived || "KES"} {Number(c.amountReceived || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: "status",
      label: "Processing Status",
      render: (c) => (
        <div>
          <Badge
            variant="outline"
            className={`text-[10px] ${
              c.processingStatus === "processed"
                ? "bg-[#00a99d]/15 text-[#00a99d] border-[#00a99d]/30"
                : ["unmatched", "ignored_duplicate"].includes(c.processingStatus)
                ? "bg-amber-100 text-amber-800 border-amber-200"
                : "bg-rose-100 text-rose-700 border-rose-200"
            }`}
          >
            {String(c.processingStatus || "").replace(/_/g, " ")}
          </Badge>
          {c.isDuplicate && <span className="ml-1.5 text-[10px] text-amber-700 font-semibold">Duplicate</span>}
        </div>
      )
    },
    {
      key: "message",
      label: "Diagnostics",
      render: (c) => (
        <div className="max-w-xs">
          <p className="text-[11px] text-slate-700 dark:text-slate-300 line-clamp-2">{c.processingMessage || "—"}</p>
          <p className="text-[10px] text-slate-400">
            Sig: {c.signatureValid ? "Valid" : "Invalid"} · {c.receivedAt ? new Date(c.receivedAt).toLocaleString("en-KE") : "—"}
          </p>
        </div>
      )
    },
    {
      key: "actions",
      label: "Reconcile",
      align: "right",
      render: (c) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setResolvingId(resolvingId === c._id ? null : c._id);
            setMatchTxnRef(c.transactionId?.internalTransactionId || c.accountReference || "");
            setNotes("");
          }}
          className="h-7 px-2.5 text-[11px] cursor-pointer"
        >
          Investigate
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {[
          { id: "all", label: "All Callbacks" },
          { id: "unmatched", label: `Unmatched (${statusCounts.unmatched || 0})` },
          { id: "amount_mismatch", label: `Amount Mismatch (${statusCounts.amount_mismatch || 0})` },
          { id: "rejected_signature", label: `Rejected Signature (${statusCounts.rejected_signature || 0})` },
          { id: "ignored_duplicate", label: `Duplicates (${statusCounts.ignored_duplicate || 0})` },
          { id: "failed_status", label: `Failed (${statusCounts.failed_status || 0})` },
          { id: "processed", label: `Processed (${statusCounts.processed || 0})` }
        ].map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => { setProcessingStatus(chip.id); setPage(1); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition ${
              processingStatus === chip.id
                ? "bg-[#0d2240] text-white border-[#0d2240]"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative sm:col-span-2">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search M-Pesa receipt, account ref, tracking ID..."
            className="pl-8 h-8.5 text-xs"
          />
        </div>
        <select value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
          <option value="all">All Providers</option>
          <option value="mpesa_c2b">M-Pesa Paybill C2B</option>
          <option value="pesapal">Pesapal</option>
          <option value="intasend">IntaSend</option>
          <option value="pesaflow">Pesaflow</option>
        </select>
      </div>

      {resolvingId && (
        <Card className="border-[#00a99d]/40 bg-[#00a99d]/5 shadow-xs">
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-bold text-[#0d2240] dark:text-white">
              Resolve / Match Webhook Callback
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Input
                value={matchTxnRef}
                onChange={(e) => setMatchTxnRef(e.target.value)}
                placeholder="Transaction ID, internalTransactionId, or accountReference"
                className="h-8.5 text-xs bg-white dark:bg-slate-900"
              />
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Audit investigation notes..."
                className="h-8.5 text-xs bg-white dark:bg-slate-900"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={resolveMutation.isPending || !matchTxnRef.trim()}
                onClick={() => resolveMutation.mutate({ id: resolvingId, payload: { action: "match_transaction", transactionId: matchTxnRef, notes } })}
                className="bg-[#0d2240] text-white text-xs h-8 cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5 mr-1" /> Link &amp; Verify Against Transaction
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={resolveMutation.isPending}
                onClick={() => resolveMutation.mutate({ id: resolvingId, payload: { action: "mark_reviewed", notes } })}
                className="text-xs h-8 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Reviewed
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={resolveMutation.isPending}
                onClick={() => resolveMutation.mutate({ id: resolvingId, payload: { action: "ignore", notes } })}
                className="text-xs h-8 text-amber-700 cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5 mr-1" /> Dismiss as Duplicate/Test
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setResolvingId(null)} className="text-xs h-8 cursor-pointer">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage="No payment callbacks match your filters."
      />
    </div>
  );
}
