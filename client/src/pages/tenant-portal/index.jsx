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
  { id: "hosted_checkout", label: "Pesaflow Hosted Checkout (All Channels)" },
  { id: "mpesa_stk", label: "M-Pesa STK Push (via Pesaflow)" },
  { id: "mpesa_paybill", label: "M-Pesa Paybill (via Pesaflow)" },
  { id: "card", label: "Visa / Mastercard (via Pesaflow)" },
  { id: "bank_transfer", label: "Bank Transfer (via Pesaflow)" },
  { id: "ussd", label: "USSD Payment (via Pesaflow)" }
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
  const [paymentChannel, setPaymentChannel] = useState("hosted_checkout");
  const [phone, setPhone] = useState("");
  const [gatewaySession, setGatewaySession] = useState(null);

  const initiateMutation = useMutation({
    mutationFn: api.initiateTenantPayment,
    onSuccess: (res) => {
      setGatewaySession(res);
      toast({
        title: "Pesaflow Payment Initiated",
        description: `Reference ${res.transaction?.accountReference} created. Complete payment on Pesaflow.`
      });
      queryClient.invalidateQueries({ queryKey: ["tenant-portal-summary"] });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Payment Notice", description: err.message });
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
            Pay monthly rent, water, electricity, service charges, and penalties securely via Pesaflow.
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
                Pesaflow Rental Collection
              </CardTitle>
              <CardDescription className="text-xs">
                Tenant rent payments are reconciled separately from landlord SaaS subscriptions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gatewaySession ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900">Pending Payment Confirmation</span>
                    <Badge className="bg-amber-100 text-amber-800">Awaiting Pesaflow IPN</Badge>
                  </div>
                  <p>
                    Account Ref: <strong className="font-mono">{gatewaySession.transaction?.accountReference}</strong> · Invoice:{" "}
                    <strong>{gatewaySession.invoice?.invoiceNumber}</strong> · Amount:{" "}
                    <strong>KES {Number(gatewaySession.transaction?.amount || 0).toLocaleString()}</strong>
                  </p>
                  {gatewaySession.gateway?.paybillInstructions && (
                    <div className="rounded-lg bg-white border p-3 space-y-1">
                      <p className="font-bold">Paybill Details:</p>
                      <p>Business No: <strong className="font-mono">{gatewaySession.gateway.paybillInstructions.businessNumber}</strong></p>
                      <p>Account Ref: <strong className="font-mono">{gatewaySession.gateway.paybillInstructions.accountReference}</strong></p>
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
                        Pay on Pesaflow <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={verifyMutation.isPending}
                      onClick={() => verifyMutation.mutate(gatewaySession.transaction._id)}
                      className="cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Check Payment Status
                    </Button>
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

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Payment Channel (Pesaflow)</Label>
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
                      Pay Now via Pesaflow
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
                  Select any active tenant from the collection form to generate an official Pesaflow rent checkout link, M-Pesa STK push, or Paybill reference.
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
