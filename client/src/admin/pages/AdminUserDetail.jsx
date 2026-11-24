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
import { ArrowLeft, ShieldCheck, Ban, UserCheck, Building2, CreditCard, Activity } from "lucide-react";

export default function AdminUserDetail({ id }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [pendingAction, setPendingAction] = useState("");

  const { data: userDetail, isLoading } = useQuery({
    queryKey: ["admin-user-detail", id],
    queryFn: () => adminService.getUserDetail(id),
    enabled: Boolean(id)
  });

  const statusMutation = useMutation({
    mutationFn: (payload) => adminService.updateUserStatus(id, payload),
    onSuccess: (res) => {
      toast({
        title: "Account Status Updated",
        description: `${res.user?.email} is now ${(res.user?.accountStatus || "").replace(/_/g, " ")}.`
      });
      setPendingAction("");
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Action Failed", description: err.message })
  });

  if (isLoading) {
    return <p className="text-xs text-slate-500 py-8 text-center">Loading subscriber profile...</p>;
  }

  const u = userDetail?.user;
  if (!u) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setLocation(adminHref("/users"))} className="text-xs cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Users
        </Button>
        <p className="text-sm text-rose-600">Subscriber profile not found.</p>
      </div>
    );
  }

  const summary = userDetail.summary || {};

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setLocation(adminHref("/users"))} className="h-8 text-xs cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Users
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#00a99d]" />
              {u.name}
            </h1>
            <p className="text-xs text-slate-500">
              {u.email} · {u.role === "admin" || u.role === "landlord" ? "Landlord" : u.role}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs capitalize self-start sm:self-auto">
          Status: {String(u.accountStatus || "active").replace(/_/g, " ")}
        </Badge>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <Card className="bg-white dark:bg-slate-900"><CardContent className="p-3.5"><span className="text-slate-500 block">Properties</span><strong className="text-lg">{summary.propertyCount || 0}</strong></CardContent></Card>
        <Card className="bg-white dark:bg-slate-900"><CardContent className="p-3.5"><span className="text-slate-500 block">Units Occupied</span><strong className="text-lg">{summary.occupiedUnits || 0} / {summary.unitCount || 0}</strong></CardContent></Card>
        <Card className="bg-white dark:bg-slate-900"><CardContent className="p-3.5"><span className="text-slate-500 block">Tenants Registered</span><strong className="text-lg">{summary.tenantCount || 0}</strong></CardContent></Card>
        <Card className="bg-white dark:bg-slate-900"><CardContent className="p-3.5"><span className="text-slate-500 block">Payments Logged</span><strong className="text-lg">{summary.paymentsCount || 0}</strong></CardContent></Card>
        <Card className="bg-white dark:bg-slate-900"><CardContent className="p-3.5"><span className="text-slate-500 block">Revenue Generated</span><strong className="text-lg text-[#00a99d]">KES {Number(summary.revenueGenerated || 0).toLocaleString()}</strong></CardContent></Card>
      </div>

      {/* Full Registered Account & Business Details */}
      <Card className="bg-white dark:bg-slate-900 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">Full Registered Account &amp; Business Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
          <div><span className="text-slate-500 block text-[10.5px]">Full Name</span><strong>{u.name || "—"}</strong></div>
          <div><span className="text-slate-500 block text-[10.5px]">Email Address</span><strong className="break-all">{u.email || "—"}</strong></div>
          <div><span className="text-slate-500 block text-[10.5px]">Phone Number</span><strong>{u.phone || "Not provided"}</strong></div>
          <div><span className="text-slate-500 block text-[10.5px]">Company / Agency</span><strong>{u.companyName || "Individual Landlord"}</strong></div>
          <div><span className="text-slate-500 block text-[10.5px]">Physical Address</span><strong>{u.address || "Not provided"}</strong></div>
          <div><span className="text-slate-500 block text-[10.5px]">KRA PIN</span><strong>{u.kraPin || "Not provided"}</strong></div>
          <div><span className="text-slate-500 block text-[10.5px]">Role / Onboarding</span><strong className="capitalize">{u.role} ({u.onboardingRole || "landlord"})</strong></div>
          <div><span className="text-slate-500 block text-[10.5px]">Auth Provider / Verified</span><strong className="capitalize">{u.authProvider || "local"} · {u.isVerified ? "Verified" : "Unverified"}</strong></div>
          <div><span className="text-slate-500 block text-[10.5px]">Declared Initial Units</span><strong>{u.unitsCount || 0} unit(s)</strong></div>
          <div><span className="text-slate-500 block text-[10.5px]">Registered On</span><strong>{u.createdAt ? new Date(u.createdAt).toLocaleString("en-KE") : "—"}</strong></div>
          <div><span className="text-slate-500 block text-[10.5px]">Last Login</span><strong>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-KE") : "—"}</strong></div>
          <div><span className="text-slate-500 block text-[10.5px]">Subscription Plan</span><strong>{userDetail.entitlement?.planName || userDetail.subscriptions?.[0]?.planName || u.subscriptionTier || "Starter"} ({userDetail.entitlement?.status || userDetail.subscriptions?.[0]?.status || "trial"})</strong></div>
          {userDetail.businessSettings && (
            <>
              <div><span className="text-slate-500 block text-[10.5px]">M-Pesa Mode</span><strong>{userDetail.businessSettings.mpesaType || "Paybill"} {userDetail.businessSettings.paybillAccount ? `(${userDetail.businessSettings.paybillAccount})` : ""}</strong></div>
              <div><span className="text-slate-500 block text-[10.5px]">Abbreviation / Category</span><strong>{userDetail.businessSettings.abbreviatedName || "—"} · {userDetail.businessSettings.accountType || "Property Management"}</strong></div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Inline Account Status Controls (No Popup) */}
      <Card className="bg-white dark:bg-slate-900 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">Account Access Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {u.suspendedReason && (
            <p className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800">
              <strong>Current Restriction Reason:</strong> {u.suspendedReason}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {u.accountStatus !== "active" && (
              <Button size="sm" onClick={() => statusMutation.mutate({ accountStatus: "active", reason: "Activated via User Profile page" })} className="bg-[#00a99d] hover:bg-[#008f85] text-white text-xs cursor-pointer">
                <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Activate / Reactivate Account
              </Button>
            )}
            {u.accountStatus !== "suspended" && (
              <Button size="sm" variant="outline" onClick={() => setPendingAction("suspended")} className="text-rose-600 border-rose-200 text-xs cursor-pointer">
                <Ban className="w-3.5 h-3.5 mr-1.5" /> Suspend Account
              </Button>
            )}
            {u.accountStatus !== "deactivated" && (
              <Button size="sm" variant="outline" onClick={() => setPendingAction("deactivated")} className="text-slate-600 text-xs cursor-pointer">
                Deactivate Account
              </Button>
            )}
          </div>
          {pendingAction && (
            <div className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-800/60 space-y-2.5 max-w-lg">
              <Label className="text-xs font-semibold">Reason for marking account as {pendingAction}</Label>
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Provide administrative audit reason..." />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={statusMutation.isPending || !reason.trim()}
                  onClick={() => statusMutation.mutate({ accountStatus: pendingAction, reason: reason.trim() })}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs cursor-pointer"
                >
                  Confirm {pendingAction}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setPendingAction(""); setReason(""); }} className="text-xs cursor-pointer">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registered Properties & ODPP Count Only */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="bg-white dark:bg-slate-900 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#00a99d]" /> Registered Properties ({userDetail.properties?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {(userDetail.properties || []).length === 0 ? (
              <p className="text-slate-400">No properties registered under this user.</p>
            ) : (
              userDetail.properties.map((p) => (
                <div key={p._id} className="border rounded-lg p-2.5 flex justify-between items-center gap-2">
                  <div>
                    <p className="font-bold">{p.name} <span className="font-normal text-slate-500">· {p.location}</span></p>
                    <p className="text-[11px] text-slate-500">
                      {p.occupiedUnits || 0}/{p.unitCount || 0} units occupied · {p.tenantCount || 0} tenant(s) registered · KES {Number(p.revenueGenerated || 0).toLocaleString()}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setLocation(adminHref(`/properties/${p._id}`))} className="h-7 text-[11px] cursor-pointer">
                    Open Property
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#00a99d]" /> Recorded Collections ({userDetail.payments?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 max-h-72 overflow-y-auto text-xs">
            {(userDetail.payments || []).length === 0 ? (
              <p className="text-slate-400">No collections recorded yet.</p>
            ) : (
              userDetail.payments.map((pay) => (
                <div key={pay._id} className="border rounded-md p-2 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{pay.invoiceNumber || pay.reference || pay.type || "Rent Payment"} {pay.unitId?.unitNumber ? `· Unit ${pay.unitId.unitNumber}` : ""}</p>
                    <p className="text-[10.5px] text-slate-500">{pay.method} · {pay.date ? new Date(pay.date).toLocaleDateString("en-KE") : "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{pay.currency || "KES"} {Number(pay.amount || 0).toLocaleString()}</p>
                    <Badge variant="outline" className="text-[9.5px] uppercase">{pay.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Account Activity */}
      <Card className="bg-white dark:bg-slate-900 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#00a99d]" /> Recent Account Activity ({userDetail.activityLogs?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 max-h-60 overflow-y-auto text-xs">
          {(userDetail.activityLogs || []).length === 0 ? (
            <p className="text-slate-400">No recent user activity.</p>
          ) : (
            userDetail.activityLogs.map((a) => (
              <div key={a._id} className="border-b border-slate-100 py-1.5 flex justify-between">
                <span><strong>{a.action}</strong> — {a.description}</span>
                <span className="text-slate-400 shrink-0 ml-2">{new Date(a.timestamp).toLocaleString("en-KE")}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
