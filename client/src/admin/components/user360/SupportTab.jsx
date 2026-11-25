import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import { adminHref } from "../../utils/msimamiziMode";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LifeBuoy, StickyNote, Send, Lock, ExternalLink, RefreshCw, Loader2, Bell } from "lucide-react";
import { formatDateTime, statusBadgeClass } from "./formatters";

export default function SupportTab({ userId, userEmail }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [noteContent, setNoteContent] = useState("");
  const [noteIssue, setNoteIssue] = useState("General");
  const [notePriority, setNotePriority] = useState("normal");

  const [commForm, setCommForm] = useState({
    channel: "both",
    category: "general",
    title: "",
    message: ""
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-user-support", userId],
    queryFn: () => adminService.getUserSupportCenter(userId),
    enabled: Boolean(userId)
  });

  const addNoteMutation = useMutation({
    mutationFn: (payload) => adminService.createUserInternalNote(userId, payload),
    onSuccess: () => {
      toast({ title: "Internal Note Saved", description: "Visible only to Msimamizi administrators." });
      setNoteContent("");
      setNoteIssue("General");
      queryClient.invalidateQueries({ queryKey: ["admin-user-support", userId] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Note Failed", description: err.message })
  });

  const notifyMutation = useMutation({
    mutationFn: (payload) => adminService.sendUserNotification(userId, payload),
    onSuccess: (res) => {
      toast({
        title: "Notification Dispatched",
        description:
          res.emailStatus === "failed"
            ? `In-app notification saved, but email failed: ${res.emailError}`
            : `Sent to ${userEmail} (${res.emailStatus === "sent" ? "email delivered" : "in-app recorded"}).`
      });
      setCommForm({ channel: "both", category: "general", title: "", message: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-user-support", userId] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Dispatch Failed", description: err.message })
  });

  if (isLoading) {
    return <p className="text-xs text-[#738197] py-10 text-center">Loading support center and internal notes...</p>;
  }
  if (isError) {
    return (
      <Card className="p-6 text-center space-y-3 bg-white border-[#E1E7EF]">
        <p className="text-xs text-[#DC4545]">Failed to load support center.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
        </Button>
      </Card>
    );
  }

  const tickets = data?.tickets || [];
  const internalNotes = data?.internalNotes || [];
  const notifications = data?.notifications || [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Direct Communication Composer */}
        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] rounded-xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-[#00B8B0]" /> Send Communication to Landlord
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                notifyMutation.mutate(commForm);
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs">Communication Type</Label>
                  <select
                    value={commForm.category}
                    onChange={(e) => setCommForm({ ...commForm, category: e.target.value })}
                    className="w-full h-8 px-2.5 rounded-md border border-[#E1E7EF] bg-white text-xs"
                  >
                    <option value="general">General Message</option>
                    <option value="verification_reminder">Verification Reminder</option>
                    <option value="subscription_expiry">Subscription Expiry Reminder</option>
                    <option value="payment_reminder">Payment Reminder</option>
                    <option value="announcement">General Announcement</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Channel</Label>
                  <select
                    value={commForm.channel}
                    onChange={(e) => setCommForm({ ...commForm, channel: e.target.value })}
                    className="w-full h-8 px-2.5 rounded-md border border-[#E1E7EF] bg-white text-xs"
                  >
                    <option value="both">Email + In-App</option>
                    <option value="email">Email Only</option>
                    <option value="in_app">In-App Only</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Subject *</Label>
                <Input
                  value={commForm.title}
                  onChange={(e) => setCommForm({ ...commForm, title: e.target.value })}
                  placeholder="Subject line..."
                  required
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Message *</Label>
                <Textarea
                  rows={3}
                  value={commForm.message}
                  onChange={(e) => setCommForm({ ...commForm, message: e.target.value })}
                  placeholder="Write email / notification content..."
                  required
                  className="text-xs"
                />
              </div>
              <Button type="submit" size="sm" disabled={notifyMutation.isPending} className="bg-[#102B4C] hover:bg-[#16385E] text-white text-xs cursor-pointer">
                {notifyMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Dispatch Message
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Internal Admin Notes (Never Visible to Landlord) */}
        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] rounded-xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-[#E9A23B]" /> Internal Admin Notes ({internalNotes.length})
            </CardTitle>
            <p className="text-[11px] text-[#738197] flex items-center gap-1">
              <Lock className="w-3 h-3" /> Strictly internal — never visible to the landlord
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!noteContent.trim()) return;
                addNoteMutation.mutate({ content: noteContent, relatedIssue: noteIssue, priority: notePriority });
              }}
              className="space-y-2"
            >
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={noteIssue}
                  onChange={(e) => setNoteIssue(e.target.value)}
                  placeholder="Related issue (e.g. Billing, KYC)"
                  className="h-8 text-xs"
                />
                <select
                  value={notePriority}
                  onChange={(e) => setNotePriority(e.target.value)}
                  className="h-8 px-2.5 rounded-md border border-[#E1E7EF] bg-white text-xs"
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
              <Textarea
                rows={2}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Record private administrative context about this landlord..."
                required
                className="text-xs"
              />
              <Button type="submit" size="sm" disabled={addNoteMutation.isPending} className="bg-[#00B8B0] hover:bg-[#009c95] text-white text-xs cursor-pointer">
                {addNoteMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Add Internal Note
              </Button>
            </form>

            <div className="space-y-2 max-h-48 overflow-y-auto pt-2 border-t border-[#E1E7EF]">
              {internalNotes.length === 0 ? (
                <p className="text-[#738197] text-center py-3">No internal notes added yet.</p>
              ) : (
                internalNotes.map((n) => (
                  <div key={n._id} className="p-2.5 rounded-lg bg-[#E9A23B]/10 border border-[#E9A23B]/25">
                    <div className="flex justify-between items-center gap-2">
                      <strong className="text-[#152238]">{n.relatedIssue}</strong>
                      <span className="text-[10px] text-[#738197]">{formatDateTime(n.createdAt)}</span>
                    </div>
                    <p className="text-[#152238] mt-1 whitespace-pre-wrap">{n.content}</p>
                    <p className="text-[10px] text-[#738197] mt-1">By {n.adminName} ({n.adminEmail})</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Support Tickets */}
      <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] rounded-xl shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-[#152238] dark:text-white flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-[#00B8B0]" /> Support Tickets ({tickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {tickets.length === 0 ? (
            <p className="text-xs text-[#738197] py-8 text-center">No support tickets filed by this account.</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F4F6FA] text-[#738197] text-[10.5px] uppercase border-b border-[#E1E7EF]">
                <tr>
                  <th className="py-2.5 px-4">Ticket #</th>
                  <th className="py-2.5 px-4">Subject</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Priority</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Assigned Agent</th>
                  <th className="py-2.5 px-4">Updated</th>
                  <th className="py-2.5 px-4 text-right">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E7EF]">
                {tickets.map((t) => (
                  <tr key={t._id} className="hover:bg-[#F4F6FA]/60">
                    <td className="py-2.5 px-4 font-mono font-semibold text-[#102B4C]">{t.ticketNumber}</td>
                    <td className="py-2.5 px-4 font-medium text-[#152238]">{t.subject}</td>
                    <td className="py-2.5 px-4 capitalize text-[#738197]">{String(t.category || "").replace(/_/g, " ")}</td>
                    <td className="py-2.5 px-4">
                      <Badge variant="outline" className={`text-[10px] capitalize ${statusBadgeClass(t.priority === "urgent" || t.priority === "high" ? "danger" : "warning")}`}>
                        {t.priority}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge variant="outline" className={`text-[10px] capitalize ${statusBadgeClass(t.status)}`}>
                        {String(t.status || "").replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-[#738197]">{t.assignedTo?.name || "Unassigned"}</td>
                    <td className="py-2.5 px-4 text-[#738197] whitespace-nowrap">{formatDateTime(t.updatedAt || t.createdAt)}</td>
                    <td className="py-2.5 px-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => setLocation(adminHref(`/support/${t._id}`))} className="h-7 px-2 text-[11px] cursor-pointer">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Sent Admin Notifications Log */}
      <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] rounded-xl shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-[#152238] dark:text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#00B8B0]" /> Admin Notification History ({notifications.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-60 overflow-y-auto text-xs">
          {notifications.length === 0 ? (
            <p className="text-[#738197] py-4 text-center">No administrative notifications dispatched yet.</p>
          ) : (
            notifications.map((n) => (
              <div key={n._id} className="border-b border-[#E1E7EF] pb-2 last:border-0 flex justify-between items-start gap-3">
                <div>
                  <p className="font-semibold text-[#152238]">{n.title}</p>
                  <p className="text-[11px] text-[#738197]">{n.message}</p>
                  <p className="text-[10px] text-[#738197] mt-0.5 capitalize">
                    Channel: {n.channel} · Email: {n.emailStatus} · By {n.sentByAdminName}
                  </p>
                </div>
                <span className="text-[10.5px] text-[#738197] shrink-0">{formatDateTime(n.createdAt)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
