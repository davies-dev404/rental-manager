import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import DataTable from "../DataTable";
import { Card } from "@/components/ui/card";
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
import { Search, Eye, RefreshCw } from "lucide-react";
import { formatKES, formatDate, statusBadgeClass } from "./formatters";

export default function TenantsTab({ userId, globalSearch = "" }) {
  const [search, setSearch] = useState("");
  const [propertyId, setPropertyId] = useState("all");
  const [tenantStatus, setTenantStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedTenant, setSelectedTenant] = useState(null);

  const effectiveSearch = search || globalSearch;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-user-tenants", userId, effectiveSearch, propertyId, tenantStatus, paymentStatus, page],
    queryFn: () =>
      adminService.getUserTenants(userId, {
        search: effectiveSearch,
        propertyId,
        tenantStatus,
        paymentStatus,
        page,
        limit: 15
      }),
    enabled: Boolean(userId)
  });

  if (isError) {
    return (
      <Card className="p-6 text-center space-y-3 bg-white border-[#E1E7EF]">
        <p className="text-xs text-[#DC4545]">Failed to load landlord tenant directory.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
        </Button>
      </Card>
    );
  }

  const stats = data?.stats || {};
  const statCards = [
    { label: "Total Registered Tenants", value: stats.totalTenants || 0 },
    { label: "Active Tenants", value: stats.activeTenants || 0, accent: "text-[#16A36A]" },
    { label: "Former Tenants", value: stats.formerTenants || 0, accent: "text-[#738197]" },
    { label: "Outstanding Rent", value: stats.tenantsWithOutstanding || 0, accent: stats.tenantsWithOutstanding > 0 ? "text-[#E9A23B]" : "" },
    { label: "Overdue Rent", value: stats.tenantsWithOverdue || 0, accent: stats.tenantsWithOverdue > 0 ? "text-[#DC4545]" : "" },
    { label: "Leases Expiring (30d)", value: stats.leasesExpiringSoon || 0, accent: stats.leasesExpiringSoon > 0 ? "text-[#E9A23B]" : "" }
  ];

  const columns = [
    {
      key: "name",
      label: "Tenant",
      render: (r) => (
        <div>
          <p className="font-bold text-[#152238] dark:text-white">{r.name}</p>
          <p className="text-[10.5px] text-[#738197]">{r.email || "No email"} · {r.phone || "No phone"}</p>
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
    { key: "monthlyRent", label: "Monthly Rent", render: (r) => <strong>{formatKES(r.monthlyRent)}</strong> },
    {
      key: "lease",
      label: "Lease Dates",
      render: (r) => (
        <div className="text-[11px] text-[#738197]">
          <span>{formatDate(r.leaseStart)}</span>
          <span className="block">End: {formatDate(r.leaseEnd)}</span>
        </div>
      )
    },
    {
      key: "paymentStatus",
      label: "Payment Status",
      render: (r) => (
        <div>
          <Badge variant="outline" className={`text-[10px] capitalize ${statusBadgeClass(r.paymentStatus)}`}>
            {String(r.paymentStatus || "").replace(/_/g, " ")}
          </Badge>
          {r.outstandingBalance > 0 && (
            <p className="text-[10px] text-[#DC4545] mt-0.5 font-medium">Bal: {formatKES(r.outstandingBalance)}</p>
          )}
        </div>
      )
    },
    {
      key: "status",
      label: "Tenant Status",
      render: (r) => (
        <Badge variant="outline" className={`text-[10px] capitalize ${statusBadgeClass(r.status)}`}>
          {r.status}
        </Badge>
      )
    },
    { key: "createdAt", label: "Registered", render: (r) => <span className="text-[#738197]">{formatDate(r.createdAt)}</span> },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedTenant(r)} className="h-7 px-2 text-[11px] cursor-pointer">
          <Eye className="w-3.5 h-3.5 mr-1" /> Profile
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs p-3.5">
            <span className="text-[11px] text-[#738197] block">{s.label}</span>
            <strong className={`text-lg font-bold ${s.accent || "text-[#152238] dark:text-white"}`}>{s.value}</strong>
          </Card>
        ))}
      </div>

      <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs p-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#738197] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search tenant, phone, unit..."
              className="h-8 pl-8 text-xs border-[#E1E7EF]"
            />
          </div>
          <select value={propertyId} onChange={(e) => { setPropertyId(e.target.value); setPage(1); }} className="h-8 px-2.5 rounded-md border border-[#E1E7EF] bg-white text-xs">
            <option value="all">All Properties</option>
            {(data?.properties || []).map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
          <select value={tenantStatus} onChange={(e) => { setTenantStatus(e.target.value); setPage(1); }} className="h-8 px-2.5 rounded-md border border-[#E1E7EF] bg-white text-xs">
            <option value="all">All Tenant Statuses</option>
            <option value="active">Active</option>
            <option value="past">Former / Past</option>
          </select>
          <select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }} className="h-8 px-2.5 rounded-md border border-[#E1E7EF] bg-white text-xs">
            <option value="all">All Payment Statuses</option>
            <option value="up_to_date">Up to Date</option>
            <option value="outstanding">Outstanding</option>
            <option value="overdue">Overdue</option>
            <option value="no_payments">No Payments Yet</option>
          </select>
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
        emptyMessage="No tenants match your filters."
        pagination={data?.pagination}
        onPageChange={setPage}
      />

      {/* Tenant Profile, Lease & Payment History Drawer */}
      <Sheet open={Boolean(selectedTenant)} onOpenChange={(o) => !o && setSelectedTenant(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedTenant && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base font-bold text-[#152238]">{selectedTenant.name}</SheetTitle>
                <SheetDescription className="text-xs text-[#738197]">
                  {selectedTenant.propertyName} · Unit {selectedTenant.unitNumber}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-[#E1E7EF] bg-[#F4F6FA]/60">
                  <div><span className="text-[#738197] block text-[10.5px]">Email</span><strong>{selectedTenant.email || "—"}</strong></div>
                  <div><span className="text-[#738197] block text-[10.5px]">Phone</span><strong>{selectedTenant.phone || "—"}</strong></div>
                  <div><span className="text-[#738197] block text-[10.5px]">Monthly Rent</span><strong>{formatKES(selectedTenant.monthlyRent)}</strong></div>
                  <div><span className="text-[#738197] block text-[10.5px]">Deposit Held</span><strong>{formatKES(selectedTenant.deposit)}</strong></div>
                  <div><span className="text-[#738197] block text-[10.5px]">Lease Start</span><strong>{formatDate(selectedTenant.leaseStart)}</strong></div>
                  <div><span className="text-[#738197] block text-[10.5px]">Lease End</span><strong>{formatDate(selectedTenant.leaseEnd)}</strong></div>
                  <div><span className="text-[#738197] block text-[10.5px]">Total Paid</span><strong className="text-[#16A36A]">{formatKES(selectedTenant.totalPaid)}</strong></div>
                  <div><span className="text-[#738197] block text-[10.5px]">Outstanding Balance</span><strong className={selectedTenant.outstandingBalance > 0 ? "text-[#DC4545]" : ""}>{formatKES(selectedTenant.outstandingBalance)}</strong></div>
                </div>

                <div>
                  <h4 className="font-bold text-[#152238] mb-2">Recent Payments ({selectedTenant.recentPayments?.length || 0})</h4>
                  {(selectedTenant.recentPayments || []).length === 0 ? (
                    <p className="text-[#738197]">No payment records found for this tenant.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedTenant.recentPayments.map((p) => (
                        <div key={p._id} className="p-2 rounded-lg border border-[#E1E7EF] flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{p.invoiceNumber || p.reference || p.type}</p>
                            <p className="text-[10.5px] text-[#738197]">{p.method} · {formatDate(p.date || p.createdAt)}</p>
                          </div>
                          <div className="text-right">
                            <strong>{formatKES(p.amount)}</strong>
                            <Badge variant="outline" className={`block text-[9.5px] uppercase mt-0.5 ${statusBadgeClass(p.status)}`}>{p.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-[#152238] mb-2">Related Support / Complaints ({selectedTenant.relatedComplaintsCount || 0})</h4>
                  {(selectedTenant.relatedComplaints || []).length === 0 ? (
                    <p className="text-[#738197]">No related complaints or support tickets.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedTenant.relatedComplaints.map((c) => (
                        <div key={c._id} className="p-2 rounded-lg border border-[#E1E7EF] flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{c.subject}</p>
                            <p className="text-[10.5px] text-[#738197]">{c.ticketNumber} · {formatDate(c.createdAt)}</p>
                          </div>
                          <Badge variant="outline" className={`text-[10px] capitalize ${statusBadgeClass(c.status)}`}>{c.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
