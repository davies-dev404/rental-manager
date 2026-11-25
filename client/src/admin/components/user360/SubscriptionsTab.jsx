import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import ConfirmDialog from "../ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  Award,
  CheckCircle2,
  Calendar,
  ArrowUpRight,
  Clock,
  Ban,
  PlayCircle,
  RefreshCw,
  Loader2,
  History,
  Receipt
} from "lucide-react";
import { formatKES, formatDate, formatDateTime, statusBadgeClass } from "./formatters";

export default function SubscriptionsTab({ userId }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [modalMode, setModalMode] = useState(null); // "change_plan" | "extend_trial" | "extend_subscription"
  const [selectedPlan, setSelectedPlan] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [extendDays, setExtendDays] = useState("14");
  const [reason, setReason] = useState("");
  const [confirmState, setConfirmState] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-user-subscriptions", userId],
    queryFn: () => adminService.getUserSubscriptions(userId),
    enabled: Boolean(userId)
  });

  const manageMutation = useMutation({
    mutationFn: (payload) => adminService.manageUserSubscription(userId, payload),
    onSuccess: () => {
      toast({ title: "Subscription Updated", description: "Subscription state updated and recorded in audit log." });
      queryClient.invalidateQueries({ queryKey: ["admin-user-subscriptions", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      setModalMode(null);
      setReason("");
    },
    onError: (err) => toast({ variant: "destructive", title: "Subscription Action Failed", description: err.message })
  });

  if (isLoading) {
    return <p className="text-xs text-[#738197] py-10 text-center">Loading subscription and billing records...</p>;
  }
  if (isError) {
    return (
      <Card className="p-6 text-center space-y-3 bg-white border-[#E1E7EF]">
        <p className="text-xs text-[#DC4545]">Failed to load subscription details.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
        </Button>
      </Card>
    );
  }

  const cur = data?.current || {};
  const usage = data?.usage || {};
  const plans = data?.plans || [];
  const billingHistory = data?.billingHistory || [];
  const planChanges = data?.planChangeHistory || [];

  const unitPct =
    usage.unitsAllowed && usage.unitsAllowed > 0
      ? Math.min(100, Math.round((usage.unitsRegistered / usage.unitsAllowed) * 100))
      : 0;

  const openChangePlan = () => {
    setSelectedPlan(cur.planCode || plans[0]?.code || "starter");
    setBillingCycle(cur.billingCycle || "monthly");
    setReason("");
    setModalMode("change_plan");
  };

  return (
    <div className="space-y-5">
      {/* Current Plan & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold text-[#152238] dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-[#00B8B0]" /> Current Subscription Plan
              </CardTitle>
              <p className="text-[11px] text-[#738197]">Live plan entitlement and billing schedule</p>
            </div>
            <Badge variant="outline" className={`text-xs capitalize font-semibold ${statusBadgeClass(cur.status)}`}>
              {String(cur.status || "trial").replace(/_/g, " ")}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-[#F4F6FA] dark:bg-slate-800/60">
                <span className="text-[10.5px] text-[#738197] block">Plan Name</span>
                <strong className="text-base text-[#102B4C] dark:text-white">{cur.planName}</strong>
                <span className="text-[10.5px] text-[#738197] block capitalize">{cur.billingCycle} · {formatKES(cur.priceAmount)}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#F4F6FA] dark:bg-slate-800/60">
                <span className="text-[10.5px] text-[#738197] block">Start / Renewal Date</span>
                <strong className="text-xs text-[#152238] dark:text-white block">{formatDate(cur.startDate)}</strong>
                <span className="text-[10.5px] text-[#738197] block">Renews: {formatDate(cur.renewalDate)}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#F4F6FA] dark:bg-slate-800/60">
                <span className="text-[10.5px] text-[#738197] block">
                  {cur.trialExpiryDate ? "Trial Expiry" : "Expiry / Days Left"}
                </span>
                <strong className={`text-base ${cur.daysRemaining !== null && cur.daysRemaining <= 7 ? "text-[#DC4545]" : "text-[#00B8B0]"}`}>
                  {cur.daysRemaining === null || cur.daysRemaining === undefined
                    ? "No expiry set"
                    : cur.daysRemaining >= 0
                      ? `${cur.daysRemaining} days left`
                      : `Expired ${Math.abs(cur.daysRemaining)}d ago`}
                </strong>
                <span className="text-[10.5px] text-[#738197] block">{formatDate(cur.expiryDate)}</span>
              </div>
            </div>

            {/* Subscription Controls */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={openChangePlan} className="h-8 text-xs bg-[#102B4C] hover:bg-[#16385E] text-white cursor-pointer">
                <ArrowUpRight className="w-3.5 h-3.5 mr-1.5" /> Upgrade / Downgrade Plan
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setExtendDays("14"); setReason(""); setModalMode("extend_trial"); }}
                className="h-8 text-xs border-[#E1E7EF] cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 mr-1.5 text-[#00B8B0]" /> Extend Trial
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setExtendDays("30"); setReason(""); setModalMode("extend_subscription"); }}
                className="h-8 text-xs border-[#E1E7EF] cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-[#102B4C]" /> Extend Subscription
              </Button>
              {cur.status !== "suspended" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setConfirmState({
                      title: "Suspend Subscription",
                      description: "Suspending blocks premium landlord actions until reactivated.",
                      confirmLabel: "Suspend Subscription",
                      confirmVariant: "destructive",
                      requireReason: true,
                      onConfirm: (r) => manageMutation.mutateAsync({ action: "suspend", reason: r })
                    })
                  }
                  className="h-8 text-xs border-[#DC4545]/40 text-[#DC4545] cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5 mr-1.5" /> Suspend
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() =>
                    setConfirmState({
                      title: "Reactivate Subscription",
                      description: "Restore active subscription access for this landlord.",
                      confirmLabel: "Reactivate",
                      onConfirm: () => manageMutation.mutateAsync({ action: "reactivate", reason: "Reactivated by Super Admin" })
                    })
                  }
                  className="h-8 text-xs bg-[#16A36A] hover:bg-[#128a58] text-white cursor-pointer"
                >
                  <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Reactivate
                </Button>
              )}
            </div>

            {/* Plan Features */}
            {(cur.features || []).length > 0 && (
              <div className="pt-2 border-t border-[#E1E7EF]">
                <p className="text-[11px] font-semibold text-[#738197] uppercase tracking-wider mb-2">Included Plan Features</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {cur.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs text-[#152238] dark:text-slate-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A] shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan Usage Limits */}
        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white">Account Usage &amp; Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#738197]">Units Registered / Allowed</span>
                <strong className="text-[#152238] dark:text-white">
                  {usage.unitsRegistered || 0} / {usage.unitsAllowed === null ? "Unlimited" : usage.unitsAllowed}
                </strong>
              </div>
              {usage.unitsAllowed !== null && (
                <div className="w-full h-2 bg-[#F4F6FA] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${unitPct >= 90 ? "bg-[#DC4545]" : unitPct >= 75 ? "bg-[#E9A23B]" : "bg-[#00B8B0]"}`}
                    style={{ width: `${unitPct}%` }}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between p-2.5 rounded-lg bg-[#F4F6FA] dark:bg-slate-800/60">
              <span className="text-[#738197]">Properties Registered</span>
              <strong className="text-[#152238] dark:text-white">
                {usage.propertiesRegistered || 0} / {usage.propertiesAllowed === null ? "Unlimited" : usage.propertiesAllowed}
              </strong>
            </div>

            <div className="flex justify-between p-2.5 rounded-lg bg-[#F4F6FA] dark:bg-slate-800/60">
              <span className="text-[#738197]">Team / Account Users</span>
              <strong className="text-[#152238] dark:text-white">
                {usage.usersRegistered || 1} / {usage.usersAllowed === null ? "Unlimited" : usage.usersAllowed}
              </strong>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing History & Plan Change History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#00B8B0]" /> Subscription Billing History ({billingHistory.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto text-xs">
            {billingHistory.length === 0 ? (
              <p className="text-[#738197] py-6 text-center">No subscription payments recorded yet.</p>
            ) : (
              billingHistory.map((tx) => (
                <div key={tx._id} className="border border-[#E1E7EF] rounded-lg p-2.5 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-[#152238] dark:text-white capitalize">
                      {tx.planCode || tx.paymentCategory} · {tx.billingCycle || "one-time"}
                    </p>
                    <p className="text-[10.5px] text-[#738197] font-mono">
                      {tx.providerReference || tx.accountReference} · {formatDate(tx.paidAt || tx.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatKES(tx.amountPaid > 0 ? tx.amountPaid : tx.amount)}</p>
                    <Badge variant="outline" className={`text-[9.5px] uppercase ${statusBadgeClass(tx.status)}`}>
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-[#00B8B0]" /> Plan Change &amp; Audit History ({planChanges.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto text-xs">
            {planChanges.length === 0 ? (
              <p className="text-[#738197] py-6 text-center">No plan changes audited yet.</p>
            ) : (
              planChanges.map((ev) => (
                <div key={ev._id} className="border-b border-[#E1E7EF] pb-2 last:border-0">
                  <div className="flex justify-between gap-2">
                    <strong className="uppercase text-[11px] text-[#102B4C] dark:text-white">
                      {String(ev.action || "").replace(/_/g, " ")}
                    </strong>
                    <span className="text-[10.5px] text-[#738197]">{formatDateTime(ev.createdAt)}</span>
                  </div>
                  <p className="text-[11px] text-[#738197] mt-0.5">{ev.reason || "System update"}</p>
                  <p className="text-[10px] text-[#738197]">Actor: {ev.actorId?.email || ev.actorRole || "system"}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Change Plan / Extend Modal */}
      <Dialog open={Boolean(modalMode)} onOpenChange={(o) => !o && setModalMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#152238]">
              {modalMode === "change_plan"
                ? "Upgrade or Downgrade Plan"
                : modalMode === "extend_trial"
                  ? "Extend Trial Period"
                  : "Extend Subscription"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#738197]">
              Changes take effect immediately and are recorded in the immutable subscription audit log.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (modalMode === "change_plan") {
                const curIdx = plans.findIndex((p) => p.code === cur.planCode);
                const nextIdx = plans.findIndex((p) => p.code === selectedPlan);
                const act = nextIdx >= 0 && curIdx >= 0 && nextIdx < curIdx ? "downgrade" : "upgrade";
                manageMutation.mutate({
                  action: act,
                  planCode: selectedPlan,
                  billingCycle,
                  reason: reason.trim() || `Admin ${act} to ${selectedPlan}`
                });
              } else {
                manageMutation.mutate({
                  action: modalMode,
                  extendDays: Number(extendDays || 14),
                  reason: reason.trim() || `Admin ${modalMode} (+${extendDays} days)`
                });
              }
            }}
            className="space-y-3 text-xs"
          >
            {modalMode === "change_plan" ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Select Subscription Plan</Label>
                  <select
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-md border border-[#E1E7EF] bg-white text-xs"
                  >
                    {plans.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name} ({p.isCustomUnlimited ? "Unlimited units" : `Up to ${p.maxUnits} units`} · {formatKES(p.pricing?.monthly || 0)}/mo)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Billing Cycle</Label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-md border border-[#E1E7EF] bg-white text-xs"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi_annual">Semi-Annual</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs">Number of Days to Extend</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                  required
                  className="h-8 text-xs"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Audit Reason *</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for this subscription adjustment..."
                required
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setModalMode(null)} className="text-xs cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={manageMutation.isPending} className="bg-[#102B4C] text-white text-xs cursor-pointer">
                {manageMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Apply Change
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmState)}
        onOpenChange={(o) => !o && setConfirmState(null)}
        title={confirmState?.title}
        description={confirmState?.description}
        confirmLabel={confirmState?.confirmLabel}
        confirmVariant={confirmState?.confirmVariant}
        requireReason={Boolean(confirmState?.requireReason)}
        isPending={manageMutation.isPending}
        onConfirm={async (r) => {
          if (confirmState?.onConfirm) await confirmState.onConfirm(r);
          setConfirmState(null);
        }}
      />
    </div>
  );
}
