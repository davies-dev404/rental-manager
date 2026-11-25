import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import { adminHref } from "../../utils/msimamiziMode";
import DataTable from "../DataTable";
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
  DialogFooter
} from "@/components/ui/dialog";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import {
  Search,
  Download,
  ExternalLink,
  CheckCircle2,
  Ban,
  Edit3,
  RefreshCw,
  ArrowUpDown,
  Loader2
} from "lucide-react";
import { formatKES, formatDate, statusBadgeClass } from "./formatters";

export default function PropertiesTab({ userId, globalSearch = "", onNavigateToTab }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);

  const [editProp, setEditProp] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  const effectiveSearch = search || globalSearch;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-user-properties", userId, effectiveSearch, statusFilter, verificationFilter, typeFilter, sortBy, sortDir, page],
    queryFn: () =>
      adminService.getUserProperties(userId, {
        search: effectiveSearch,
        status: statusFilter,
        verification: verificationFilter,
        type: typeFilter,
        sortBy,
        sortDir,
        page,
        limit: 10
      }),
    enabled: Boolean(userId)
  });

  const managePropMutation = useMutation({
    mutationFn: ({ propertyId, payload }) => adminService.manageUserProperty(userId, propertyId, payload),
    onSuccess: () => {
      toast({ title: "Property Updated", description: "Changes saved and logged in audit trail." });
      queryClient.invalidateQueries({ queryKey: ["admin-user-properties", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", userId] });
      setEditProp(null);
    },
    onError: (err) => toast({ variant: "destructive", title: "Update Failed", description: err.message })
  });

  const toggleSort = (col) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
    setPage(1);
  };

  if (isError) {
    return (
      <Card className="p-6 text-center space-y-3 bg-white border-[#E1E7EF]">
        <p className="text-xs text-[#DC4545]">Failed to load property portfolio analytics.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
        </Button>
      </Card>
    );
  }

  const stats = data?.stats || {};
  const breakdown = (data?.occupancyBreakdown || []).filter((d) => d.value > 0);
  const trend = data?.occupancyTrend || [];

  const statItems = [
    { label: "Total Properties", value: stats.totalProperties || 0 },
    { label: "Actual Units", value: stats.totalUnits || 0, sub: `Declared: ${stats.declaredUnitCapacity || 0}` },
    { label: "Occupied Units", value: stats.occupiedUnits || 0, accent: "text-[#16A36A]" },
    { label: "Vacant Units", value: stats.vacantUnits || 0, accent: "text-[#E9A23B]" },
    { label: "Occupancy Rate", value: `${stats.occupancyRate || 0}%`, accent: "text-[#00B8B0]" },
    { label: "Expected Monthly Rent", value: formatKES(stats.expectedMonthlyRent || 0) },
    { label: "Outstanding Rent", value: formatKES(stats.outstandingRent || 0), accent: stats.outstandingRent > 0 ? "text-[#DC4545]" : "" },
    { label: "Pending Verification", value: stats.pendingVerification || 0, accent: stats.pendingVerification > 0 ? "text-[#E9A23B]" : "" }
  ];

  const columns = [
    {
      key: "name",
      label: (
        <button type="button" onClick={() => toggleSort("name")} className="flex items-center gap-1 cursor-pointer">
          Property Name <ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      render: (r) => (
        <div>
          <p className="font-bold text-[#152238] dark:text-white">{r.name}</p>
          <p className="text-[10.5px] text-[#738197]">{r.location || "—"}</p>
        </div>
      )
    },
    { key: "type", label: "Type", render: (r) => <span className="capitalize text-[#738197]">{r.type || "Apartment"}</span> },
    {
      key: "totalUnits",
      label: (
        <button type="button" onClick={() => toggleSort("totalUnits")} className="flex items-center gap-1 cursor-pointer">
          Units <ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      render: (r) => (
        <span className="font-semibold text-[#152238] dark:text-white">
          {r.occupiedUnits}/{r.totalUnits} <span className="text-[#738197] font-normal">({r.vacantUnits} vac)</span>
        </span>
      )
    },
    {
      key: "expectedMonthlyRent",
      label: (
        <button type="button" onClick={() => toggleSort("expectedMonthlyRent")} className="flex items-center gap-1 cursor-pointer">
          Expected / Mo <ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      render: (r) => <span className="font-semibold">{formatKES(r.expectedMonthlyRent)}</span>
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <Badge variant="outline" className={`text-[10px] capitalize ${statusBadgeClass(r.status)}`}>
          {r.status}
        </Badge>
      )
    },
    {
      key: "verificationStatus",
      label: "Verification",
      render: (r) => (
        <Badge variant="outline" className={`text-[10px] capitalize ${statusBadgeClass(r.verificationStatus)}`}>
          {r.verificationStatus}
        </Badge>
      )
    },
    { key: "createdAt", label: "Registered", render: (r) => <span className="text-[#738197]">{formatDate(r.createdAt)}</span> },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="outline" onClick={() => setLocation(adminHref(`/properties/${r._id}`))} className="h-7 px-2 text-[11px] cursor-pointer" title="View Property & Units">
            <ExternalLink className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditProp({ _id: r._id, name: r.name, location: r.location, type: r.type || "Apartment" })}
            className="h-7 px-2 text-[11px] cursor-pointer"
            title="Edit Property"
          >
            <Edit3 className="w-3 h-3" />
          </Button>
          {r.verificationStatus !== "verified" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setConfirmState({
                  title: `Verify "${r.name}"`,
                  description: "Mark this property as verified by Msimamizi administration.",
                  confirmLabel: "Verify Property",
                  onConfirm: () => managePropMutation.mutateAsync({ propertyId: r._id, payload: { action: "verify" } })
                })
              }
              className="h-7 px-2 text-[11px] text-[#16A36A] border-[#16A36A]/30 cursor-pointer"
              title="Verify Property"
            >
              <CheckCircle2 className="w-3 h-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setConfirmState({
                title: r.status === "suspended" ? `Restore "${r.name}"` : `Suspend "${r.name}"`,
                description:
                  r.status === "suspended"
                    ? "Restore this property to active status."
                    : "Suspending flags this property for compliance review.",
                confirmLabel: r.status === "suspended" ? "Restore" : "Suspend",
                confirmVariant: r.status === "suspended" ? "default" : "destructive",
                requireReason: r.status !== "suspended",
                onConfirm: (reason) =>
                  managePropMutation.mutateAsync({
                    propertyId: r._id,
                    payload: { action: r.status === "suspended" ? "activate" : "suspend", reason }
                  })
              })
            }
            className={`h-7 px-2 text-[11px] cursor-pointer ${r.status === "suspended" ? "text-[#16A36A]" : "text-[#DC4545]"}`}
            title={r.status === "suspended" ? "Activate Property" : "Suspend Property"}
          >
            <Ban className="w-3 h-3" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-5">
      {/* Portfolio KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statItems.map((s) => (
          <Card key={s.label} className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs p-3.5">
            <span className="text-[11px] text-[#738197] block">{s.label}</span>
            <strong className={`text-lg font-bold ${s.accent || "text-[#152238] dark:text-white"}`}>{s.value}</strong>
            {s.sub && <span className="text-[10.5px] text-[#738197] block mt-0.5">{s.sub}</span>}
          </Card>
        ))}
      </div>

      {/* Property Occupancy Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white">Unit Occupancy Split</CardTitle>
            <p className="text-[11px] text-[#738197]">Based on actual registered units ({stats.totalUnits || 0})</p>
          </CardHeader>
          <CardContent style={{ height: 220 }}>
            {breakdown.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#738197]">No units registered yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={breakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={46} outerRadius={74} paddingAngle={3}>
                    {breakdown.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white">Monthly Occupancy &amp; Portfolio Trend</CardTitle>
            <p className="text-[11px] text-[#738197]">Historical occupancy percentage derived from registered units and active leases</p>
          </CardHeader>
          <CardContent style={{ height: 220 }}>
            {trend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#738197]">No trend data available yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1E7EF" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#738197" }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "#738197" }} />
                  <Tooltip formatter={(val, name) => (name.includes("%") ? `${val}%` : val)} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Area type="monotone" dataKey="occupancyRate" name="Occupancy %" stroke="#00B8B0" fill="#00B8B0" fillOpacity={0.18} strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters & Export Toolbar */}
      <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#738197] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search property or location..."
                className="h-8 pl-8 text-xs border-[#E1E7EF]"
              />
            </div>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-8 px-2.5 rounded-md border border-[#E1E7EF] bg-white text-xs">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="flagged">Flagged</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
            <select value={verificationFilter} onChange={(e) => { setVerificationFilter(e.target.value); setPage(1); }} className="h-8 px-2.5 rounded-md border border-[#E1E7EF] bg-white text-xs">
              <option value="all">All Verification</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
            {(data?.filters?.types || []).length > 0 && (
              <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="h-8 px-2.5 rounded-md border border-[#E1E7EF] bg-white text-xs">
                <option value="all">All Types</option>
                {data.filters.types.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => onNavigateToTab?.("tenants")} className="h-8 text-xs border-[#E1E7EF] cursor-pointer">
              View Tenants
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigateToTab?.("payments")} className="h-8 text-xs border-[#E1E7EF] cursor-pointer">
              Financial Records
            </Button>
            <Button
              size="sm"
              onClick={() => adminService.exportUserPropertiesCsv(userId, { search: effectiveSearch, status: statusFilter, verification: verificationFilter, type: typeFilter })}
              className="h-8 text-xs bg-[#102B4C] hover:bg-[#16385E] text-white cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Properties Table */}
      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
        emptyMessage="No properties match your current filters."
        pagination={data?.pagination}
        onPageChange={setPage}
      />

      {/* Edit Property Modal */}
      <Dialog open={Boolean(editProp)} onOpenChange={(o) => !o && setEditProp(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#152238]">Edit Property Details</DialogTitle>
          </DialogHeader>
          {editProp && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                managePropMutation.mutate({
                  propertyId: editProp._id,
                  payload: { name: editProp.name, location: editProp.location, type: editProp.type }
                });
              }}
              className="space-y-3 text-xs"
            >
              <div className="space-y-1">
                <Label className="text-xs">Property Name</Label>
                <Input value={editProp.name} onChange={(e) => setEditProp({ ...editProp, name: e.target.value })} required className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Location</Label>
                <Input value={editProp.location} onChange={(e) => setEditProp({ ...editProp, location: e.target.value })} required className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Property Type</Label>
                <Input value={editProp.type} onChange={(e) => setEditProp({ ...editProp, type: e.target.value })} className="h-8 text-xs" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditProp(null)} className="text-xs cursor-pointer">Cancel</Button>
                <Button type="submit" size="sm" disabled={managePropMutation.isPending} className="bg-[#102B4C] text-white text-xs cursor-pointer">
                  {managePropMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
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
        isPending={managePropMutation.isPending}
        onConfirm={async (reason) => {
          if (confirmState?.onConfirm) await confirmState.onConfirm(reason);
          setConfirmState(null);
        }}
      />
    </div>
  );
}
