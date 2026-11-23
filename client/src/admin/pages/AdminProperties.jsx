import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import DataTable from "../components/DataTable";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Search, Eye, Flag, CheckCircle2, Building2 } from "lucide-react";

export default function AdminProperties() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("all");
  const [landlordId, setLandlordId] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [detailId, setDetailId] = useState(null);
  const [flagTarget, setFlagTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-properties", search, location, landlordId, type, status, page],
    queryFn: () => adminService.getProperties({ search, location, landlordId, type, status, page, limit: 15 })
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin-property-detail", detailId],
    queryFn: () => adminService.getPropertyDetail(detailId),
    enabled: Boolean(detailId)
  });

  const flagMutation = useMutation({
    mutationFn: ({ id, payload }) => adminService.flagProperty(id, payload),
    onSuccess: (res) => {
      toast({
        title: "Property Updated",
        description: `"${res.property?.name}" marked as ${res.property?.status}.`
      });
      setFlagTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
      queryClient.invalidateQueries({ queryKey: ["admin-property-detail"] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Update Failed", description: err.message })
  });

  const columns = [
    {
      key: "name",
      label: "Property",
      render: (p) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{p.name}</p>
          <p className="text-[11px] text-slate-500">{p.location} · {p.type || "Apartment"}</p>
        </div>
      )
    },
    {
      key: "landlord",
      label: "Landlord",
      render: (p) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200">{p.landlord?.name || "—"}</p>
          <p className="text-[11px] text-slate-500">{p.landlord?.email}</p>
        </div>
      )
    },
    {
      key: "occupancy",
      label: "Units & Occupancy",
      render: (p) => (
        <div>
          <p className="font-semibold">
            {p.unitStats?.occupiedUnits || 0} / {p.unitStats?.totalUnits || 0} occupied ({p.unitStats?.occupancyRate || 0}%)
          </p>
          <p className="text-[10.5px] text-slate-500">
            {p.unitStats?.tenantCount || 0} tenant(s) · KES {Number(p.unitStats?.revenueGenerated || 0).toLocaleString()}
          </p>
          <div className="w-28 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-[#00a99d]" style={{ width: `${p.unitStats?.occupancyRate || 0}%` }} />
          </div>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (p) => (
        <Badge
          variant="outline"
          className={`text-[10px] capitalize ${
            p.isFlagged || p.status === "flagged"
              ? "bg-rose-100 text-rose-700 border-rose-200"
              : p.status === "inactive"
              ? "bg-amber-100 text-amber-700 border-amber-200"
              : "bg-[#00a99d]/15 text-[#00a99d] border-[#00a99d]/30"
          }`}
        >
          {p.isFlagged ? "flagged" : p.status}
        </Badge>
      )
    },
    {
      key: "createdAt",
      label: "Registered",
      render: (p) => <span className="text-slate-500">{p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-KE") : "—"}</span>
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setDetailId(p._id)} className="h-7 px-2 text-[11px] cursor-pointer">
            <Eye className="w-3 h-3 mr-1" /> View
          </Button>
          {p.isFlagged || p.status === "flagged" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFlagTarget({ prop: p, nextStatus: "active" })}
              className="h-7 px-2 text-[11px] text-[#00a99d] cursor-pointer"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" /> Clear Flag
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFlagTarget({ prop: p, nextStatus: "flagged" })}
              className="h-7 px-2 text-[11px] text-rose-600 cursor-pointer"
            >
              <Flag className="w-3 h-3 mr-1" /> Flag
            </Button>
          )}
        </div>
      )
    }
  ];

  const filters = data?.filters || {};

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Property Management</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Monitor platform-wide properties, occupancy performance, landlord ownership, and flag suspicious listings.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name or location..."
            className="pl-8 h-8.5 text-xs"
          />
        </div>
        <select value={location} onChange={(e) => { setLocation(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
          <option value="all">All Locations</option>
          {(filters.locations || []).map((loc) => <option key={loc} value={loc}>{loc}</option>)}
        </select>
        <select value={landlordId} onChange={(e) => { setLandlordId(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
          <option value="all">All Landlords</option>
          {(filters.landlords || []).map((l) => <option key={l._id} value={l._id}>{l.name} ({l.email})</option>)}
        </select>
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
          <option value="all">All Types</option>
          {(filters.types || []).map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="flagged">Flagged</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage="No properties match your filters."
      />

      {/* Property Detail Modal */}
      <Dialog open={Boolean(detailId)} onOpenChange={() => setDetailId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#00a99d]" />
              {detail?.property?.name || "Property Details"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {detail?.property?.location} · {detail?.property?.type} · Landlord: {detail?.landlord?.name} ({detail?.landlord?.email})
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-xs text-slate-500 py-6 text-center">Loading property details...</p>
          ) : detail?.property && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg">
                <div><span className="text-slate-500 block">Total Units</span><strong>{detail.occupancy?.totalUnits || 0}</strong></div>
                <div><span className="text-slate-500 block">Occupied</span><strong>{detail.occupancy?.occupiedUnits || 0}</strong></div>
                <div><span className="text-slate-500 block">Vacant</span><strong>{detail.occupancy?.vacantUnits || 0}</strong></div>
                <div><span className="text-slate-500 block">Occupancy</span><strong>{detail.occupancy?.occupancyRate || 0}%</strong></div>
              </div>

              {detail.property.flagReason && (
                <div className="bg-rose-50 border border-rose-200 rounded-md p-2.5 text-rose-800">
                  <strong>Flag Reason:</strong> {detail.property.flagReason}
                </div>
              )}

              <div>
                <h4 className="font-bold mb-1.5">Associated Units ({detail.units?.length || 0})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                  {(detail.units || []).map((u) => (
                    <div key={u._id} className="border rounded-md p-2 flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Unit {u.unitNumber}</p>
                        <p className="text-[10.5px] text-slate-500">{u.type} · KES {Number(u.rentAmount || 0).toLocaleString()}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">{u.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(flagTarget)}
        onOpenChange={() => setFlagTarget(null)}
        title={flagTarget?.nextStatus === "flagged" ? `Flag "${flagTarget?.prop?.name}"?` : `Clear flag on "${flagTarget?.prop?.name}"?`}
        description={
          flagTarget?.nextStatus === "flagged"
            ? "Flagging highlights this property as suspicious or inactive for administrative review."
            : "This restores the property status to active."
        }
        confirmLabel={flagTarget?.nextStatus === "flagged" ? "Flag Property" : "Restore Active"}
        confirmVariant={flagTarget?.nextStatus === "flagged" ? "destructive" : "default"}
        requireReason={flagTarget?.nextStatus === "flagged"}
        isPending={flagMutation.isPending}
        onConfirm={(reason) =>
          flagMutation.mutate({
            id: flagTarget.prop._id,
            payload: {
              status: flagTarget.nextStatus,
              isFlagged: flagTarget.nextStatus === "flagged",
              reason
            }
          })
        }
      />
    </div>
  );
}
