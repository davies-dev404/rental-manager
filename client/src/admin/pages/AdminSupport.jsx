import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import { adminHref } from "../utils/msimamiziMode";
import DataTable from "../components/DataTable";
import StatCard from "../components/StatCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, LifeBuoy, Clock, CheckCircle2, AlertCircle, MessageSquare, Globe } from "lucide-react";

export default function AdminSupport() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-support", search, status, category, platform, page],
    queryFn: () => adminService.getSupportTickets({ search, status, category, platform, page, limit: 15 })
  });

  const summary = data?.summary || {};
  const platforms = data?.platforms || [];

  const columns = [
    {
      key: "ticketNumber",
      label: "Ticket",
      render: (t) => (
        <div>
          <p className="font-mono font-bold text-[#0d2240] dark:text-[#00d4c8]">{t.ticketNumber}</p>
          <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">{t.subject}</p>
        </div>
      )
    },
    {
      key: "requester",
      label: "Requester",
      render: (t) => (
        <div>
          <p className="font-medium">
            {t.name}
            {t.source === "landing_page" && (
              <Badge variant="outline" className="ml-1.5 text-[9.5px] bg-[#00a99d]/12 text-[#00a99d] border-[#00a99d]/30">
                Landing Page
              </Badge>
            )}
          </p>
          <p className="text-[11px] text-slate-500">{t.email}{t.phone ? ` · ${t.phone}` : ""}</p>
        </div>
      )
    },
    {
      key: "category",
      label: "Platform / Category / Priority",
      render: (t) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {t.platformLabel || t.platform || "MakaziFlow"}
          </Badge>
          <Badge variant="outline" className="text-[10px] capitalize">{t.category.replace(/_/g, " ")}</Badge>
          <Badge
            variant="outline"
            className={`text-[10px] uppercase ${
              t.priority === "urgent" || t.priority === "high" ? "bg-rose-100 text-rose-700" : ""
            }`}
          >
            {t.priority}
          </Badge>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (t) => (
        <Badge
          variant="outline"
          className={`text-[10px] capitalize ${
            t.status === "resolved" || t.status === "closed"
              ? "bg-[#00a99d]/15 text-[#00a99d]"
              : t.status === "open"
              ? "bg-amber-100 text-amber-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {t.status.replace(/_/g, " ")}
        </Badge>
      )
    },
    {
      key: "assignedTo",
      label: "Assigned To",
      render: (t) => <span className="text-slate-600 dark:text-slate-300">{t.assignedTo?.name || "Unassigned"}</span>
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (t) => (
        <Button size="sm" variant="outline" onClick={() => setLocation(adminHref(`/support/${t._id}`))} className="h-7 px-2.5 text-[11px] cursor-pointer">
          <MessageSquare className="w-3 h-3 mr-1" /> Open Ticket
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Support Management (AfriNexTech Hub)</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Unified support desk across MakaziFlow and all AfriNexTech platforms. Open any ticket in a dedicated page to assign and reply.
        </p>
      </div>

      {/* AfriNexTech Multi-Platform Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 mr-1">
            <Globe className="w-3.5 h-3.5 text-[#00a99d]" /> Platforms:
          </span>
          <button
            type="button"
            onClick={() => { setPlatform("all"); setPage(1); }}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border cursor-pointer ${
              platform === "all" ? "bg-[#0d2240] text-white border-[#0d2240]" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            All Platforms
          </button>
          {platforms.map((pf) => (
            <button
              key={pf.id}
              type="button"
              onClick={() => { setPlatform(pf.id); setPage(1); }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer ${
                platform === pf.id ? "bg-[#00a99d] text-white border-[#00a99d]" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              {pf.label} ({pf.open}/{pf.total})
            </button>
          ))}
        </div>
        <span className="text-[10.5px] font-mono text-slate-400">
          Sync API: POST /api/public/afrinextech/support
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Open Tickets" value={summary.open || 0} icon={AlertCircle} accent="amber" />
        <StatCard title="In Progress / Pending" value={(summary.in_progress || 0) + (summary.pending || 0)} icon={Clock} accent="navy" />
        <StatCard title="Resolved / Closed" value={(summary.resolved || 0) + (summary.closed || 0)} icon={CheckCircle2} accent="teal" />
        <StatCard title="Avg Resolution Time" value={`${summary.avgResolutionHours || 0} hrs`} icon={LifeBuoy} accent="teal" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative sm:col-span-2">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search ticket #, subject, name, email..." className="pl-8 h-8.5 text-xs" />
        </div>
        <select value={platform} onChange={(e) => { setPlatform(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
          <option value="all">All Platforms</option>
          <option value="makaziflow">MakaziFlow</option>
          <option value="afrinextech">AfriNexTech</option>
          {platforms.filter((p) => p.id !== "makaziflow" && p.id !== "afrinextech").map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
          <option value="all">All Categories</option>
          <option value="landing_inquiry">Landing Page Inquiries</option>
          <option value="demo_request">Demo Requests</option>
          <option value="general">General</option>
          <option value="billing">Billing</option>
          <option value="payments">Payments</option>
          <option value="technical">Technical</option>
          <option value="account">Account</option>
          <option value="complaint">Complaint</option>
          <option value="bug">Bug</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage="No support tickets submitted yet."
      />
    </div>
  );
}
