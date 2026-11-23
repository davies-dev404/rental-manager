import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import { adminHref } from "../utils/msimamiziMode";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";

export default function AdminSupportDetail({ id }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [replyText, setReplyText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [nextStatus, setNextStatus] = useState("");
  const [nextPriority, setNextPriority] = useState("");
  const [nextAssignee, setNextAssignee] = useState("");

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["admin-support-detail", id],
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
  }, [ticket]);

  const updateMutation = useMutation({
    mutationFn: (payload) => adminService.updateSupportTicket(id, payload),
    onSuccess: (res) => {
      toast({ title: "Support Ticket Updated", description: `${res.ticket?.ticketNumber} saved.` });
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["admin-support-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-support"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Update Failed", description: err.message })
  });

  if (isLoading) {
    return <p className="text-xs text-slate-500 py-8 text-center">Loading ticket workspace...</p>;
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
    <div className="space-y-5 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setLocation(adminHref("/support"))} className="h-8 text-xs cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Support Desk
          </Button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#00a99d]" />
              [{ticket.ticketNumber}] {ticket.subject}
            </h1>
            <p className="text-xs text-slate-500">
              {ticket.name} ({ticket.email}{ticket.phone ? ` · ${ticket.phone}` : ""})
              {ticket.organizationRole ? ` · ${ticket.organizationRole}` : ""}
              {ticket.unitsEstimate ? ` (${ticket.unitsEstimate} units)` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <Badge variant="outline" className="text-[10.5px]">{ticket.platformLabel || ticket.platform || "MakaziFlow"}</Badge>
          <Badge variant="outline" className="text-[10.5px] uppercase">{String(ticket.status || "open").replace(/_/g, " ")}</Badge>
        </div>
      </div>

      <Card className="bg-white dark:bg-slate-900 shadow-xs">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Original Inquiry</CardTitle></CardHeader>
        <CardContent className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
          {ticket.message}
        </CardContent>
      </Card>

      {(ticket.responses || []).length > 0 && (
        <Card className="bg-white dark:bg-slate-900 shadow-xs">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Response Thread ({ticket.responses.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            {ticket.responses.map((r, i) => (
              <div key={r._id || i} className={`border rounded-lg p-3 ${r.isInternalNote ? "bg-amber-50 border-amber-200" : "bg-slate-50 dark:bg-slate-800/60"}`}>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <strong>{r.authorName} {r.isInternalNote ? "(Internal Note)" : ""}</strong>
                  <span>{new Date(r.createdAt).toLocaleString("en-KE")}</span>
                </div>
                <p className="whitespace-pre-wrap">{r.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="bg-white dark:bg-slate-900 shadow-xs">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Update Status &amp; Reply</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Status</Label>
              <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} className="w-full h-9 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <Label>Priority</Label>
              <select value={nextPriority} onChange={(e) => setNextPriority(e.target.value)} className="w-full h-9 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <Label>Assigned Administrator</Label>
              <select value={nextAssignee} onChange={(e) => setNextAssignee(e.target.value)} className="w-full h-9 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
                <option value="">Unassigned</option>
                {admins.map((a) => (
                  <option key={a._id} value={a._id}>{a.name} ({a.email})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label>Administrator Reply / Note</Label>
            <Textarea
              rows={4}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write response to email the user or record an internal admin note..."
            />
            <label className="flex items-center gap-2 mt-2 text-slate-600 cursor-pointer">
              <input type="checkbox" checked={isInternalNote} onChange={(e) => setIsInternalNote(e.target.checked)} />
              <span>Save as internal note only (do not email user)</span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setLocation(adminHref("/support"))} className="text-xs cursor-pointer">
              Back to Support
            </Button>
            <Button
              size="sm"
              disabled={updateMutation.isPending}
              onClick={() =>
                updateMutation.mutate({
                  status: nextStatus,
                  priority: nextPriority,
                  assignedTo: nextAssignee,
                  responseMessage: replyText,
                  isInternalNote
                })
              }
              className="bg-[#00a99d] hover:bg-[#008f85] text-white text-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {updateMutation.isPending ? "Saving..." : "Save Update"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
