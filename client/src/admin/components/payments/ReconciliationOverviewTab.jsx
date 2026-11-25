import React from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import { adminHref } from "../../utils/msimamiziMode";
import StatCard from "../StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Award,
  AlertTriangle,
  CopyCheck,
  Unlink2,
  FileWarning,
  Eye,
  UserCheck
} from "lucide-react";

export default function ReconciliationOverviewTab({ environment = "production", provider = "all", startDate = "", endDate = "" }) {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reconciliation-overview", environment, provider, startDate, endDate],
    queryFn: () => adminService.getReconciliationOverview({ environment, provider, startDate, endDate })
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        Computing financial separation &amp; gateway reconciliation metrics...
      </div>
    );
  }

  const saas = data?.saasRevenue || {};
  const rent = data?.rentalCollections || {};
  const disc = data?.discrepancies || {};
  const gateways = data?.gatewayBreakdown || [];
  const duplicates = data?.duplicateReferences || [];
  const mismatches = data?.amountMismatchTransactions || [];
  const failedOrReversed = data?.failedOrReversedTransactions || [];

  return (
    <div className="space-y-5">
      {/* Strict Separation Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-[#0d2240]/20 bg-white dark:bg-slate-900 shadow-xs rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#0d2240] dark:text-[#00d4c8] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#00a99d]" /> AfriNexTech SaaS Subscription Revenue
            </CardTitle>
            <CardDescription className="text-xs">
              Strictly isolated platform subscription, renewal &amp; unit-upgrade fees paid to AfriNexTech.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70">
              <span className="text-[10.5px] text-slate-500 block">Settled Revenue</span>
              <strong className="text-sm font-extrabold text-[#00a99d]">
                KES {Number(saas.totalVolume || 0).toLocaleString()}
              </strong>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70">
              <span className="text-[10.5px] text-slate-500 block">Paid Txns</span>
              <strong className="text-sm">{saas.paidCount || 0}</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70">
              <span className="text-[10.5px] text-slate-500 block">Pending</span>
              <strong className="text-sm text-amber-600">{saas.pendingCount || 0}</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70">
              <span className="text-[10.5px] text-slate-500 block">Failed / Rev</span>
              <strong className="text-sm text-rose-600">{(saas.failedCount || 0) + (saas.reversedCount || 0)}</strong>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#00a99d]/25 bg-white dark:bg-slate-900 shadow-xs rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#0d2240] dark:text-[#00d4c8] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#00a99d]" /> Landlord Rental &amp; Utility Collections
            </CardTitle>
            <CardDescription className="text-xs">
              Tenant rent, utilities &amp; deposits collected into landlord accounts (never mixed with SaaS revenue).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70">
              <span className="text-[10.5px] text-slate-500 block">Rent Collected</span>
              <strong className="text-sm font-extrabold text-[#0d2240] dark:text-white">
                KES {Number(rent.totalVolume || 0).toLocaleString()}
              </strong>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70">
              <span className="text-[10.5px] text-slate-500 block">Settled Entries</span>
              <strong className="text-sm">{rent.paidCount || 0}</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70">
              <span className="text-[10.5px] text-slate-500 block">Pending</span>
              <strong className="text-sm text-amber-600">{rent.pendingCount || 0}</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70">
              <span className="text-[10.5px] text-slate-500 block">Failed / Rev</span>
              <strong className="text-sm text-rose-600">{(rent.failedCount || 0) + (rent.reversedCount || 0)}</strong>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discrepancy Alerts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Amount Mismatches"
          value={disc.amountMismatchCount || 0}
          subtitle="Paid differs from expected"
          icon={AlertTriangle}
          accent={disc.amountMismatchCount > 0 ? "rose" : "teal"}
        />
        <StatCard
          title="Unmatched Callbacks"
          value={disc.unmatchedCallbacksCount || 0}
          subtitle="Webhooks without ledger link"
          icon={Unlink2}
          accent={disc.unmatchedCallbacksCount > 0 ? "amber" : "teal"}
        />
        <StatCard
          title="Duplicate References"
          value={disc.duplicateReferencesCount || 0}
          subtitle={`${disc.duplicateCallbacksCount || 0} ignored duplicate callbacks`}
          icon={CopyCheck}
          accent={disc.duplicateReferencesCount > 0 ? "amber" : "teal"}
        />
        <StatCard
          title="Rejected Signatures"
          value={disc.rejectedCallbacksCount ?? disc.rejectedSignaturesCount ?? 0}
          subtitle="Blocked invalid webhooks"
          icon={FileWarning}
          accent={disc.rejectedSignaturesCount > 0 ? "rose" : "navy"}
        />
      </div>

      {/* Gateway Comparison Breakdown */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">Gateway &amp; Channel Breakdown ({environment})</CardTitle>
          <CardDescription className="text-xs">
            Direct comparison across Pesapal, IntaSend, M-Pesa C2B, Pesaflow, and manual channels.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {gateways.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No gateway transactions recorded for the selected filters.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase text-slate-500">
                  <th className="text-left py-2">Gateway / Provider</th>
                  <th className="text-right py-2">Paid Volume</th>
                  <th className="text-right py-2">Paid</th>
                  <th className="text-right py-2">Pending</th>
                  <th className="text-right py-2">Failed</th>
                  <th className="text-right py-2">Reversed</th>
                </tr>
              </thead>
              <tbody>
                {gateways.map((g) => (
                  <tr key={g.provider} className="border-b border-slate-100 dark:border-slate-800/60">
                    <td className="py-2.5 font-semibold capitalize">{String(g.provider).replace(/_/g, " ")}</td>
                    <td className="py-2.5 text-right font-bold tabular-nums text-[#0d2240] dark:text-[#00d4c8]">
                      KES {Number(g.paidVolume || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right text-emerald-700 font-semibold">{g.paidCount}</td>
                    <td className="py-2.5 text-right text-amber-600">{g.pendingCount}</td>
                    <td className="py-2.5 text-right text-rose-600">{g.failedCount}</td>
                    <td className="py-2.5 text-right text-slate-500">{g.reversedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Discrepancy & Failed/Reversed Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Amount Mismatches &amp; Duplicate References</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 max-h-80 overflow-y-auto text-xs">
            {mismatches.length === 0 && duplicates.length === 0 ? (
              <p className="text-xs text-emerald-600 py-4 text-center font-medium">
                Zero amount mismatches or duplicate provider references detected.
              </p>
            ) : (
              <>
                {duplicates.map((d) => (
                  <div key={`${d.provider}-${d.providerReference}`} className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                    <div className="flex justify-between font-semibold">
                      <span className="font-mono">{d.providerReference}</span>
                      <Badge variant="outline" className="text-[10px] text-amber-700">{d.occurrences}x Duplicate</Badge>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Provider: {d.provider} · Txns: {(d.transactionIds || []).join(", ")}
                    </p>
                  </div>
                ))}
                {mismatches.map((t) => (
                  <div key={t._id} className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-mono font-bold text-rose-700">{t.internalTransactionId}</p>
                      <p className="text-[11px] text-slate-600">
                        Expected KES {Number(t.amount || 0).toLocaleString()} · Paid KES {Number(t.amountPaid || 0).toLocaleString()}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setLocation(adminHref(`/payments/${t._id}`))} className="h-7 text-[11px] cursor-pointer">
                      <Eye className="w-3 h-3 mr-1" /> Inspect
                    </Button>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Failed, Reversed &amp; Refunded Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto text-xs">
            {failedOrReversed.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No failed or reversed gateway transactions in this view.</p>
            ) : (
              failedOrReversed.map((t) => (
                <div key={t._id} className="border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold text-slate-900 dark:text-white truncate">{t.internalTransactionId}</span>
                      <Badge variant="outline" className="text-[9.5px] uppercase text-rose-700 border-rose-200">{t.status}</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {t.provider} · KES {Number(t.amountPaid || t.amount || 0).toLocaleString()} · {t.failureReason || t.reversalReason || "Gateway error"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {t.landlordId?._id && (
                      <Button size="sm" variant="ghost" onClick={() => setLocation(adminHref(`/users/${t.landlordId._id}`))} title="Open Landlord 360°" className="h-7 px-2 text-[11px] cursor-pointer">
                        <UserCheck className="w-3.5 h-3.5 text-[#00a99d]" />
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setLocation(adminHref(`/payments/${t._id}`))} className="h-7 px-2 text-[11px] cursor-pointer">
                      Inspect
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
