import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import { adminHref } from "../utils/msimamiziMode";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CreditCard, RotateCcw, RefreshCw } from "lucide-react";

export default function AdminPaymentDetail({ id }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showReverseForm, setShowReverseForm] = useState(false);
  const [reverseReason, setReverseReason] = useState("");

  const { data: detail, isLoading } = useQuery({
    queryKey: ["admin-payment-detail", id],
    queryFn: () => adminService.getPaymentDetail(id),
    enabled: Boolean(id)
  });

  const verifyMutation = useMutation({
    mutationFn: () => adminService.verifyPayment(id),
    onSuccess: (res) => {
      toast({ title: "Gateway Verification Checked", description: `Status: ${res?.transaction?.status}` });
      queryClient.invalidateQueries({ queryKey: ["admin-payment-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Verification Error", description: err.message })
  });

  const reverseMutation = useMutation({
    mutationFn: (reason) => adminService.reversePayment(id, reason),
    onSuccess: () => {
      toast({ title: "Transaction Reversed", description: "Payment reversed and linked invoice reopened cleanly." });
      setShowReverseForm(false);
      setReverseReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-payment-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Reversal Failed", description: err.message })
  });

  if (isLoading) {
    return <p className="text-xs text-slate-500 py-8 text-center">Loading transaction telemetry...</p>;
  }

  const txn = detail?.transaction;
  if (!txn) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setLocation(adminHref("/payments"))} className="text-xs cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Payments
        </Button>
        <p className="text-sm text-rose-600">Transaction record not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setLocation(adminHref("/payments"))} className="h-8 text-xs cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Payments
          </Button>
          <div>
            <h1 className="text-xl font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#00a99d]" />
              {txn.internalTransactionId}
            </h1>
            <p className="text-xs text-slate-500">
              Account Ref: {txn.accountReference} · Provider Ref: {txn.providerReference || "—"}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs uppercase self-start sm:self-auto">{txn.status}</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <Card className="bg-white dark:bg-slate-900"><CardContent className="p-3.5"><span className="text-slate-500 block">Amount</span><strong className="text-lg">{txn.currency || "KES"} {Number(txn.amountPaid || txn.amount || 0).toLocaleString()}</strong></CardContent></Card>
        <Card className="bg-white dark:bg-slate-900"><CardContent className="p-3.5"><span className="text-slate-500 block">Provider / Channel</span><strong className="capitalize">{txn.provider} ({txn.paymentChannel})</strong></CardContent></Card>
        <Card className="bg-white dark:bg-slate-900"><CardContent className="p-3.5"><span className="text-slate-500 block">Environment</span><strong className="uppercase">{txn.gatewayEnvironment}</strong></CardContent></Card>
        <Card className="bg-white dark:bg-slate-900"><CardContent className="p-3.5"><span className="text-slate-500 block">Subscriber</span><strong>{txn.landlordId?.name || txn.customerName || "—"}</strong></CardContent></Card>
      </div>

      <Card className="bg-white dark:bg-slate-900 shadow-xs">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Administrative Payment Actions</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="flex flex-wrap gap-2">
            {txn.status === "pending" && (
              <Button size="sm" variant="outline" disabled={verifyMutation.isPending} onClick={() => verifyMutation.mutate()} className="text-xs cursor-pointer">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Pull Gateway Verification
              </Button>
            )}
            {txn.status === "paid" && (
              <Button size="sm" variant="outline" onClick={() => setShowReverseForm(true)} className="text-rose-600 border-rose-200 text-xs cursor-pointer">
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Initiate Authorized Reversal
              </Button>
            )}
          </div>
          {showReverseForm && (
            <div className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-800/60 space-y-2.5 max-w-lg">
              <Label className="text-xs font-semibold">Reversal Audit Reason (min 4 chars)</Label>
              <Textarea rows={2} value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} placeholder="State verified refund/reversal reference and justification..." />
              <div className="flex gap-2">
                <Button size="sm" disabled={reverseMutation.isPending || reverseReason.trim().length < 4} onClick={() => reverseMutation.mutate(reverseReason.trim())} className="bg-rose-600 hover:bg-rose-700 text-white text-xs cursor-pointer">
                  Confirm Authorized Reversal
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowReverseForm(false); setReverseReason(""); }} className="text-xs cursor-pointer">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {detail.invoice && (
        <Card className="bg-white dark:bg-slate-900 shadow-xs">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Linked Invoice #{detail.invoice.invoiceNumber}</CardTitle></CardHeader>
          <CardContent className="text-xs text-slate-600">
            Status: <strong className="uppercase">{detail.invoice.status}</strong> · Total: KES {Number(detail.invoice.totalAmount || 0).toLocaleString()} · Paid: KES {Number(detail.invoice.amountPaid || 0).toLocaleString()}
          </CardContent>
        </Card>
      )}

      {(detail.callbacks || []).length > 0 && (
        <Card className="bg-white dark:bg-slate-900 shadow-xs">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Webhook Callbacks ({detail.callbacks.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            {detail.callbacks.map((cb) => (
              <div key={cb._id} className="border rounded-md p-2.5">
                <p><strong>{cb.processingStatus}</strong> — {cb.processingMessage}</p>
                <p className="text-[11px] text-slate-400">{new Date(cb.receivedAt).toLocaleString("en-KE")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
