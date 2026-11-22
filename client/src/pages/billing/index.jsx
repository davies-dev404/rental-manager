import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
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
  CreditCard,
  Smartphone,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Download,
  RefreshCw,
  ShieldCheck,
  Receipt,
  Loader2,
  ExternalLink,
  XCircle,
  Hash,
  FileCheck2
} from "lucide-react";

const STATUS_BADGE = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  trial: "bg-blue-100 text-blue-700 border-blue-200",
  grace_period: "bg-amber-100 text-amber-700 border-amber-200",
  restricted: "bg-amber-100 text-amber-800 border-amber-300",
  expired: "bg-rose-100 text-rose-700 border-rose-200",
  suspended: "bg-rose-100 text-rose-700 border-rose-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  pending_payment: "bg-amber-100 text-amber-700 border-amber-200"
};

const BILLING_CYCLES = [
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly (3 mo)" },
  { id: "semi_annual", label: "Semi-Annual (6 mo)" },
  { id: "annual", label: "Annual (12 mo)" }
];

const PAYMENT_CHANNELS = [
  { id: "hosted_checkout", label: "All Methods (M-Pesa, Visa, Mastercard, Bank)", icon: ShieldCheck },
  { id: "mpesa_stk", label: "M-Pesa STK Push", icon: Smartphone },
  { id: "card", label: "Visa / Mastercard", icon: CreditCard },
  { id: "bank_transfer", label: "Bank Transfer / PesaLink", icon: Building2 }
];

const formatChannelLabel = (channel, detail = "") => {
  if (detail && detail.toUpperCase().includes("M-PESA")) return "M-Pesa";
  if (detail && (detail.toUpperCase().includes("CARD") || detail.toUpperCase().includes("VISA") || detail.toUpperCase().includes("MASTER"))) return "Visa / Mastercard";
  if (detail && detail.toUpperCase().includes("PESALINK")) return "Bank / PesaLink";
  switch (channel) {
    case "mpesa_stk": return "M-Pesa STK Push";
    case "card": return "Visa / Mastercard";
    case "bank_transfer": return "Bank Transfer / PesaLink";
    case "hosted_checkout": return "Hosted Checkout";
    default: return channel || "Online Payment";
  }
};

