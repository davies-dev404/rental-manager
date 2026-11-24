import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Lock, Monitor, Activity, RefreshCw } from "lucide-react";
import { formatDateTime, statusBadgeClass } from "./formatters";

export default function SecurityAuditTab({ userId }) {
  const [category, setCategory] = useState("all");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-user-security", userId, category],
    queryFn: () => adminService.getUserSecurityAudit(userId, { category }),
    enabled: Boolean(userId)
  });

  if (isLoading) {
    return <p className="text-xs text-[#738197] py-10 text-center">Loading security and immutable audit logs...</p>;
  }
  if (isError) {
    return (
      <Card className="p-6 text-center space-y-3 bg-white border-[#E1E7EF]">
        <p className="text-xs text-[#DC4545]">Failed to load security &amp; audit data.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
        </Button>
      </Card>
    );
  }

  const sec = data?.securitySummary || {};
  const loginHistory = data?.loginHistory || [];
  const securityEvents = data?.securityEvents || [];
  const timeline = data?.timeline || [];

  return (
    <div className="space-y-5">
      {/* Security Posture Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] rounded-xl shadow-xs p-3.5">
          <span className="text-[11px] text-[#738197] block">Email Verification</span>
          <strong className={`text-base ${sec.isVerified ? "text-[#16A36A]" : "text-[#E9A23B]"}`}>
            {sec.isVerified ? "Verified" : "Unverified"}
          </strong>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] rounded-xl shadow-xs p-3.5">
          <span className="text-[11px] text-[#738197] block">Active Sessions</span>
          <strong className="text-base text-[#152238] dark:text-white">{sec.activeSessionsCount || 0}</strong>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] rounded-xl shadow-xs p-3.5">
          <span className="text-[11px] text-[#738197] block">Failed Login Attempts</span>
          <strong className={`text-base ${sec.failedLoginAttempts >= 3 ? "text-[#DC4545]" : "text-[#152238] dark:text-white"}`}>
            {sec.failedLoginAttempts || 0}
          </strong>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] rounded-xl shadow-xs p-3.5">
          <span className="text-[11px] text-[#738197] block">Last Password Change</span>
          <strong className="text-xs text-[#152238] dark:text-white">{formatDateTime(sec.passwordChangedAt)}</strong>
        </Card>
      </div>

      {/* Login History & Security Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] rounded-xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white flex items-center gap-2">
              <Monitor className="w-4 h-4 text-[#00B8B0]" /> Login History &amp; Sessions ({loginHistory.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto max-h-72 overflow-y-auto">
            {loginHistory.length === 0 ? (
              <p className="text-xs text-[#738197] py-8 text-center">No login history entries recorded yet.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F4F6FA] text-[#738197] text-[10.5px] uppercase border-b border-[#E1E7EF]">
                  <tr>
                    <th className="py-2 px-3">Date &amp; Time</th>
                    <th className="py-2 px-3">Device / Browser</th>
                    <th className="py-2 px-3">OS</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E7EF]">
                  {loginHistory.map((item) => (
                    <tr key={item._id}>
                      <td className="py-2 px-3 whitespace-nowrap text-[#738197]">{formatDateTime(item.timestamp)}</td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-[#152238] dark:text-white">{item.device}</span>
                        <span className="text-[#738197] block text-[10.5px]">{item.browser}</span>
                      </td>
                      <td className="py-2 px-3 text-[#738197]">{item.os}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className={`text-[10px] ${statusBadgeClass(item.status === "Failed" ? "failed" : "active")}`}>
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] rounded-xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00B8B0]" /> Security Events ({securityEvents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto text-xs">
            {securityEvents.length === 0 ? (
              <p className="text-[#738197] py-8 text-center">No security events logged yet.</p>
            ) : (
              securityEvents.map((ev) => (
                <div key={ev._id} className="border border-[#E1E7EF] rounded-lg p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-[11px] uppercase text-[#102B4C] dark:text-white">{ev.eventType}</strong>
                    <span className="text-[10.5px] text-[#738197]">{formatDateTime(ev.timestamp)}</span>
                  </div>
                  <p className="text-[11px] text-[#738197] mt-0.5">{ev.description}</p>
                  <div className="flex items-center justify-between text-[10px] text-[#738197] mt-1">
                    <span>Actor: {ev.actor}</span>
                    <span>IP: {ev.ipAddress}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Immutable Chronological Account Activity Timeline */}
      <Card className="bg-white dark:bg-slate-900 border-[#E1E7EF] rounded-xl shadow-xs">
        <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-[#152238] dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00B8B0]" /> Chronological Immutable Audit Timeline ({timeline.length})
            </CardTitle>
            <p className="text-[11px] text-[#738197] flex items-center gap-1 mt-0.5">
              <Lock className="w-3 h-3" /> Read-only audit ledger — records cannot be modified through the interface
            </p>
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-8 px-2.5 rounded-md border border-[#E1E7EF] bg-white text-xs self-start"
          >
            <option value="all">All Categories</option>
            <option value="account">Account</option>
            <option value="auth">Authentication</option>
            <option value="user">Admin User Actions</option>
            <option value="property">Properties</option>
            <option value="tenant">Tenants</option>
            <option value="payment">Payments</option>
            <option value="subscription">Subscriptions</option>
            <option value="security">Security</option>
          </select>
        </CardHeader>
        <CardContent className="space-y-2 max-h-96 overflow-y-auto text-xs">
          {timeline.length === 0 ? (
            <p className="text-[#738197] py-8 text-center">No audit records match the selected category.</p>
          ) : (
            timeline.map((ev) => (
              <div key={ev.eventId} className="border-l-2 border-[#00B8B0] pl-3 py-1.5 border-b border-[#E1E7EF]/60 last:border-b-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <strong className="text-[#102B4C] dark:text-white">{ev.action}</strong>
                    <Badge variant="outline" className="text-[9.5px] capitalize bg-[#F4F6FA] text-[#738197] border-[#E1E7EF]">
                      {ev.entity}
                    </Badge>
                  </div>
                  <span className="text-[10.5px] text-[#738197]">{formatDateTime(ev.timestamp)}</span>
                </div>
                <p className="text-[#152238] dark:text-slate-300 mt-0.5">{ev.description}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10.5px] text-[#738197] mt-1">
                  <span>Actor: <strong>{ev.actor}</strong></span>
                  <span>IP: {ev.ipAddress}</span>
                  <span className="font-mono">Event ID: {ev.eventId.slice(-10)}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
