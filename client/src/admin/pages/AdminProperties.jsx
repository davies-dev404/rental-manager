import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import { adminHref } from "../utils/msimamiziMode";
import DataTable from "../components/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Eye } from "lucide-react";

export default function AdminProperties() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [landlordId, setLandlordId] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-properties", search, locationFilter, landlordId, type, status, page],
    queryFn: () => adminService.getProperties({ search, location: locationFilter, landlordId, type, status, page, limit: 15 })
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
      label: "Subscriber / Landlord",
      render: (p) =>
        p.landlord?._id ? (
          <button
            type="button"
            onClick={() => setLocation(adminHref(`/users/${p.landlord._id}`))}
            className="text-left group cursor-pointer"
          >
            <p className="font-semibold text-[#0d2240] dark:text-[#00d4c8] group-hover:underline">
              {p.landlord?.name || "—"}
            </p>
            <p className="text-[11px] text-slate-500">{p.landlord?.email}</p>
          </button>
        ) : (
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{p.landlord?.name || "—"}</p>
            <p className="text-[11px] text-slate-500">{p.landlord?.email}</p>
          </div>
        )
    },
    {
      key: "occupancy",
      label: "Units & Registered Tenants",
      render: (p) => (
        <div>
          <p className="font-semibold">
            {p.unitStats?.occupiedUnits || 0} / {p.unitStats?.totalUnits || 0} occupied ({p.unitStats?.occupancyRate || 0}%)
          </p>
          <p className="text-[10.5px] text-slate-500">
            {p.unitStats?.tenantCount || 0} tenant(s) registered · KES {Number(p.unitStats?.revenueGenerated || 0).toLocaleString()}
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
        <Button size="sm" variant="outline" onClick={() => setLocation(adminHref(`/properties/${p._id}`))} className="h-7 px-2.5 text-[11px] cursor-pointer">
          <Eye className="w-3 h-3 mr-1" /> View Property
        </Button>
      )
    }
  ];

  const filters = data?.filters || {};

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Property Management</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Monitor platform-wide registered properties, unit configurations, occupancy rates, and moderate suspicious listings.
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
        <select value={locationFilter} onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
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
    </div>
  );
}
