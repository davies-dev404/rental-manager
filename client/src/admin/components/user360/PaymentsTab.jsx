import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import DataTable from "../DataTable";
import ConfirmDialog from "../ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import {
  Search,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  RotateCcw,
  Loader2
} from "lucide-react";
import { formatKES, formatDate, formatDateTime, statusBadgeClass } from "./formatters";

const METHOD_COLORS = ["#102B4C", "#00B8B0", "#16385E", "#16A36A", "#E9A23B", "#738197"];

const DATE_RANGES = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 Days" },
  { id: "30d", label: "Last 30 Days" },
  { id: "3m", label: "Last 3 Months" },
  { id: "12m", label: "Last 12 Months" },
  { id: "custom", label: "Custom" }
];

export default function PaymentsTab({ userId, globalSearch = "" }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [range, setRange] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [inspectId, setInspectId] = useState(null);
  const [reverseTarget, setReverseTarget] = useState(null);

  const effectiveSearch = search || globalSearch;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-user-payments", userId, range, startDate, endDate, effectiveSearch, statusFilter, methodFilter, propertyFilter, page],
    queryFn: () =>
      adminService.getUserPayments(userId, {
        range,
        startDate: range === "custom" ? startDate : "",
        endDate: range === "custom" ? endDate : "",
        search: effectiveSearch,
        status: statusFilter,
        method: methodFilter,
        propertyId: propertyFilter,
        page,
        limit: 15
      }),
    enabled: Boolean(userId)
  });

  const { data: investigation, isLoading: isInspecting } = useQuery({
    queryKey: ["admin-user-payment-inspect", userId, inspectId],
    queryFn: () => adminService.getUserPaymentInvestigation(userId, inspectId),
    enabled: Boolean(userId && inspectId)
  });

  const verifyMutation = useMutation({
    mutationFn: (gatewayTxId) => adminService.verifyPayment(gatewayTxId),
    onSuccess: (res) => {
      toast({ title: "Gateway Verification Complete", description: res?.message || "Transaction status synchronized with provider." });
      queryClient.invalidateQueries({ queryKey: ["admin-user-payments", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-payment-inspect", userId, inspectId] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Verification Failed", description: err.message })
  });

  const reverseMutation = useMutation({
    mutationFn: ({ gatewayTxId, reason }) => adminService.reversePayment(gatewayTxId, reason),
    onSuccess: () => {
      toast({ title: "Transaction Reversed", description: "Reversal recorded in immutable audit trail." });
      queryClient.invalidateQueries({ queryKey: ["admin-user-payments", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-payment-inspect", userId, inspectId] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", userId] });
      setReverseTarget(null);
    },
    onError: (err) => toast({ variant: "destructive", title: "Reversal Failed", description: err.message })
  });

  if (isError) {
    return (
      <Card className="p-6 text-center space-y-3 bg-white border-[#E1E7EF]">
        <p className="text-xs text-[#DC4545]">Failed to load financial intelligence records.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
        </Button>
      </Card>
    );
  }

  const ov = data?.overview || {};
  const an = data?.analytics || {};
  const recon = data?.reconciliation || {};

  const overviewCards = [
    { label: "Total Revenue Collected", value: formatKES(ov.totalRevenueCollected || 0), accent: "text-[#00B8B0]" },
    { label: "Expected Monthly Rent", value: formatKES(ov.expectedRent || 0) },
    { label: "Outstanding Rent", value: formatKES(ov.outstandingRent || 0), accent: ov.outstandingRent > 0 ? "text-[#E9A23B]" : "" },
    { label: "Overdue Rent", value: formatKES(ov.overdueRent || 0), accent: ov.overdueRent > 0 ? "text-[#DC4545]" : "" },
    { label: "Successful Transactions", value: ov.successfulCount || 0, accent: "text-[#16A36A]" },
    { label: "Failed Transactions", value: ov.failedCount || 0, accent: ov.failedCount > 0 ? "text-[#DC4545]" : "" },
    { label: "Pending Transactions", value: ov.pendingCount || 0, accent: ov.pendingCount > 0 ? "text-[#E9A23B]" : "" },
    { label: "Refunded / Reversed", value: ov.reversedCount || 0, accent: "text-[#738197]" }
  ];

  const columns = [
    {
      key: "reference",
      label: "Reference",
      render: (r) => (
        <div>
          <p className="font-semibold text-[#152238] dark:text-white">{r.reference}</p>
          <p className="text-[10px] text-[#738197] font-mono">{r.internalTransactionId}</p>
        </div>
      )
    },
    {
      key: "mpesaReference",
      label: "M-Pesa Ref",
      render: (r) => <span className="font-mono text-[11px] text-[#102B4C] dark:text-slate-200">{r.mpesaReference || "—"}</span>
    },
    {
      key: "payerName",
      label: "Tenant / Payer",
      render: (r) => (
        <div>
          <p className="font-medium text-[#152238] dark:text-white">{r.payerName}</p>
          {r.payerPhone && <p className="text-[10.5px] text-[#738197]">{r.payerPhone}</p>}
        </div>
      )
    },
    {
      key: "propertyName",
      label: "Property / Unit",
      render: (r) => (
        <div>
          <p className="font-medium text-[#152238] dark:text-white">{r.propertyName}</p>
          <p className="text-[10.5px] text-[#738197]">Unit {r.unitNumber}</p>
        </div>
      )
    },
    {
      key: "method",
      label: "Method",
      render: (r) => <span className="capitalize text-[#738197]">{String(r.method || "").replace(/_/g, " ")}</span>
    },
    {
      key: "amount",
      label: "Amount",
      align: "right",
      render: (r) => <strong className="text-[#152238] dark:text-white">{formatKES(r.amount)}</strong>
    },
    {
      key: "date",
      label: "Date",
      render: (r) => <span className="text-[#738197] whitespace-nowrap">{formatDate(r.date)}</span>
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <Badge variant="outline" className={`text-[10px] uppercase ${statusBadgeClass(r.status)}`}>
          {r.status}
        </Badge>
      )
    },
    {
      key: "reconciliationStatus",
      label: "Reconciliation",
      render: (r) => (
        <Badge variant="outline" className={`text-[10px] capitalize ${statusBadgeClass(r.reconciliationStatus)}`}>
          {String(r.reconciliationStatus || "pending").replace(/_/g, " ")}
        </Badge>
      )
    },
    {
      key: "actions",
      label: "Inspect",
      align: "right",
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => setInspectId(r._id)} className="h-7 px-2 text-[11px] cursor-pointer">
          <Eye className="w-3.5 h-3.5 mr-1" /> Details
        </Button>
      )
    }
  ];

  const txDetail = investigation?.transaction;

  return (
    <div className="space-y-5">
      {/* Date Range Filter Strip */}
      <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {DATE_RANGES.map((dr) => (
              <button
                key={dr.id}
                type="button"
                onClick={() => { setRange(dr.id); setPage(1); }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  range === dr.id
                    ? "bg-[#102B4C] text-white"
                    : "bg-[#F4F6FA] text-[#738197] hover:text-[#152238]"
                }`}
              >
                {dr.label}
              </button>
            ))}
          </div>
          {range === "custom" && (
            <div className="flex items-center gap-2 text-xs">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-xs w-36" />
              <span className="text-[#738197]">to</span>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 text-xs w-36" />
            </div>
          )}
        </div>
      </Card>

      {/* 8 Financial Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {overviewCards.map((c) => (
          <Card key={c.label} className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs p-3.5">
            <span className="text-[11px] text-[#738197] block">{c.label}</span>
            <strong className={`text-base sm:text-lg font-bold ${c.accent || "text-[#152238] dark:text-white"}`}>{c.value}</strong>
          </Card>
        ))}
      </div>

      {/* Interactive Financial Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white">Monthly Revenue Trends</CardTitle>
            <p className="text-[11px] text-[#738197]">Confirmed collections vs failed attempts (KES)</p>
          </CardHeader>
          <CardContent style={{ height: 230 }}>
            {(an.monthlyRevenueTrend || []).every((m) => m.collected === 0 && m.failed === 0) ? (
              <div className="h-full flex items-center justify-center text-xs text-[#738197]">No revenue recorded in this period.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={an.monthlyRevenueTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1E7EF" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#738197" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#738197" }} />
                  <Tooltip formatter={(v) => formatKES(v)} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="collected" name="Collected (KES)" fill="#00B8B0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failed" name="Failed (KES)" fill="#DC4545" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white">Collections by Property</CardTitle>
            <p className="text-[11px] text-[#738197]">Confirmed revenue breakdown across properties</p>
          </CardHeader>
          <CardContent style={{ height: 230 }}>
            {(an.collectionsByProperty || []).length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#738197]">No property collections in this period.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={an.collectionsByProperty} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1E7EF" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#738197" }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#738197" }} />
                  <Tooltip formatter={(v) => formatKES(v)} />
                  <Bar dataKey="amount" name="Collected (KES)" fill="#102B4C" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white">Payment Method Distribution</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 210 }}>
            {(an.methodDistribution || []).length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#738197]">No payment method data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={an.methodDistribution} dataKey="amount" nameKey="method" cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3}>
                    {an.methodDistribution.map((_, i) => (
                      <Cell key={i} fill={METHOD_COLORS[i % METHOD_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatKES(v)} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white">Successful vs Failed Transactions</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 210 }}>
            {(an.statusComparison || []).length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#738197]">No transactions recorded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={an.statusComparison} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3}>
                    {an.statusComparison.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white">Collected vs Outstanding Rent</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 210 }}>
            {(an.collectedVsOutstanding || []).every((d) => d.amount === 0) ? (
              <div className="h-full flex items-center justify-center text-xs text-[#738197]">No rent balances recorded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={an.collectedVsOutstanding}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1E7EF" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#738197" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#738197" }} />
                  <Tooltip formatter={(v) => formatKES(v)} />
                  <Bar dataKey="amount" name="Amount (KES)" radius={[4, 4, 0, 0]}>
                    {(an.collectedVsOutstanding || []).map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* M-Pesa & Gateway Reconciliation Panel */}
      <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-[#152238] dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00B8B0]" /> M-Pesa &amp; Payment Reconciliation Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-2.5 rounded-lg bg-[#16A36A]/10 border border-[#16A36A]/20">
              <span className="text-[10.5px] text-[#738197] block">Reconciled</span>
              <strong className="text-base text-[#16A36A]">{recon.reconciledCount || 0}</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-[#E9A23B]/10 border border-[#E9A23B]/25">
              <span className="text-[10.5px] text-[#738197] block">Pending Verification</span>
              <strong className="text-base text-[#B47412]">{recon.pendingCount || 0}</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-[#DC4545]/10 border border-[#DC4545]/20">
              <span className="text-[10.5px] text-[#738197] block">Amount Mismatches</span>
              <strong className="text-base text-[#DC4545]">{recon.mismatchCount || 0}</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-[#DC4545]/10 border border-[#DC4545]/20">
              <span className="text-[10.5px] text-[#738197] block">Unmatched / Duplicate Refs</span>
              <strong className="text-base text-[#DC4545]">
                {(recon.unmatchedCount || 0) + (recon.duplicateRefs?.length || 0)}
              </strong>
            </div>
          </div>

          {(recon.duplicateRefs || []).length > 0 && (
            <div className="p-2.5 rounded-lg bg-[#DC4545]/10 border border-[#DC4545]/25 text-[#DC4545] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Duplicate M-Pesa Reference Warning:</strong>{" "}
                {recon.duplicateRefs.map((d) => `${d.reference} (${d.count}x)`).join(", ")}
              </div>
            </div>
          )}

          {(recon.flaggedRecords || []).length === 0 && (recon.duplicateRefs || []).length === 0 && (
            <div className="flex items-center gap-2 text-[#16A36A] text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>No unmatched transactions, amount mismatches, or duplicate M-Pesa references detected in this period.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Table Controls */}
      <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#738197] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search ref, M-Pesa code, payer..."
                className="h-8 pl-8 text-xs border-[#E1E7EF]"
              />
            </div>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-8 px-2.5 rounded-md border border-[#E1E7EF] bg-white text-xs">
              <option value="all">All Statuses</option>
              <option value="paid">Successful / Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="reversed">Reversed / Refunded</option>
            </select>
            <select value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }} className="h-8 px-2.5 rounded-md border border-[#E1E7EF] bg-white text-xs">
              <option value="all">All Methods</option>
              {(data?.filters?.methods || []).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select value={propertyFilter} onChange={(e) => { setPropertyFilter(e.target.value); setPage(1); }} className="h-8 px-2.5 rounded-md border border-[#E1E7EF] bg-white text-xs">
              <option value="all">All Properties</option>
              {(data?.filters?.properties || []).map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            onClick={() =>
              adminService.exportUserPaymentsCsv(userId, {
                range,
                startDate: range === "custom" ? startDate : "",
                endDate: range === "custom" ? endDate : "",
                search: effectiveSearch,
                status: statusFilter,
                method: methodFilter,
                propertyId: propertyFilter
              })
            }
            className="h-8 text-xs bg-[#102B4C] hover:bg-[#16385E] text-white cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </Button>
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
        emptyMessage="No payment transactions match your filters."
        pagination={data?.pagination}
        onPageChange={setPage}
      />

      {/* Transaction Investigation Drawer */}
      <Sheet open={Boolean(inspectId)} onOpenChange={(o) => !o && setInspectId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base font-bold text-[#152238]">Transaction Investigation</SheetTitle>
            <SheetDescription className="text-xs text-[#738197]">
              Read-only financial inspection with audited gateway verification and reversal workflows.
            </SheetDescription>
          </SheetHeader>

          {isInspecting || !txDetail ? (
            <div className="py-12 text-center text-xs text-[#738197]">
              <Loader2 className="w-5 h-5 animate-spin inline-block mr-2 text-[#00B8B0]" />
              Loading transaction record...
            </div>
          ) : (
            <div className="mt-4 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F4F6FA] border border-[#E1E7EF] flex items-center justify-between">
                <div>
                  <span className="text-[10.5px] text-[#738197] block">Transaction Amount</span>
                  <strong className="text-xl text-[#102B4C]">{formatKES(txDetail.amount)}</strong>
                </div>
                <div className="text-right space-y-1">
                  <Badge variant="outline" className={`text-[10.5px] uppercase ${statusBadgeClass(txDetail.status)}`}>
                    {txDetail.status}
                  </Badge>
                  <div className="text-[10.5px] text-[#738197] capitalize">
                    Recon: {String(txDetail.reconciliationStatus || "").replace(/_/g, " ")}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-[#E1E7EF]">
                <div><span className="text-[#738197] block text-[10.5px]">Internal Transaction ID</span><strong className="font-mono break-all">{txDetail.internalTransactionId}</strong></div>
                <div><span className="text-[#738197] block text-[10.5px]">Payment Reference</span><strong className="font-mono break-all">{txDetail.reference}</strong></div>
                <div><span className="text-[#738197] block text-[10.5px]">M-Pesa Receipt No.</span><strong className="font-mono">{txDetail.mpesaReceiptNumber}</strong></div>
                <div><span className="text-[#738197] block text-[10.5px]">Expected Amount</span><strong>{formatKES(txDetail.expectedAmount)}</strong></div>
                <div><span className="text-[#738197] block text-[10.5px]">Payer / Tenant</span><strong>{txDetail.payer?.name}</strong></div>
                <div><span className="text-[#738197] block text-[10.5px]">Payer Contact</span><strong>{txDetail.payer?.phone || txDetail.payer?.email}</strong></div>
                <div><span className="text-[#738197] block text-[10.5px]">Property</span><strong>{txDetail.propertyName}</strong></div>
                <div><span className="text-[#738197] block text-[10.5px]">Unit</span><strong>{txDetail.unitNumber}</strong></div>
                <div><span className="text-[#738197] block text-[10.5px]">Payment Method</span><strong className="capitalize">{String(txDetail.method).replace(/_/g, " ")}</strong></div>
                <div><span className="text-[#738197] block text-[10.5px]">Payment Date</span><strong>{formatDateTime(txDetail.paymentDate)}</strong></div>
              </div>

              {txDetail.gatewayTransactionId && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={verifyMutation.isPending}
                    onClick={() => verifyMutation.mutate(txDetail.gatewayTransactionId)}
                    className="text-xs border-[#00B8B0] text-[#00B8B0] hover:bg-[#00B8B0]/10 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Re-Verify with Gateway
                  </Button>
                  {txDetail.status !== "reversed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReverseTarget(txDetail)}
                      className="text-xs border-[#DC4545]/40 text-[#DC4545] hover:bg-[#DC4545]/10 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Authorized Reversal
                    </Button>
                  )}
                </div>
              )}

              <div>
                <h4 className="font-bold text-[#152238] mb-2">Related Audit History</h4>
                {(investigation?.auditHistory || []).length === 0 ? (
                  <p className="text-[#738197]">No administrative audit entries recorded for this transaction.</p>
                ) : (
                  <div className="space-y-1.5">
                    {investigation.auditHistory.map((log) => (
                      <div key={log._id} className="p-2 rounded-lg border border-[#E1E7EF] bg-[#F4F6FA]/60">
                        <div className="flex justify-between">
                          <strong className="text-[#102B4C]">{log.action}</strong>
                          <span className="text-[10px] text-[#738197]">{formatDateTime(log.createdAt)}</span>
                        </div>
                        <p className="text-[11px] text-[#738197] mt-0.5">{log.details}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(reverseTarget)}
        onOpenChange={(o) => !o && setReverseTarget(null)}
        title="Authorize Transaction Reversal"
        description={`Reverse transaction ${reverseTarget?.internalTransactionId || ""} (${formatKES(reverseTarget?.amount || 0)})? This does not delete financial history and writes an immutable audit log entry.`}
        confirmLabel="Confirm Reversal"
        confirmVariant="destructive"
        requireReason
        isPending={reverseMutation.isPending}
        onConfirm={(reason) =>
          reverseMutation.mutate({ gatewayTxId: reverseTarget.gatewayTransactionId, reason })
        }
      />
    </div>
  );
}
