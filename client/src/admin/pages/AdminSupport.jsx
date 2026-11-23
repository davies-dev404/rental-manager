import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import DataTable from "../components/DataTable";
import StatCard from "../components/StatCard";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Search, LifeBuoy, Clock, CheckCircle2, AlertCircle, MessageSquare, Globe } from "lucide-react";

export default function AdminSupport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [page, setPage] = useState(1);

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [nextStatus, setNextStatus] = useState("");
  const [nextPriority, setNextPriority] = useState("");
  const [nextAssignee, setNextAssignee] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-support", search, status, category, platform, page],
    queryFn: () => adminService.getSupportTickets({ search, status, category, platform, page, limit: 15 })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => adminService.updateSupportTicket(id, payload),
    onSuccess: (res) => {
      toast({ title: "Support Ticket Updated", description: `${res.ticket?.ticketNumber} saved.` });
      setSelectedTicket(res.ticket);
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["admin-support"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Update Failed", description: err.message })
  });

  const summary = data?.summary || {};
  const admins = data?.admins || [];
  const platforms = data?.platforms || [];

  const openTicketModal = (t) => {
    setSelectedTicket(t);
    setNextStatus(t.status);
    setNextPriority(t.priority);
    setNextAssignee(t.assignedTo?._id || "");
    setReplyText("");
    setIsInternalNote(false);
  };

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
      label: "Category / Priority",
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
        <Button size="sm" variant="outline" onClick={() => openTicketModal(t)} className="h-7 px-2.5 text-[11px] cursor-pointer">
          <MessageSquare className="w-3 h-3 mr-1" /> Manage
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Support Management (AfriNexTech Hub)</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Unified support desk across MakaziFlow and all AfriNexTech platforms. Categorize requests, assign administrators, and reply directly via email.
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

      {/* Ticket Workspace Modal */}
      <Dialog open={Boolean(selectedTicket)} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              [{selectedTicket?.ticketNumber}] {selectedTicket?.subject}
            </DialogTitle>
            <DialogDescription className="text-xs">
              From: {selectedTicket?.name} ({selectedTicket?.email}{selectedTicket?.phone ? ` · ${selectedTicket.phone}` : ""})
              {selectedTicket?.organizationRole ? ` · Role: ${selectedTicket.organizationRole}` : ""}
              {selectedTicket?.unitsEstimate ? ` (${selectedTicket.unitsEstimate} units)` : ""} · Submitted{" "}
              {selectedTicket?.createdAt ? new Date(selectedTicket.createdAt).toLocaleString("en-KE") : "—"}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4 text-xs py-1">
              <div className="bg-slate-50 dark:bg-slate-800/60 border rounded-lg p-3">
                <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Original Message:</p>
                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{selectedTicket.message}</p>
              </div>

              {(selectedTicket.responses || []).length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <p className="font-bold">Response History:</p>
                  {selectedTicket.responses.map((r, i) => (
                    <div key={r._id || i} className={`border rounded-md p-2.5 ${r.isInternalNote ? "bg-amber-50 border-amber-200" : "bg-white dark:bg-slate-900"}`}>
                      <div className="flex justify-between text-[10.5px] text-slate-500 mb-1">
                        <strong>{r.authorName} {r.isInternalNote ? "(Internal Note)" : ""}</strong>
                        <span>{new Date(r.createdAt).toLocaleString("en-KE")}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{r.message}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <Label>Status</Label>
                  <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} className="w-full h-8.5 rounded border px-2 text-xs">
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <select value={nextPriority} onChange={(e) => setNextPriority(e.target.value)} className="w-full h-8.5 rounded border px-2 text-xs">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <Label>Assign Administrator</Label>
                  <select value={nextAssignee} onChange={(e) => setNextAssignee(e.target.value)} className="w-full h-8.5 rounded border px-2 text-xs">
                    <option value="">Unassigned</option>
                    {admins.map((a) => <option key={a._id} value={a._id}>{a.name} ({a.email})</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Administrator Response / Note</Label>
                <Textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your response or internal troubleshooting note..."
                />
                <label className="flex items-center gap-2 text-[11px] text-slate-500 cursor-pointer">
                  <input type="checkbox" checked={isInternalNote} onChange={(e) => setIsInternalNote(e.target.checked)} />
                  Save as internal admin-only note (not emailed to user)
                </label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTicket(null)}>Close</Button>
            <Button
              disabled={updateMutation.isPending}
              onClick={() =>
                updateMutation.mutate({
                  id: selectedTicket._id,
                  payload: {
                    status: nextStatus,
                    priority: nextPriority,
                    assignedTo: nextAssignee,
                    responseMessage: replyText,
                    isInternalNote
                  }
                })
              }
              className="bg-[#0d2240] hover:bg-[#132d4a] text-white cursor-pointer"
            >
              Save &amp; Update Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
