import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import DataTable from "../components/DataTable";
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
import { Search, Eye, UserCheck } from "lucide-react";

export default function AdminTenants() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tenants", search, status, page],
    queryFn: () => adminService.getTenants({ search, status, page, limit: 15 })
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin-tenant-detail", detailId],
    queryFn: () => adminService.getTenantDetail(detailId),
    enabled: Boolean(detailId)
  });

  const columns = [
    {
      key: "name",
      label: "Tenant",
      render: (t) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{t.name}</p>
          <p className="text-[11px] text-slate-500">{t.email || "—"} {t.phone ? `· ${t.phone}` : ""}</p>
        </div>
      )
    },
    {
      key: "landlord",
      label: "Associated Landlord",
      render: (t) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200">{t.landlord?.name || "—"}</p>
          <p className="text-[11px] text-slate-500">{t.landlord?.email}</p>
        </div>
      )
    },
    {
      key: "unit",
      label: "Property / Unit",
      render: (t) => (
        <span>
          {t.property?.name || "—"} {t.unit?.unitNumber ? `· Unit ${t.unit.unitNumber}` : "(Unassigned)"}
        </span>
      )
    },
    {
      key: "status",
      label: "Tenancy Status",
      render: (t) => (
        <div className="space-y-0.5">
          <Badge
            variant="outline"
            className={`text-[10px] capitalize ${
              t.status === "active" && !t.isInactiveRecord
                ? "bg-[#00a99d]/15 text-[#00a99d] border-[#00a99d]/30"
                : "bg-amber-100 text-amber-800 border-amber-200"
            }`}
          >
            {t.status}
          </Badge>
          {t.inactiveReason && (
            <p className="text-[10px] text-amber-700">{t.inactiveReason}</p>
          )}
        </div>
      )
    },
    {
      key: "payments",
      label: "Payments Total",
      render: (t) => (
        <div>
          <p className="font-bold">KES {Number(t.paymentSummary?.totalPaid || 0).toLocaleString()}</p>
          <p className="text-[10px] text-slate-500">{t.paymentSummary?.paymentCount || 0} receipt(s)</p>
        </div>
      )
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (t) => (
        <Button size="sm" variant="outline" onClick={() => setDetailId(t._id)} className="h-7 px-2 text-[11px] cursor-pointer">
          <Eye className="w-3 h-3 mr-1" /> Inspect
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Tenant Monitoring</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Monitor platform-wide tenancies, lease coverage, inactive tenancy records, and authorized payment summaries.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative sm:col-span-2">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search tenant by name, email, phone or account #..."
            className="pl-8 h-8.5 text-xs"
          />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
          <option value="all">All Tenancy Statuses</option>
          <option value="active">Active Tenancies</option>
          <option value="past">Past / Moved Out</option>
          <option value="inactive">Flagged Inactive Records</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage="No tenant records match your filters."
      />

      {/* Tenant Detail Modal */}
      <Dialog open={Boolean(detailId)} onOpenChange={() => setDetailId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#00a99d]" />
              {detail?.tenant?.name || "Tenant Record"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Landlord: {detail?.landlord?.name} ({detail?.landlord?.email})
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-xs text-slate-500 py-6 text-center">Loading tenant record...</p>
          ) : detail?.tenant && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg">
                <div><span className="text-slate-500 block">Property / Unit</span><strong>{detail.property?.name || "—"} {detail.unit?.unitNumber ? `· ${detail.unit.unitNumber}` : ""}</strong></div>
                <div><span className="text-slate-500 block">Rent Amount</span><strong>KES {Number(detail.tenant.rentAmount || detail.unit?.rentAmount || 0).toLocaleString()}</strong></div>
                <div><span className="text-slate-500 block">Lease Start</span><strong>{detail.tenant.leaseStart ? new Date(detail.tenant.leaseStart).toLocaleDateString("en-KE") : "—"}</strong></div>
                <div><span className="text-slate-500 block">Lease End</span><strong>{detail.tenant.leaseEnd ? new Date(detail.tenant.leaseEnd).toLocaleDateString("en-KE") : "—"}</strong></div>
              </div>

              <div>
                <h4 className="font-bold mb-1.5">Authorized Payment History ({detail.payments?.length || 0})</h4>
                {(detail.payments || []).length === 0 ? (
                  <p className="text-slate-400">No recorded payment history for this tenant.</p>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {detail.payments.map((p) => (
                      <div key={p._id} className="border rounded-md p-2 flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{p.type || p.category || "Rent"} {p.invoiceNumber ? `· #${p.invoiceNumber}` : ""}</p>
                          <p className="text-[10.5px] text-slate-500">{p.method} · {p.date ? new Date(p.date).toLocaleDateString("en-KE") : "—"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{p.currency || "KES"} {Number(p.amount || 0).toLocaleString()}</p>
                          <Badge variant="outline" className="text-[9.5px] uppercase">{p.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
