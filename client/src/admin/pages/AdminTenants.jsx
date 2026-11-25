import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import { adminHref } from "../utils/msimamiziMode";
import DataTable from "../components/DataTable";
import StatCard from "../components/StatCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Users, UserCheck, History, Building2, ShieldCheck } from "lucide-react";

export default function AdminTenants() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [propertyId, setPropertyId] = useState("all");
  const [landlordId, setLandlordId] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tenants", search, propertyId, landlordId, page],
    queryFn: () => adminService.getTenants({ search, propertyId, landlordId, page, limit: 15 })
  });

  const summary = data?.summary || {};
  const registeredProperties = data?.filters?.properties || [];
  const registeredLandlords = data?.filters?.landlords || [];

  const columns = [
    {
      key: "propertyName",
      label: "Registered Property",
      render: (r) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{r.propertyName}</p>
          <p className="text-[11px] text-slate-500">{r.location} · {r.type}</p>
        </div>
      )
    },
    {
      key: "landlord",
      label: "Subscriber / Landlord",
      render: (r) =>
        r.landlord?._id ? (
          <button
            type="button"
            onClick={() => setLocation(adminHref(`/users/${r.landlord._id}`))}
            className="text-left group cursor-pointer"
          >
            <p className="font-semibold text-[#0d2240] dark:text-[#00d4c8] group-hover:underline">
              {r.landlord?.companyName || r.landlord?.name || "—"}
            </p>
            <p className="text-[11px] text-slate-500">{r.landlord?.email}</p>
          </button>
        ) : (
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{r.landlord?.companyName || r.landlord?.name || "—"}</p>
            <p className="text-[11px] text-slate-500">{r.landlord?.email}</p>
          </div>
        )
    },
    {
      key: "units",
      label: "Units Configured",
      render: (r) => (
        <span className="font-medium">
          {r.occupiedUnits} / {r.totalUnits} occupied ({r.occupancyRate}%)
        </span>
      )
    },
    {
      key: "registeredTenantsCount",
      label: "Registered Tenants",
      render: (r) => (
        <span className="font-extrabold text-[#00a99d] text-sm tabular-nums">
          {r.registeredTenantsCount}
        </span>
      )
    },
    {
      key: "breakdown",
      label: "Active vs Past",
      render: (r) => (
        <span className="text-slate-600 text-xs">
          {r.activeTenantsCount} active · {r.pastTenantsCount} past
        </span>
      )
    },
    {
      key: "actions",
      label: "Property Page",
      align: "right",
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => setLocation(adminHref(`/properties/${r._id}`))} className="h-7 px-2.5 text-[11px] cursor-pointer">
          View Property
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Registered Tenant Counts (ODPP Compliant)</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          View aggregated tenant registration counts per registered property &amp; subscriber in compliance with ODPA/ODPP data protection regulations.
        </p>
      </div>

      {/* ODPA/ODPP Privacy Notice Banner */}
      <Card className="border-[#00a99d]/30 bg-[#00a99d]/5 shadow-xs">
        <CardContent className="p-3 flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-200">
          <ShieldCheck className="w-4 h-4 text-[#00a99d] shrink-0" />
          <span>
            <strong>ODPP Data Privacy Active:</strong> Personal tenant names, phone numbers, emails, and ID numbers are strictly hidden from Super Admin views. Only aggregated counts per property are displayed.
          </span>
        </CardContent>
      </Card>

      {/* Summary Counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Registered Tenants" value={summary.totalRegisteredTenants || 0} icon={Users} accent="teal" />
        <StatCard title="Active Tenancies" value={summary.activeTenancies || 0} icon={UserCheck} accent="navy" />
        <StatCard title="Past / Vacated" value={summary.pastTenancies || 0} icon={History} accent="amber" />
        <StatCard title="Registered Properties" value={summary.propertiesCovered || 0} icon={Building2} accent="teal" />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Filter by property or landlord..."
            className="pl-8 h-8.5 text-xs"
          />
        </div>
        <select value={propertyId} onChange={(e) => { setPropertyId(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
          <option value="all">All Registered Properties</option>
          {registeredProperties.map((p) => (
            <option key={p._id} value={p._id}>{p.name} ({p.tenantCount} tenants)</option>
          ))}
        </select>
        <select value={landlordId} onChange={(e) => { setLandlordId(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
          <option value="all">All Landlords</option>
          {registeredLandlords.map((l) => (
            <option key={l._id} value={l._id}>{l.companyName || l.name} ({l.email})</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage="No registered properties found for tenant count tracking."
      />
    </div>
  );
}
