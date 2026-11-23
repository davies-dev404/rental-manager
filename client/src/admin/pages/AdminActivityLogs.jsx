import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import DataTable from "../components/DataTable";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

export default function AdminActivityLogs() {
  const [source, setSource] = useState("admin");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-activity-logs", source, category, status, search, page],
    queryFn: () => adminService.getActivityLogs({ source, category, status, search, page, limit: 25 })
  });

  const columns = [
    {
      key: "createdAt",
      label: "Timestamp",
      render: (l) => (
        <span className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
          {l.createdAt ? new Date(l.createdAt).toLocaleString("en-KE") : "—"}
        </span>
      )
    },
    {
      key: "admin",
      label: "Administrator",
      render: (l) => (
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">{l.adminName || "System"}</p>
          <p className="text-[10.5px] text-slate-500">{l.adminEmail}</p>
        </div>
      )
    },
    {
      key: "action",
      label: "Action",
      render: (l) => (
        <div>
          <p className="font-bold text-[#0d2240] dark:text-[#00d4c8]">{l.action}</p>
          <Badge variant="outline" className="text-[9.5px] uppercase mt-0.5">{l.category}</Badge>
        </div>
      )
    },
    {
      key: "details",
      label: "Details & Target",
      render: (l) => (
        <div className="max-w-md">
          <p className="text-slate-700 dark:text-slate-300">{l.details || "—"}</p>
          {l.targetId && (
            <p className="text-[10px] font-mono text-slate-400">
              {l.targetType}: {l.targetId}
            </p>
          )}
        </div>
      )
    },
    {
      key: "ipAddress",
      label: "IP Address",
      render: (l) => <span className="font-mono text-[11px] text-slate-500">{l.ipAddress || "—"}</span>
    },
    {
      key: "status",
      label: "Outcome",
      render: (l) => (
        <Badge
          variant="outline"
          className={`text-[10px] uppercase ${
            l.status === "warning"
              ? "bg-amber-100 text-amber-800 border-amber-200"
              : l.status === "error"
              ? "bg-rose-100 text-rose-700 border-rose-200"
              : "bg-[#00a99d]/15 text-[#00a99d] border-[#00a99d]/30"
          }`}
        >
          {l.status || "success"}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Security &amp; Audit Logs</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable administrative ledger tracking logins, suspensions, activations, subscription overrides, settings changes, and security alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search action, admin, IP, ID..." className="pl-8 h-8.5 text-xs" />
        </div>
        <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
          <option value="admin">Admin Security &amp; Audit Logs</option>
          <option value="subscription">Subscription Audit Ledger</option>
        </select>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
          <option value="all">All Categories</option>
          <option value="auth">Admin Auth / Logins</option>
          <option value="user">User Management</option>
          <option value="property">Property Moderation</option>
          <option value="payment">Payment Actions</option>
          <option value="subscription">Subscriptions</option>
          <option value="support">Support Tickets</option>
          <option value="settings">Platform Settings</option>
          <option value="report">Report Exports</option>
          <option value="security">Security Events</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
          <option value="all">All Outcomes</option>
          <option value="success">Success</option>
          <option value="warning">Warning / Denied</option>
          <option value="error">Error</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage="No security or administrative events recorded yet."
      />
    </div>
  );
}
