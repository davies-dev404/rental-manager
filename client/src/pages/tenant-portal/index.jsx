import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_URL } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  Smartphone,
  Building2,
  Download,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Receipt,
  Loader2,
  ExternalLink,
  Home
} from "lucide-react";

const CHANNELS = [
  { id: "mpesa_paybill", label: "M-Pesa Paybill (Direct Lipa na M-Pesa)" },
  { id: "hosted_checkout", label: "Pesapal Online Checkout (M-Pesa / Card / Bank)" },
  { id: "mpesa_stk", label: "M-Pesa STK Push (via Pesapal)" },
  { id: "card", label: "Visa / Mastercard (via Pesapal)" },
  { id: "bank_transfer", label: "Bank Transfer (via Pesapal)" }
];

export default function TenantPortalPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: portal, isLoading, refetch } = useQuery({
    queryKey: ["tenant-portal-summary"],
    queryFn: api.getTenantPortalSummary
  });

  // Also load tenants list if a landlord is using this page to trigger an online Pesaflow collection for a tenant
  const { data: landlordTenants = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: api.getTenants
  });

  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [rentPayAmount, setRentPayAmount] = useState("");
  const [waterAmount, setWaterAmount] = useState("0");
  const [elecAmount, setElecAmount] = useState("0");
  const [serviceAmount, setServiceAmount] = useState("0");
  const [penaltyAmount, setPenaltyAmount] = useState("0");
  const [paymentChannel, setPaymentChannel] = useState("mpesa_paybill");
  const [phone, setPhone] = useState("");
  const [gatewaySession, setGatewaySession] = useState(null);
  const [paybillReceiptCode, setPaybillReceiptCode] = useState("");

  const { data: fetchedPaybillConfig } = useQuery({
    queryKey: ["paybill-config", selectedTenantId || "self"],
    queryFn: () => api.getPaybillConfig(selectedTenantId || ""),
    enabled: Boolean(portal && (!portal.linked || !portal.paybillConfig))
  });

  const activePaybillConfig = portal?.paybillConfig || fetchedPaybillConfig || null;

  const initiateMutation = useMutation({
    mutationFn: api.initiateTenantPayment,
    onSuccess: (res) => {
      setGatewaySession(res);
      setPaybillReceiptCode("");
      const isDirectPaybill = res.gateway?.mode === "direct_paybill" || res.transaction?.paymentChannel === "mpesa_paybill";
      toast({
        title: isDirectPaybill ? "Paybill Payment Ready" : "Pesapal Payment Initiated",
        description: isDirectPaybill
          ? `Pay KES ${Number(res.transaction?.amount || 0).toLocaleString()} via Paybill ${res.gateway?.paybillInstructions?.businessNumber || activePaybillConfig?.businessNumber || ""}, then enter your M-Pesa confirmation code below.`
          : `Reference ${res.transaction?.accountReference} created. Complete payment on Pesapal.`
      });
      queryClient.invalidateQueries({ queryKey: ["tenant-portal-summary"] });
      queryClient.invalidateQueries({ queryKey: ["gateway-transactions"] });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Payment Notice", description: err.message });
    }
  });

  const submitPaybillMutation = useMutation({
    mutationFn: api.submitPaybillReceipt,
    onSuccess: (res) => {
      toast({
        title: res.reconciled ? "Paybill Payment Confirmed" : "M-Pesa Code Submitted",
        description: res.message || "Your Paybill payment now appears in MPESA Transactions Status."
      });
      setPaybillReceiptCode("");
      if (res.reconciled) setGatewaySession(null);
      else if (res.transaction) {
        setGatewaySession((prev) => (prev ? { ...prev, transaction: res.transaction } : prev));
      }
      queryClient.invalidateQueries({ queryKey: ["tenant-portal-summary"] });
      queryClient.invalidateQueries({ queryKey: ["gateway-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Paybill Error", description: err.message });
    }
  });

  const verifyMutation = useMutation({
    mutationFn: (id) => api.verifyGatewayTransaction(id),
    onSuccess: (res) => {
      if (res.transaction?.status === "paid") {
        toast({ title: "Rent Payment Confirmed", description: "Balances and receipts updated." });
        setGatewaySession(null);
        queryClient.invalidateQueries({ queryKey: ["tenant-portal-summary"] });
        queryClient.invalidateQueries({ queryKey: ["payments"] });
        queryClient.invalidateQueries({ queryKey: ["tenants"] });
      } else {
        toast({ title: `Status: ${res.transaction?.status || "pending"}`, description: "Waiting for gateway confirmation." });
      }
    },
    onError: (err) => toast({ variant: "destructive", title: "Verification Failed", description: err.message })
  });

  const activeTenant = portal?.linked
    ? portal.tenant
    : landlordTenants.find((t) => (t._id || t.id) === selectedTenantId);

  const totalCompute =
    Number(rentPayAmount || (portal?.linked ? portal.obligations?.balanceDue : activeTenant?.totalDue || activeTenant?.rentAmount || 0)) +
    Number(waterAmount || 0) +
    Number(elecAmount || 0) +
    Number(serviceAmount || 0) +
    Number(penaltyAmount || 0);

  const handlePaySubmit = (e) => {
    e.preventDefault();
    const targetTenantId = portal?.linked ? portal.tenant._id : selectedTenantId;
    if (!targetTenantId) {
      toast({ variant: "destructive", title: "Tenant Required", description: "Select a tenant lease first." });
      return;
    }
    const baseRent = Number(
      rentPayAmount ||
      (portal?.linked ? portal.obligations?.balanceDue : activeTenant?.totalDue || activeTenant?.rentAmount || 0)
    );
    initiateMutation.mutate({
      tenantId: targetTenantId,
      paymentChannel,
      paymentCategory: (Number(waterAmount) + Number(elecAmount) + Number(serviceAmount) + Number(penaltyAmount)) > 0 ? "combined" : "rent",
      phone: phone || activeTenant?.phone || "",
      email: activeTenant?.email || "",
      amount: totalCompute,
      chargeBreakdown: {
        rent: baseRent,
        water: Number(waterAmount || 0),
        electricity: Number(elecAmount || 0),
        serviceCharge: Number(serviceAmount || 0),
        penalty: Number(penaltyAmount || 0)
      },
      idempotencyKey: `rnt_${targetTenantId}_${totalCompute}_${Date.now()}`
    });
  };

  const downloadAuthFile = async (path, filename) => {
    try {
      const stored = JSON.parse(localStorage.getItem("rental_user") || "{}");
      const res = await fetch(`${API_URL}${path}`, {
        headers: { Authorization: `Bearer ${stored?.token || ""}` },
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to download document");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast({ variant: "destructive", title: "Download Error", description: err.message });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-14">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Online Rent &amp; Utility Payment Portal
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pay monthly rent, water, electricity, service charges, and penalties via M-Pesa Paybill or Pesapal.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Balances
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading tenant lease ledger...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Initiation Form */}
          <Card className="lg:col-span-2 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00a99d]" />
                Rental Collection &amp; M-Pesa Paybill
              </CardTitle>
              <CardDescription className="text-xs">
                All tenant M-Pesa Paybill &amp; Pesapal payments appear automatically in MPESA Transactions Status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gatewaySession ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900">
                      {gatewaySession.gateway?.mode === "direct_paybill"
                        ? "Lipa na M-Pesa Paybill Instructions"
                        : "Pending Payment Confirmation"}
                    </span>
                    <Badge className="bg-amber-100 text-amber-800">
                      {gatewaySession.transaction?.status === "processing"
                        ? "M-Pesa Code Submitted"
                        : gatewaySession.gateway?.mode === "direct_paybill"
                        ? "Awaiting M-Pesa Code"
                        : "Awaiting Pesapal IPN"}
                    </Badge>
                  </div>
                  <p>
                    System Ref: <strong className="font-mono">{gatewaySession.transaction?.accountReference}</strong>
                    {gatewaySession.invoice?.invoiceNumber && (
                      <> · Invoice: <strong>{gatewaySession.invoice.invoiceNumber}</strong></>
                    )}{" "}
                    · Amount: <strong>KES {Number(gatewaySession.transaction?.amount || 0).toLocaleString()}</strong>
                  </p>
                  {(gatewaySession.gateway?.paybillInstructions || activePaybillConfig?.enabled) && (
                    <div className="rounded-lg bg-white border border-emerald-200 p-3.5 space-y-2">
                      <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                        {(gatewaySession.gateway?.paybillInstructions?.mpesaType || activePaybillConfig?.type) === "Till"
                          ? "M-Pesa Till Payment Details"
                          : "Lipa na M-Pesa Paybill Details"}
                      </p>
                      <div className={`grid grid-cols-1 ${(gatewaySession.gateway?.paybillInstructions?.mpesaType || activePaybillConfig?.type) === "Till" ? "sm:grid-cols-2" : "sm:grid-cols-3"} gap-2 pt-1`}>
                        <div className="p-2 rounded bg-slate-50 border">
                          <span className="text-[10px] text-slate-500 block">
                            {(gatewaySession.gateway?.paybillInstructions?.mpesaType || activePaybillConfig?.type) === "Till"
                              ? "Till Number"
                              : "Paybill Number"}
                          </span>
                          <strong className="font-mono text-sm text-[#0b1065]">
                            {gatewaySession.gateway?.paybillInstructions?.businessNumber || activePaybillConfig?.businessNumber}
                          </strong>
                        </div>
                        {(gatewaySession.gateway?.paybillInstructions?.mpesaType || activePaybillConfig?.type) !== "Till" && (
                          <div className="p-2 rounded bg-slate-50 border">
                            <span className="text-[10px] text-slate-500 block">Account Number</span>
                            <strong className="font-mono text-sm text-[#0b1065]">
                              {gatewaySession.gateway?.paybillInstructions?.accountReference || activePaybillConfig?.recommendedAccount || activePaybillConfig?.defaultAccount || "Unit #"}
                            </strong>
                          </div>
                        )}
                        <div className="p-2 rounded bg-slate-50 border">
                          <span className="text-[10px] text-slate-500 block">Amount (KES)</span>
                          <strong className="font-mono text-sm text-emerald-700">
                            KES {Number(gatewaySession.transaction?.amount || 0).toLocaleString()}
                          </strong>
                        </div>
                      </div>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!paybillReceiptCode.trim()) return;
                          submitPaybillMutation.mutate({
                            transactionId: gatewaySession.transaction?._id,
                            tenantId: gatewaySession.transaction?.tenantId,
                            receiptCode: paybillReceiptCode.trim(),
                            phone: phone || activeTenant?.phone || "",
                            amount: gatewaySession.transaction?.amount
                          });
                        }}
                        className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100"
                      >
                        <Input
                          placeholder="Enter M-Pesa Confirmation Code (e.g. SJK48A9XYZ)"
                          value={paybillReceiptCode}
                          onChange={(e) => setPaybillReceiptCode(e.target.value.toUpperCase())}
                          className="h-8 text-xs font-mono uppercase flex-1"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          disabled={submitPaybillMutation.isPending || !paybillReceiptCode.trim()}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs cursor-pointer"
                        >
                          {submitPaybillMutation.isPending ? "Submitting..." : "Submit M-Pesa Code"}
                        </Button>
                      </form>
                      {gatewaySession.transaction?.providerReference && (
                        <p className="text-[11px] text-emerald-700 font-medium">
                          Submitted M-Pesa Code: <strong className="font-mono">{gatewaySession.transaction.providerReference}</strong> (Visible in MPESA Transactions Status)
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {gatewaySession.gateway?.checkoutUrl && (
                      <a
                        href={gatewaySession.gateway.checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0b1065] text-white font-semibold"
                      >
                        Pay on Pesapal <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {gatewaySession.gateway?.mode !== "direct_paybill" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={verifyMutation.isPending}
                        onClick={() => verifyMutation.mutate(gatewaySession.transaction._id)}
                        className="cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Check Payment Status
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setGatewaySession(null)}>
                      New Payment
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePaySubmit} className="space-y-4">
                  {!portal?.linked && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Select Tenant Lease (Landlord Collection Mode)</Label>
                      <select
                        value={selectedTenantId}
                        onChange={(e) => {
                          setSelectedTenantId(e.target.value);
                          const found = landlordTenants.find((t) => (t._id || t.id) === e.target.value);
                          if (found) {
                            setRentPayAmount(String(found.totalDue || found.rentAmount || 0));
                            setPhone(found.phone || "");
                          }
                        }}
                        className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                      >
                        <option value="">Select Tenant...</option>
                        {landlordTenants.map((t) => (
                          <option key={t._id || t.id} value={t._id || t.id}>
                            {t.name} (Unit {t.unitNumber || t.unitId?.unitNumber || "—"} · KES {Number(t.totalDue || t.rentAmount || 0).toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Monthly Rent (KES)</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder={String(portal?.obligations?.balanceDue || 0)}
                        value={rentPayAmount}
                        onChange={(e) => setRentPayAmount(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Water Charge (KES)</Label>
                      <Input type="number" min={0} value={waterAmount} onChange={(e) => setWaterAmount(e.target.value)} className="h-9 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Electricity Charge (KES)</Label>
                      <Input type="number" min={0} value={elecAmount} onChange={(e) => setElecAmount(e.target.value)} className="h-9 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Service Charge (KES)</Label>
                      <Input type="number" min={0} value={serviceAmount} onChange={(e) => setServiceAmount(e.target.value)} className="h-9 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Penalties (KES)</Label>
                      <Input type="number" min={0} value={penaltyAmount} onChange={(e) => setPenaltyAmount(e.target.value)} className="h-9 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Payer Phone Number</Label>
                      <Input placeholder="07XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 text-xs" />
                    </div>
                  </div>

                  {activePaybillConfig?.enabled && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/20 dark:border-emerald-800 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="space-y-0.5">
                        <p className="font-bold text-emerald-900 dark:text-emerald-200">
                          Configured M-Pesa {activePaybillConfig.type}: <span className="font-mono">{activePaybillConfig.businessNumber}</span>
                        </p>
                        {activePaybillConfig.type !== "Till" && (
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                            Account Number: <strong className="font-mono">{activePaybillConfig.recommendedAccount || activePaybillConfig.defaultAccount || "Unit Number"}</strong>
                          </p>
                        )}
                      </div>
                      <Badge className="bg-emerald-600 text-white text-[10px]">Direct Paybill Active</Badge>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Payment Channel</Label>
                    <select
                      value={paymentChannel}
                      onChange={(e) => setPaymentChannel(e.target.value)}
                      className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                    >
                      {CHANNELS.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-slate-500">Total Rental Payment</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">
                        KES {Number(totalCompute || 0).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      type="submit"
                      disabled={initiateMutation.isPending}
                      className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-10 px-6 cursor-pointer"
                    >
                      {initiateMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                      {paymentChannel === "mpesa_paybill" ? "Get Paybill Instructions" : "Pay Now via Pesapal"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Lease & Balance Summary */}
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Home className="w-4 h-4 text-[#0b1065]" /> Lease Obligation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {portal?.linked ? (
                <>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border space-y-1">
                    <p className="font-bold text-sm">{portal.property?.name || "Assigned Property"}</p>
                    <p className="text-slate-500">Unit {portal.unit?.unitNumber || "—"} · {portal.tenant?.name}</p>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-slate-500">Monthly Obligation</span>
                    <span className="font-bold">KES {Number(portal.obligations?.totalMonthlyObligation || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-slate-500">Paid This Month</span>
                    <span className="font-bold text-emerald-600">KES {Number(portal.obligations?.paidThisMonth || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-700 font-semibold">Balance Due</span>
                    <span className="font-black text-rose-600">KES {Number(portal.obligations?.balanceDue || 0).toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <p className="text-slate-500 leading-relaxed">
                  Select any active tenant from the collection form to pay via M-Pesa Paybill{activePaybillConfig?.businessNumber ? ` (${activePaybillConfig.businessNumber})` : ""}, M-Pesa STK push, or Pesapal checkout.
                </p>
              )}
              <div className="pt-3 border-t text-[11px] text-slate-500">
                Support Desk: 0790264792 · info@afrinextech.co.ke
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rental Receipts & Gateway History */}
      {portal?.receipts?.length > 0 && (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" /> Rental Payment Receipts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {portal.receipts.map((rct) => (
              <div key={rct._id} className="border rounded-lg p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono font-bold">{rct.receiptNumber}</span>
                  <span className="ml-3 text-slate-500">
                    KES {Number(rct.amount).toLocaleString()} · {new Date(rct.issuedAt).toLocaleDateString("en-KE")}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadAuthFile(`/v2/payments/receipts/${rct._id}/pdf`, `${rct.receiptNumber}.pdf`)}
                  className="h-7 text-[11px] cursor-pointer"
                >
                  <Download className="w-3 h-3 mr-1" /> PDF
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