export default function BillingDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [selectedPlanCode, setSelectedPlanCode] = useState("growth");
  const [selectedCycle, setSelectedCycle] = useState("monthly");
  const [desiredUnits, setDesiredUnits] = useState(25);
  const [paymentChannel, setPaymentChannel] = useState("hosted_checkout");
  const [promoCode, setPromoCode] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [enableRecurring, setEnableRecurring] = useState(false);
  const [downgradeNote, setDowngradeNote] = useState(null);
  const [activeGatewaySession, setActiveGatewaySession] = useState(null);

  useEffect(() => {
    if (user?.phone && !phoneInput) {
      setPhoneInput(user.phone);
    }
  }, [user?.phone]);

  const { data: mySubData, isLoading: subLoading, refetch: refetchMySub } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: api.getMySubscription
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: api.getSubscriptionPlans
  });

  const selectedPlanObj = plans.find((p) => p.code === selectedPlanCode) || plans[0];

  const { data: quoteData } = useQuery({
    queryKey: ["sub-quote", selectedPlanCode, desiredUnits, selectedCycle, promoCode],
    queryFn: () =>
      api.calculateSubscription({
        planCode: selectedPlanCode,
        desiredUnits,
        billingCycle: selectedCycle,
        promoCode
      }),
    enabled: Boolean(upgradeOpen && selectedPlanCode)
  });

  // Handle hosted checkout redirect return securely via backend status verification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isCancelled = params.get("payment_cancelled");
    const trackingParam =
      params.get("OrderTrackingId") ||
      params.get("orderTrackingId") ||
      params.get("tracking_id") ||
      params.get("invoice_id") ||
      "";
    const merchantRefParam =
      params.get("OrderMerchantReference") ||
      params.get("orderMerchantReference") ||
      params.get("ref") ||
      "";
    const checkoutIdParam = params.get("checkout_id") || "";
    const hasReturn =
      params.get("payment_return") ||
      isCancelled ||
      trackingParam ||
      checkoutIdParam ||
      params.get("txnId");
    if (!hasReturn) return;

    const providerParam = (
      params.get("provider") ||
      (params.get("OrderTrackingId") ? "pesapal" : mySubData?.gatewayProvider || "pesapal")
    ).toLowerCase();

    const payload = {
      txnId: params.get("txnId") || "",
      ref: merchantRefParam,
      OrderMerchantReference: merchantRefParam,
      OrderTrackingId: params.get("OrderTrackingId") || trackingParam,
      tracking_id: trackingParam,
      checkout_id: checkoutIdParam,
      signature: params.get("signature") || ""
    };

    window.history.replaceState({}, "", window.location.pathname);

    if (isCancelled && !trackingParam && !checkoutIdParam) {
      toast({
        variant: "destructive",
        title: "Payment Cancelled",
        description: "Checkout was cancelled before completion. No charge was applied."
      });
      return;
    }

    api.verifyPaymentCallback(providerParam, payload)
      .then((res) => {
        if (res?.transaction?.status === "paid" || res?.alreadySettled) {
          toast({
            title: "Payment Verified & Subscription Active",
            description: "Your payment has been verified and your subscription is now active."
          });
        } else if (["failed", "cancelled"].includes(res?.transaction?.status)) {
          toast({
            variant: "destructive",
            title: `Payment ${res.transaction.status}`,
            description: res.transaction.failureReason || "The payment was not completed."
          });
        } else {
          toast({
            title: `Payment Status: ${res?.transaction?.status || "processing"}`,
            description: "Waiting for gateway confirmation. Click Refresh Status shortly if you just paid."
          });
        }
        queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
        queryClient.invalidateQueries({ queryKey: ["stats"] });
      })
      .catch((err) => {
        toast({
          variant: "destructive",
          title: "Payment Verification Notice",
          description: err.message
        });
      });
  }, []);

  const subscribeMutation = useMutation({
    mutationFn: api.subscribeToPlan,
    onSuccess: (res) => {
      setActiveGatewaySession({
        transaction: res.transaction,
        gateway: res.gateway,
        invoice: res.invoice,
        subscription: res.subscription
      });
      toast({
        title: "Payment Session Ready",
        description: res.gateway?.checkoutUrl
          ? "Complete your payment on the secure checkout page. Your plan activates automatically once confirmed."
          : "Check your phone for the M-Pesa PIN prompt, then wait or click Verify Payment Status."
      });
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Payment Initiation Notice",
        description: err.message
      });
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
    }
  });

  const verifyMutation = useMutation({
    mutationFn: (txnId) => api.verifyGatewayTransaction(txnId),
    onSuccess: (res) => {
      if (res.transaction?.status === "paid" || res.alreadySettled) {
        toast({
          title: "Subscription Activated",
          description: "Your payment was verified and your unit entitlement is now active."
        });
        setActiveGatewaySession(null);
        setUpgradeOpen(false);
        queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
        queryClient.invalidateQueries({ queryKey: ["stats"] });
      } else {
        toast({
          title: `Status: ${res.transaction?.status || "pending"}`,
          description: "Waiting for payment settlement confirmation."
        });
        queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
      }
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Verification Error", description: err.message });
    }
  });

  const refreshStatusMutation = useMutation({
    mutationFn: api.refreshSubscriptionStatuses,
    onSuccess: async (res) => {
      await refetchMySub();
      if (res?.activatedCount > 0) {
        queryClient.invalidateQueries({ queryKey: ["stats"] });
        toast({
          title: "Subscription Activated",
          description: res.message || "Payment verified and subscription activated."
        });
      } else if (res?.checkedCount > 0) {
        toast({
          title: "Status Refreshed",
          description: res.message || "Checked pending payment status."
        });
      } else {
        toast({
          title: "Status Up to Date",
          description: "Your subscription telemetry is up to date."
        });
      }
    },
    onError: async (err) => {
      await refetchMySub();
      toast({ variant: "destructive", title: "Status Refresh Notice", description: err.message });
    }
  });

  // Auto-poll payment status every 5 seconds while a payment confirmation modal is open
  useEffect(() => {
    const txnId = activeGatewaySession?.transaction?._id;
    if (!upgradeOpen || !txnId) return;

    const timer = setInterval(async () => {
      try {
        const res = await api.verifyGatewayTransaction(txnId);
        if (res?.transaction?.status === "paid" || res?.alreadySettled) {
          clearInterval(timer);
          setActiveGatewaySession(null);
          setUpgradeOpen(false);
          queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
          queryClient.invalidateQueries({ queryKey: ["stats"] });
          toast({
            title: "Subscription Activated",
            description: "Payment confirmed! Your subscription is now active."
          });
        } else if (res?.transaction?.status === "failed" || res?.transaction?.status === "cancelled") {
          clearInterval(timer);
          queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
          toast({
            variant: "destructive",
            title: `Payment ${res.transaction.status}`,
            description: res.transaction.failureReason || "The payment was not completed."
          });
        }
      } catch {
        // Ignore transient polling errors cleanly
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [upgradeOpen, activeGatewaySession?.transaction?._id]);

  const etimsMutation = useMutation({
    mutationFn: (invoiceId) => api.submitInvoiceToEtims(invoiceId),
    onSuccess: (res) => {
      toast({
        title: res.submission?.status === "validated" ? "eTIMS Validated" : "eTIMS Submission Recorded",
        description: res.submission?.lastError || `CU Receipt: ${res.submission?.etimsReceiptNo}`
      });
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "eTIMS Error", description: err.message });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelSubscription("Cancelled from Landlord Billing Dashboard"),
    onSuccess: (res) => {
      toast({ title: "Auto-Renewal Cancelled", description: res.message });
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  });

  const handlePlanSelection = async (plan) => {
    setSelectedPlanCode(plan.code);
    const defaultUnits = plan.isCustomUnlimited ? 150 : plan.maxUnits;
    setDesiredUnits(defaultUnits);
    setDowngradeNote(null);

    const currentUnits = mySubData?.entitlement?.registeredUnits || 0;
    if (!plan.isCustomUnlimited && defaultUnits < currentUnits) {
      try {
        const preview = await api.previewDowngrade({ targetPlanCode: plan.code, desiredUnits: defaultUnits });
        setDowngradeNote(preview);
      } catch {}
    }
  };

  const handleStartCheckout = () => {
    if (subscribeMutation.isPending) return;
    const cleanPhone = String(phoneInput || "").replace(/[\s()-]/g, "").trim();
    const isValidKePhone = /^(?:254|0|\+254)?[17]\d{8}$/.test(cleanPhone);
    const isDirectIntaSendStk = mySubData?.gatewayProvider === "intasend" && paymentChannel === "mpesa_stk";
    if (isDirectIntaSendStk && !isValidKePhone) {
      toast({
        variant: "destructive",
        title: "Invalid M-Pesa Phone Number",
        description: "Enter a valid Kenyan mobile number (e.g. 0712345678, 0112345678, or 254712345678) for M-Pesa STK Push."
      });
      return;
    }
    subscribeMutation.mutate({
      planCode: selectedPlanCode,
      desiredUnits,
      billingCycle: selectedCycle,
      paymentChannel,
      promoCode,
      phone: cleanPhone,
      enableRecurring: paymentChannel === "card" ? enableRecurring : false,
      idempotencyKey: `sub_${selectedPlanCode}_${desiredUnits}_${selectedCycle}_${Date.now()}`
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

  const entitlement = mySubData?.entitlement || {};
  const activeSub = mySubData?.activeSubscription;
  const invoices = mySubData?.invoices || [];
  const receipts = mySubData?.receipts || [];
  const transactions = mySubData?.transactions || [];

  const purchasedUnits = entitlement.isUnlimited ? "Unlimited" : (entitlement.purchasedUnits ?? 5);
  const registeredUnits = entitlement.registeredUnits ?? 0;
  const availableSlots = entitlement.isUnlimited ? "Unlimited" : (entitlement.availableSlots ?? 0);
  const utilization = entitlement.utilizationPercent ?? 0;
  const statusKey = entitlement.status || activeSub?.status || "trial";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-14">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Billing &amp; Subscription Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your MakaziFlow rental unit allowance, subscription payments, invoices, and receipts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            disabled={refreshStatusMutation.isPending}
            onClick={() => refreshStatusMutation.mutate()}
            className="text-xs h-9 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshStatusMutation.isPending ? "animate-spin" : ""}`} />
            {refreshStatusMutation.isPending ? "Refreshing..." : "Refresh Status"}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setActiveGatewaySession(null);
              if (plans.length > 0 && (activeSub?.planCode || entitlement?.planCode)) {
                setSelectedPlanCode(activeSub?.planCode || entitlement.planCode);
                setDesiredUnits(activeSub?.purchasedUnits || entitlement?.purchasedUnits || 10);
              }
              setUpgradeOpen(true);
            }}
            className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-9 px-4 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 mr-1.5" /> Upgrade / Renew Subscription
          </Button>
        </div>
      </div>

      {/* Account Locked Banner after 14-day Trial or Subscription Expiry */}
      {mySubData?.isLocked && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-950 dark:text-rose-100">
              <p className="font-bold text-sm">
                Workspace Locked — Payment Required to Continue
              </p>
              <p className="mt-0.5 text-rose-800 dark:text-rose-200">
                {mySubData.lockReason || "Your 14-day free trial has expired. Complete payment below to unlock your properties, tenants, invoices, and reports immediately."}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (activeSub?.planCode || entitlement?.planCode) {
                setSelectedPlanCode(activeSub?.planCode || entitlement.planCode);
                setDesiredUnits(activeSub?.purchasedUnits || entitlement?.purchasedUnits || 5);
              }
              setUpgradeOpen(true);
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs shrink-0 cursor-pointer"
          >
            Pay Now to Unlock
          </Button>
        </div>
      )}

      {/* 14-Day Trial Countdown Banner */}
      {!mySubData?.isLocked && statusKey === "trial" && typeof mySubData?.daysRemaining === "number" && (
        <div className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          mySubData.daysRemaining <= 4
            ? "border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100"
            : "border-blue-200 bg-blue-50/70 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100"
        }`}>
          <div className="text-xs">
            <p className="font-bold">
              {mySubData.daysRemaining} day{mySubData.daysRemaining === 1 ? "" : "s"} remaining in your 14-day free trial ({entitlement.planName || activeSub?.planName || "Starter"} — {purchasedUnits} units)
            </p>
            <p className="mt-0.5 opacity-85">
              Complete subscription payment before your trial ends on{" "}
              <strong>{activeSub?.expiryDate ? new Date(activeSub.expiryDate).toLocaleDateString("en-KE") : "expiry"}</strong> to avoid workspace lock.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (activeSub?.planCode || entitlement?.planCode) {
                setSelectedPlanCode(activeSub?.planCode || entitlement.planCode);
                setDesiredUnits(activeSub?.purchasedUnits || entitlement?.purchasedUnits || 5);
              }
              setUpgradeOpen(true);
            }}
            className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs shrink-0 cursor-pointer"
          >
            Pay &amp; Activate Plan
          </Button>
        </div>
      )}

      {/* Warning Banner when Unit Limit Reached or Downgrade Restricted */}
      {!entitlement.isUnlimited && registeredUnits >= Number(purchasedUnits) && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-100">
              <p className="font-bold">
                {registeredUnits > Number(purchasedUnits)
                  ? `Existing ${registeredUnits} units preserved cleanly (Plan limit: ${purchasedUnits})`
                  : `You have reached your current subscription limit of ${purchasedUnits} rental units.`}
              </p>
              <p className="mt-0.5 text-amber-700 dark:text-amber-200">
                Upgrade your subscription to add more units. Existing properties, units, and tenant records remain accessible.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setUpgradeOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs shrink-0 cursor-pointer"
          >
            Upgrade Plan
          </Button>
        </div>
      )}

      {/* Current Subscription & Unit Utilization Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardDescription className="text-xs uppercase font-semibold tracking-wider text-slate-500">
                  Current Subscription
                </CardDescription>
                <CardTitle className="text-xl font-bold mt-1 flex items-center gap-2.5">
                  <span>{entitlement.planName || activeSub?.planName || "Starter"} Plan</span>
                  <Badge className={`text-[11px] uppercase border ${STATUS_BADGE[statusKey] || STATUS_BADGE.trial}`}>
                    {statusKey.replace("_", " ")}
                  </Badge>
                </CardTitle>
              </div>
              {activeSub && ["active", "trial"].includes(activeSub.status) && activeSub.autoRenew && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                >
                  Cancel Auto-Renewal
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {subLoading ? (
              <div className="py-8 flex items-center justify-center text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading subscription telemetry...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] text-slate-500">Purchased Units</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{purchasedUnits}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] text-slate-500">Registered Units</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{registeredUnits}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] text-slate-500">Available Slots</p>
                    <p className="text-lg font-bold text-emerald-600 mt-0.5">{availableSlots}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] text-slate-500">Billing Cycle</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white capitalize mt-1">
                      {(activeSub?.billingCycle || "monthly").replace("_", "-")}
                    </p>
                  </div>
                </div>

                {/* Unit Utilization Progress Bar */}
                {!entitlement.isUnlimited && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Unit Utilization ({registeredUnits} / {purchasedUnits} slots)
                      </span>
                      <span className={`font-bold ${utilization >= 100 ? "text-rose-600" : utilization >= 80 ? "text-amber-600" : "text-emerald-600"}`}>
                        {utilization}%
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          utilization >= 100 ? "bg-rose-500" : utilization >= 80 ? "bg-amber-500" : "bg-[#00a99d]"
                        }`}
                        style={{ width: `${Math.min(100, utilization)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-500 block">Start Date</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {activeSub?.startDate ? new Date(activeSub.startDate).toLocaleDateString("en-KE") : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Expiry Date</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {activeSub?.expiryDate ? new Date(activeSub.expiryDate).toLocaleDateString("en-KE") : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Next Renewal Date</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {activeSub?.renewalDate ? new Date(activeSub.renewalDate).toLocaleDateString("en-KE") : "—"}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Centralized Payment Gateway Info Card */}
        <Card className="shadow-xs bg-linear-to-br from-[#0d2240] to-[#163354] text-white border-0">
          <CardHeader>
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified Payment Gateway</span>
            </div>
            <CardTitle className="text-lg mt-1">Need Higher Capacity?</CardTitle>
            <CardDescription className="text-slate-300 text-xs">
              Upgrade seamlessly via M-Pesa STK Push, Visa, Mastercard, or Bank Transfer / PesaLink.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => setUpgradeOpen(true)}
              className="w-full bg-[#00a99d] hover:bg-[#009488] text-white font-semibold text-xs h-10 cursor-pointer"
            >
              Upgrade Subscription
            </Button>
            <div className="text-[11px] text-slate-300 space-y-1 pt-2 border-t border-white/10">
              <p>Billing Support Desk:</p>
              <p className="font-semibold text-white">Tel: 0790264792 | info@afrinextech.co.ke</p>
            </div>
            <div className="pt-3 border-t border-white/10 text-center">
              {mySubData?.gatewayProvider === "intasend" ? (
                <>
                  <a
                    href="https://intasend.com/security"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <img
                      src="https://intasend-prod-static.s3.amazonaws.com/img/trust-badges/intasend-trust-badge-with-mpesa-hr-dark.png"
                      alt="IntaSend Secure Payments (PCI-DSS Compliant)"
                      className="mx-auto w-full max-w-[320px] h-auto"
                    />
                  </a>
                  <strong>
                    <a
                      href="https://intasend.com/security"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[#fafafa] no-underline text-[11px] mt-1.5 hover:underline"
                    >
                      Secured by IntaSend Payments
                    </a>
                  </strong>
                </>
              ) : (
                <div className="rounded-lg bg-white/10 px-3 py-2.5 text-[11px] text-slate-200 space-y-1">
                  <p className="font-semibold text-white">Secured by Pesapal API 3.0</p>
                  <p className="text-[10px] text-cyan-200">Supports M-Pesa · Airtel Money · Visa · Mastercard</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices, Receipts & Payment History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Invoices (with KRA eTIMS Submission) */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-[#0b1065]" />
              Subscription Invoices &amp; eTIMS Status
            </CardTitle>
            <CardDescription className="text-xs">
              SaaS subscription tax invoices are strictly separated from tenant rental invoices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No subscription invoices issued yet.</p>
            ) : (
              <div className="space-y-2.5">
                {invoices.map((inv) => (
                  <div key={inv._id} className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{inv.invoiceNumber}</span>
                        <Badge className={`text-[10px] uppercase ${STATUS_BADGE[inv.status] || "bg-slate-100 text-slate-700"}`}>
                          {inv.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        KES {Number(inv.totalAmount).toLocaleString()} (VAT: KES {Number(inv.taxAmount || 0).toLocaleString()}) · eTIMS:{" "}
                        <strong className={inv.etimsStatus === "validated" ? "text-emerald-600" : "text-slate-600"}>
                          {inv.etimsStatus}
                        </strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadAuthFile(`/v2/payments/invoices/${inv._id}/pdf`, `${inv.invoiceNumber}.pdf`)}
                        className="h-7 px-2.5 text-[11px] cursor-pointer"
                      >
                        <Download className="w-3 h-3 mr-1" /> PDF
                      </Button>
                      {inv.etimsStatus !== "validated" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={etimsMutation.isPending}
                          onClick={() => etimsMutation.mutate(inv._id)}
                          className="h-7 px-2.5 text-[11px] cursor-pointer"
                        >
                          Submit eTIMS
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Payment History & Official Receipts */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              Payment History &amp; Receipts
            </CardTitle>
            <CardDescription className="text-xs">
              Verify pending payments or download verified PDF receipts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {receipts.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase text-slate-500">Official Receipts</p>
                {receipts.map((rct) => (
                  <div key={rct._id} className="border rounded-lg p-2.5 flex items-center justify-between text-xs bg-emerald-50/40 dark:bg-emerald-950/10">
                    <div>
                      <span className="font-mono font-bold">{rct.receiptNumber}</span>
                      <span className="text-slate-500 ml-2">KES {Number(rct.amount).toLocaleString()}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadAuthFile(`/v2/payments/receipts/${rct._id}/pdf`, `${rct.receiptNumber}.pdf`)}
                      className="h-7 px-2.5 text-[11px] cursor-pointer"
                    >
                      <Download className="w-3 h-3 mr-1" /> Receipt PDF
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase text-slate-500">Payment Transactions</p>
              {transactions.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No subscription transactions recorded yet.</p>
              ) : (
                transactions.map((txn) => (
                  <div key={txn._id} className="border rounded-lg p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">{txn.accountReference}</span>
                        <Badge className="text-[10px] uppercase">{txn.status}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        KES {Number(txn.amount).toLocaleString()} · {formatChannelLabel(txn.paymentChannel, txn.paymentMethodDetail)}
                      </p>
                    </div>
                    {["pending", "processing"].includes(txn.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={verifyMutation.isPending}
                        onClick={() => verifyMutation.mutate(txn._id)}
                        className="h-7 px-2.5 text-[11px] cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 mr-1 ${verifyMutation.isPending ? "animate-spin" : ""}`} /> Verify
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade / Subscribe Checkout Modal */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upgrade or Renew MakaziFlow Subscription</DialogTitle>
            <DialogDescription>
              Choose your plan, rental unit allowance, billing cycle (Monthly/Annual), and preferred payment method.
            </DialogDescription>
          </DialogHeader>

          {activeGatewaySession ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900">
                    Pending Payment Verification
                  </span>
                  <Badge className="bg-amber-100 text-amber-800">Awaiting Confirmation</Badge>
                </div>
                <p className="text-blue-800">
                  Reference: <strong className="font-mono">{activeGatewaySession.transaction?.accountReference}</strong>
                  {activeGatewaySession.gateway?.trackingId && (
                    <> · Tracking ID: <strong className="font-mono">{activeGatewaySession.gateway.trackingId}</strong></>
                  )}
                  {" "}· Amount: <strong>KES {Number(activeGatewaySession.transaction?.amount || 0).toLocaleString()}</strong>
                </p>
                <div className="pt-2 flex flex-wrap gap-2">
                  {activeGatewaySession.gateway?.checkoutUrl && /^https:\/\//i.test(activeGatewaySession.gateway.checkoutUrl) && (
                    <a
                      href={activeGatewaySession.gateway.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0b1065] text-white font-semibold hover:bg-[#161c8a]"
                    >
                      Complete Secure Payment <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={verifyMutation.isPending}
                    onClick={() => verifyMutation.mutate(activeGatewaySession.transaction._id)}
                    className="cursor-pointer"
                  >
                    {verifyMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                    Verify Payment Status
                  </Button>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveGatewaySession(null)} className="text-xs">
                Choose Another Plan / Method
              </Button>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              {/* Billing Cycle */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">1. Select Billing Period</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BILLING_CYCLES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCycle(c.id)}
                      className={`px-3 py-2 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                        selectedCycle === c.id
                          ? "bg-[#0b1065] text-white border-[#0b1065]"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plan Cards */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">2. Select Subscription Plan</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {plans.map((plan) => {
                    const price = Number(plan.pricing?.[selectedCycle] || plan.pricing?.monthly || 0);
                    const isSelected = selectedPlanCode === plan.code;
                    return (
                      <button
                        key={plan.code}
                        type="button"
                        onClick={() => handlePlanSelection(plan)}
                        className={`text-left rounded-xl border p-3.5 transition cursor-pointer ${
                          isSelected
                            ? "border-[#0b1065] ring-2 ring-[#0b1065]/20 bg-blue-50/40 dark:bg-blue-950/20"
                            : "border-slate-200 dark:border-slate-700 hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm">{plan.name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {plan.isCustomUnlimited ? "Custom Units" : `Max ${plan.maxUnits} units`}
                          </Badge>
                        </div>
                        <p className="text-base font-extrabold text-[#0b1065] dark:text-blue-400 mt-1.5">
                          KES {price.toLocaleString()}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {downgradeNote?.exceedsNewLimit && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{downgradeNote.warningMessage}</span>
                </div>
              )}

              {/* Unit Allowance + Phone + Promo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Unit Allowance</Label>
                  <Input
                    type="number"
                    min={1}
                    max={selectedPlanObj?.isCustomUnlimited ? 50000 : (selectedPlanObj?.maxUnits || 100)}
                    value={desiredUnits}
                    onChange={(e) => setDesiredUnits(Number(e.target.value || 1))}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">M-Pesa / Contact Phone</Label>
                  <Input
                    placeholder="e.g. 0712345678"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Promo Code (Optional)</Label>
                  <Input
                    placeholder="PROMO..."
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Payment Channel */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">3. Choose Payment Method</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PAYMENT_CHANNELS.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setPaymentChannel(ch.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs text-left cursor-pointer ${
                        paymentChannel === ch.id
                          ? "border-[#00a99d] bg-emerald-50/40 dark:bg-emerald-950/20 font-semibold"
                          : "border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <ch.icon className="w-4 h-4 text-[#00a99d] shrink-0" />
                      <span>{ch.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">
                  M-Pesa renewals require explicit payment confirmation per cycle; recurring card billing applies only where enabled with your consent at checkout.
                </p>
                {paymentChannel === "card" && (
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableRecurring}
                      onChange={(e) => setEnableRecurring(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>Enable optional automatic card renewal (where supported on Pesapal checkout)</span>
                  </label>
                )}
              </div>

              {/* Calculated Total */}
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Total Payable (Verified Server Pricing · KES)</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">
                    KES {Number(quoteData?.finalAmount ?? selectedPlanObj?.pricing?.[selectedCycle] ?? 0).toLocaleString()}
                  </p>
                </div>
                <Button
                  disabled={subscribeMutation.isPending}
                  onClick={handleStartCheckout}
                  className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-10 px-6 cursor-pointer"
                >
                  {subscribeMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  Proceed to Payment
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeOpen(false)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
