import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import { adminHref } from "../utils/msimamiziMode";
import { useSupportStream } from "@/hooks/useSupportStream";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MessageSquare, Send, CheckCheck, Lock } from "lucide-react";

export default function AdminSupportDetail({ id }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);

  const [replyText, setReplyText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [nextStatus, setNextStatus] = useState("");
  const [nextPriority, setNextPriority] = useState("");
  const [nextAssignee, setNextAssignee] = useState("");

  const { isConnected } = useSupportStream({ mode: "admin", ticketId: id });

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["admin-support-detail", String(id)],
    queryFn: () => adminService.getSupportTicketDetail(id),
    enabled: Boolean(id)
  });

  const { data: supportListMeta } = useQuery({
    queryKey: ["admin-support", "", "all", "all", "all", 1],
    queryFn: () => adminService.getSupportTickets({ page: 1, limit: 15 })
  });

  useEffect(() => {
    if (ticket) {
      setNextStatus(ticket.status || "open");
      setNextPriority(ticket.priority || "medium");
      setNextAssignee(ticket.assignedTo?._id || "");
    }
  }, [ticket?._id, ticket?.status, ticket?.priority, ticket?.assignedTo?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.responses?.length, ticket?._id]);

  const updateMutation = useMutation({
    mutationFn: (payload) => adminService.updateSupportTicket(id, payload),
    onSuccess: (res) => {
      if (res?.ticket) {
        queryClient.setQueryData(["admin-support-detail", String(id)], res.ticket);
      }
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["admin-support"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Send Failed", description: err.message })
  });

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    const clean = replyText.trim();
    if (!clean && nextStatus === ticket?.status && nextPriority === ticket?.priority && nextAssignee === (ticket?.assignedTo?._id || "")) {
      return;
    }
    updateMutation.mutate({
      status: nextStatus,
      priority: nextPriority,
      assignedTo: nextAssignee,
      responseMessage: clean,
      isInternalNote
    });
  };

  if (isLoading) {
    return <p className="text-xs text-slate-500 py-8 text-center">Loading live conversation...</p>;
  }

  if (!ticket) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setLocation(adminHref("/support"))} className="text-xs cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Support
        </Button>
        <p className="text-sm text-rose-600">Support ticket not found.</p>
      </div>
    );
  }

  const admins = supportListMeta?.admins || [];

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Top Chat Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="outline" size="sm" onClick={() => setLocation(adminHref("/support"))} className="h-8 text-xs cursor-pointer shrink-0">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Inbox
          </Button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
              <MessageSquare className="w-4 h-4 text-[#00a99d] shrink-0" />
              <span className="truncate">[{ticket.ticketNumber}] {ticket.subject}</span>
            </h1>
            <p className="text-xs text-slate-500 truncate">
              {ticket.name} ({ticket.email}{ticket.phone ? ` · ${ticket.phone}` : ""})
              {ticket.organizationRole ? ` · ${ticket.organizationRole}` : ""}
              {ticket.unitsEstimate ? ` (${ticket.unitsEstimate} units)` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <Badge variant="outline" className="text-[10.5px]">{ticket.platformLabel || ticket.platform || "MakaziFlow"}</Badge>
          <Badge variant="outline" className="text-[10.5px] uppercase">{String(ticket.status || "open").replace(/_/g, " ")}</Badge>
          <Badge
            variant="outline"
            className={`text-[10.5px] flex items-center gap-1 ${
              isConnected ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
            {isConnected ? "Live" : "Syncing"}
          </Badge>
        </div>
      </div>

      {/* Metadata Controls Strip */}
      <Card className="bg-white dark:bg-slate-900 shadow-xs">
        <CardContent className="p-3.5 grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs items-end">
          <div>
            <Label className="text-[11px]">Status</Label>
            <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} className="w-full h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <Label className="text-[11px]">Priority</Label>
            <select value={nextPriority} onChange={(e) => setNextPriority(e.target.value)} className="w-full h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <Label className="text-[11px]">Assigned Administrator</Label>
            <select value={nextAssignee} onChange={(e) => setNextAssignee(e.target.value)} className="w-full h-8.5 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
              <option value="">Unassigned</option>
              {admins.map((a) => (
                <option key={a._id} value={a._id}>{a.name} ({a.email})</option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={updateMutation.isPending}
            onClick={() =>
              updateMutation.mutate({
                status: nextStatus,
                priority: nextPriority,
                assignedTo: nextAssignee
              })
            }
            className="h-8.5 text-xs cursor-pointer"
          >
            Save Ticket Status
          </Button>
        </CardContent>
      </Card>

      {/* WhatsApp-Style Live Chat Area */}
      <Card className="bg-[#ece5dd] dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 space-y-3 h-[420px] overflow-y-auto">
          {/* Initial incoming inquiry bubble */}
          <div className="flex justify-start">
            <div className="max-w-[82%] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl rounded-tl-xs px-3.5 py-2.5 shadow-xs text-xs space-y-1">
              <div className="flex items-center justify-between gap-4 text-[10.5px] font-bold text-[#00a99d]">
                <span>{ticket.name}</span>
                <span className="text-slate-400 font-normal">
                  {ticket.createdAt ? new Date(ticket.createdAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{ticket.message}</p>
            </div>
          </div>

          {/* Live chronological conversation bubbles */}
          {(ticket.responses || []).map((r, i) => {
            const isAdminMsg = r.authorRole === "superadmin";
            const timeStr = r.createdAt
              ? new Date(r.createdAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })
              : "";
            if (r.isInternalNote) {
              return (
                <div key={r._id || i} className="flex justify-center">
                  <div className="max-w-[85%] bg-amber-100/95 border border-amber-300 text-amber-900 rounded-lg px-3 py-1.5 text-[11px] flex items-center gap-1.5 shadow-2xs">
                    <Lock className="w-3 h-3 shrink-0" />
                    <span><strong>{r.authorName} (Internal Note):</strong> {r.message}</span>
                    <span className="text-[10px] text-amber-700 ml-2 shrink-0">{timeStr}</span>
                  </div>
                </div>
              );
            }

            return (
              <div key={r._id || i} className={`flex ${isAdminMsg ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-xs text-xs space-y-1 ${
                    isAdminMsg
                      ? "bg-[#d9fdd3] dark:bg-emerald-900 text-slate-900 dark:text-white rounded-tr-xs"
                      : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 text-[10.5px]">
                    <strong className={isAdminMsg ? "text-[#0d2240] dark:text-[#00d4c8]" : "text-[#00a99d]"}>
                      {r.authorName}
                    </strong>
                    <span className="text-slate-400 flex items-center gap-1">
                      {timeStr}
                      {isAdminMsg && <CheckCheck className="w-3 h-3 text-[#00a99d]" />}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{r.message}</p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Chat Composer */}
        <form onSubmit={handleSendMessage} className="bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-3 space-y-2">
          <div className="flex items-end gap-2">
            <Textarea
              rows={2}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (replyText.trim()) handleSendMessage();
                }
              }}
              placeholder={isInternalNote ? "Type an internal admin note (not sent to user)..." : "Type a message (Enter to send, Shift+Enter for new line)..."}
              className="bg-white dark:bg-slate-900 text-xs resize-none min-h-11"
            />
            <Button
              type="submit"
              disabled={updateMutation.isPending || !replyText.trim()}
              className="bg-[#00a99d] hover:bg-[#008f85] text-white h-11 px-4 text-xs cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4 mr-1" />
              {updateMutation.isPending ? "Sending..." : "Send"}
            </Button>
          </div>
          <label className="inline-flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
            <input type="checkbox" checked={isInternalNote} onChange={(e) => setIsInternalNote(e.target.checked)} />
            <span>Send as internal note only (hidden from subscriber)</span>
          </label>
        </form>
      </Card>
    </div>
  );
}
