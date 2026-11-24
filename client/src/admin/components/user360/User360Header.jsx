import React, { useState } from "react";
import { useLocation } from "wouter";
import { adminHref } from "../../utils/msimamiziMode";
import ConfirmDialog from "../ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Bell,
  MoreHorizontal,
  Ban,
  UserCheck,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Download,
  Trash2,
  Send,
  Loader2,
  Search
} from "lucide-react";
import { formatDate, formatDateTime, getInitials, statusBadgeClass } from "./formatters";

const NOTIFICATION_TEMPLATES = {
  general: { title: "", message: "" },
  verification_reminder: {
    title: "Complete Your MakaziFlow Account Verification",
    message: "Hello,\n\nPlease verify your MakaziFlow account email and complete your business profile so you can unlock full property management features."
  },
  subscription_expiry: {
    title: "MakaziFlow Subscription Renewal Reminder",
    message: "Hello,\n\nYour current MakaziFlow subscription period is approaching expiry. Please review your billing tab to renew and avoid any interruption in service."
  },
  payment_reminder: {
    title: "Account Billing & Rent Reconciliation Notice",
    message: "Hello,\n\nThis is a reminder to review your recent rent collections and pending invoices in your MakaziFlow workspace."
  },
  announcement: {
    title: "Important MakaziFlow Platform Announcement",
    message: "Hello,\n\nWe are writing to share an important update regarding your MakaziFlow account."
  }
};

export default function User360Header({
  user,
  engagement,
  globalSearch,
  onGlobalSearchChange,
  onEditProfile,
  onUpdateStatus,
  onAccountAction,
  onSendNotification,
  onExportData,
  isMutating
}) {
  const [, setLocation] = useLocation();
  const [editOpen, setEditOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [confirmState, setConfirmState] = useState(null);

  const [editForm, setEditForm] = useState({
    name: user.name || "",
    phone: user.phone || "",
    companyName: user.companyName || "",
    address: user.address || "",
    kraPin: user.kraPin || "",
    onboardingRole: user.onboardingRole || "landlord"
  });

  const [notifyForm, setNotifyForm] = useState({
    channel: "both",
    category: "general",
    title: "",
    message: ""
  });

  const openEdit = () => {
    setEditForm({
      name: user.name || "",
      phone: user.phone || "",
      companyName: user.companyName || "",
      address: user.address || "",
      kraPin: user.kraPin || "",
      onboardingRole: user.onboardingRole || "landlord"
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    await onEditProfile(editForm);
    setEditOpen(false);
  };

  const handleTemplateChange = (cat) => {
    const tpl = NOTIFICATION_TEMPLATES[cat] || NOTIFICATION_TEMPLATES.general;
    setNotifyForm((prev) => ({
      ...prev,
      category: cat,
      title: tpl.title || prev.title,
      message: tpl.message || prev.message
    }));
  };

  const handleNotifySubmit = async (e) => {
    e.preventDefault();
    if (!notifyForm.title.trim() || !notifyForm.message.trim()) return;
    await onSendNotification(notifyForm);
    setNotifyOpen(false);
    setNotifyForm({ channel: "both", category: "general", title: "", message: "" });
  };

  const statusLabel = String(user.accountStatus || "active").replace(/_/g, " ");
  const roleLabel = user.role === "admin" || user.role === "landlord" ? "Landlord" : user.role;

  return (
    <>
      <Card className="bg-white dark:bg-slate-900 border border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          {/* Left: Back button + Avatar + Identity */}
          <div className="flex items-start gap-3.5 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(adminHref("/users"))}
              className="h-8 px-2.5 text-xs border-[#E1E7EF] text-[#152238] hover:bg-[#F4F6FA] shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Users
            </Button>

            <div className="w-12 h-12 rounded-xl bg-[#102B4C] text-white font-bold text-base flex items-center justify-center shrink-0 shadow-xs">
              {getInitials(user.name)}
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-[#152238] dark:text-white tracking-tight truncate">
                  {user.name}
                </h1>
                <Badge variant="outline" className={`text-[11px] capitalize font-semibold ${statusBadgeClass(user.accountStatus)}`}>
                  {statusLabel}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[11px] font-medium flex items-center gap-1 ${
                    user.isVerified
                      ? "bg-[#16A36A]/10 text-[#16A36A] border-[#16A36A]/30"
                      : "bg-[#E9A23B]/15 text-[#B47412] border-[#E9A23B]/40"
                  }`}
                >
                  {user.isVerified ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {user.isVerified ? "Verified" : "Unverified"}
                </Badge>
                <Badge variant="outline" className="text-[11px] capitalize bg-[#102B4C]/5 text-[#102B4C] border-[#102B4C]/20">
                  {roleLabel}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#738197]">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#00B8B0]" />
                  <span className="text-[#152238] dark:text-slate-200 font-medium">{user.email}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#00B8B0]" />
                  <span>{user.phone || "No phone"}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#00B8B0]" />
                  <span>{user.companyName || "Individual Landlord"}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#738197] pt-0.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Registered: <strong className="text-[#152238] dark:text-slate-300 font-medium">{formatDate(user.createdAt)}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last Active: <strong className="text-[#152238] dark:text-slate-300 font-medium">{formatDateTime(engagement?.lastActiveAt || user.lastLoginAt)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Global Profile Search + Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 text-[#738197] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={globalSearch}
                onChange={(e) => onGlobalSearchChange(e.target.value)}
                placeholder="Search profile data..."
                className="h-8 pl-8 pr-2.5 text-xs border-[#E1E7EF] bg-[#F4F6FA]/60 focus:bg-white"
              />
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={openEdit}
              className="h-8 text-xs border-[#E1E7EF] text-[#152238] hover:bg-[#F4F6FA] cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit User
            </Button>

            <Button
              size="sm"
              onClick={() => setNotifyOpen(true)}
              className="h-8 text-xs bg-[#102B4C] hover:bg-[#16385E] text-white cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 mr-1.5" /> Send Notification
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-[#E1E7EF] text-[#152238] hover:bg-[#F4F6FA] cursor-pointer"
                >
                  <MoreHorizontal className="w-4 h-4 mr-1" /> More Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 text-xs">
                <DropdownMenuLabel className="text-[11px] text-[#738197]">Account Controls</DropdownMenuLabel>
                {!user.isVerified && (
                  <DropdownMenuItem
                    onClick={() =>
                      setConfirmState({
                        title: "Verify User Account",
                        description: `Mark ${user.email} as verified and activate their account immediately.`,
                        confirmLabel: "Verify Account",
                        onConfirm: () => onAccountAction({ action: "verify" })
                      })
                    }
                    className="cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-2 text-[#16A36A]" /> Verify Account
                  </DropdownMenuItem>
                )}

                {user.accountStatus !== "active" && (
                  <DropdownMenuItem
                    onClick={() =>
                      setConfirmState({
                        title: "Reactivate Account",
                        description: `Restore full workspace access for ${user.email}.`,
                        confirmLabel: "Reactivate Account",
                        onConfirm: () => onUpdateStatus({ accountStatus: "active", reason: "Reactivated via User 360 header" })
                      })
                    }
                    className="cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 mr-2 text-[#16A36A]" /> Reactivate Account
                  </DropdownMenuItem>
                )}

                {user.accountStatus !== "suspended" && (
                  <DropdownMenuItem
                    onClick={() =>
                      setConfirmState({
                        title: "Suspend Account",
                        description: `Suspending ${user.email} immediately revokes active sessions and restricts access.`,
                        confirmLabel: "Suspend Account",
                        confirmVariant: "destructive",
                        requireReason: true,
                        onConfirm: (reason) => onUpdateStatus({ accountStatus: "suspended", reason })
                      })
                    }
                    className="cursor-pointer text-[#DC4545]"
                  >
                    <Ban className="w-3.5 h-3.5 mr-2" /> Suspend Account
                  </DropdownMenuItem>
                )}

                {user.accountStatus !== "deactivated" && (
                  <DropdownMenuItem
                    onClick={() =>
                      setConfirmState({
                        title: "Deactivate Account",
                        description: `Deactivating ${user.email} disables sign-in while retaining all historical financial records.`,
                        confirmLabel: "Deactivate Account",
                        confirmVariant: "destructive",
                        requireReason: true,
                        onConfirm: (reason) => onUpdateStatus({ accountStatus: "deactivated", reason })
                      })
                    }
                    className="cursor-pointer text-[#DC4545]"
                  >
                    <Ban className="w-3.5 h-3.5 mr-2" /> Deactivate Account
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] text-[#738197]">Security &amp; Recovery</DropdownMenuLabel>

                <DropdownMenuItem
                  onClick={() =>
                    setConfirmState({
                      title: "Reset Account Access",
                      description: `Revoke all active JWT & refresh tokens and clear login lockouts for ${user.email}.`,
                      confirmLabel: "Reset Access",
                      onConfirm: () => onAccountAction({ action: "reset_access" })
                    })
                  }
                  className="cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-2 text-[#102B4C]" /> Reset Account Access
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() =>
                    setConfirmState({
                      title: "Force Password Reset",
                      description: `Sign out all sessions and trigger a password reset email to ${user.email}.`,
                      confirmLabel: "Force Password Reset",
                      onConfirm: () => onAccountAction({ action: "force_password_reset" })
                    })
                  }
                  className="cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 mr-2 text-[#E9A23B]" /> Force Password Reset
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() =>
                    setConfirmState({
                      title: "Resend Verification OTP",
                      description: `Generate a fresh 6-digit verification OTP and email it to ${user.email}.`,
                      confirmLabel: "Resend Verification",
                      onConfirm: () => onAccountAction({ action: "resend_verification" })
                    })
                  }
                  className="cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 mr-2 text-[#00B8B0]" /> Resend Verification
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onExportData("json")} className="cursor-pointer">
                  <Download className="w-3.5 h-3.5 mr-2 text-[#102B4C]" /> Export User Data (JSON)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExportData("csv")} className="cursor-pointer">
                  <Download className="w-3.5 h-3.5 mr-2 text-[#00B8B0]" /> Export User Data (CSV)
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    setConfirmState({
                      title: "Soft-Delete Account",
                      description: `Soft-deleting ${user.email} permanently disables login and flags the account as deleted while preserving protected financial & audit records.`,
                      confirmLabel: "Soft-Delete Account",
                      confirmVariant: "destructive",
                      requireReason: true,
                      onConfirm: (reason) => onAccountAction({ action: "soft_delete", reason })
                    })
                  }
                  className="cursor-pointer text-[#DC4545]"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Account (Soft)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {user.suspendedReason && (
          <div className="mt-3 p-2.5 rounded-lg bg-[#DC4545]/10 border border-[#DC4545]/25 text-xs text-[#DC4545] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Active Restriction:</strong> {user.suspendedReason}
            </span>
          </div>
        )}
      </Card>

      {/* Edit User Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#152238]">Edit User Profile</DialogTitle>
            <DialogDescription className="text-xs text-[#738197]">
              Update landlord profile metadata. Changes are recorded in the Super Admin audit log.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Full Name *</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone Number</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Company / Agency</Label>
                <Input value={editForm.companyName} onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">KRA PIN</Label>
                <Input value={editForm.kraPin} onChange={(e) => setEditForm({ ...editForm, kraPin: e.target.value })} className="h-8 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Physical Address</Label>
              <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="h-8 text-xs" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)} className="text-xs cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isMutating} className="bg-[#102B4C] hover:bg-[#16385E] text-white text-xs cursor-pointer">
                {isMutating && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Send Notification Dialog */}
      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#152238]">Send Notification to {user.name}</DialogTitle>
            <DialogDescription className="text-xs text-[#738197]">
              Dispatch an email and/or in-app notification directly to {user.email}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleNotifySubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Template / Category</Label>
                <select
                  value={notifyForm.category}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-[#E1E7EF] bg-white text-xs"
                >
                  <option value="general">General Message</option>
                  <option value="verification_reminder">Account Verification Reminder</option>
                  <option value="subscription_expiry">Subscription Expiry Reminder</option>
                  <option value="payment_reminder">Payment Reminder</option>
                  <option value="announcement">General Announcement</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Delivery Channel</Label>
                <select
                  value={notifyForm.channel}
                  onChange={(e) => setNotifyForm({ ...notifyForm, channel: e.target.value })}
                  className="w-full h-8 px-2.5 rounded-md border border-[#E1E7EF] bg-white text-xs"
                >
                  <option value="both">Email + In-App</option>
                  <option value="email">Email Only</option>
                  <option value="in_app">In-App Notification Only</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subject / Title *</Label>
              <Input
                value={notifyForm.title}
                onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })}
                placeholder="Enter notification subject..."
                required
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Message *</Label>
              <Textarea
                rows={4}
                value={notifyForm.message}
                onChange={(e) => setNotifyForm({ ...notifyForm, message: e.target.value })}
                placeholder="Write your message..."
                required
                className="text-xs"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setNotifyOpen(false)} className="text-xs cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isMutating} className="bg-[#00B8B0] hover:bg-[#009b94] text-white text-xs cursor-pointer">
                {isMutating && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Send Notification
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sensitive Action Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(confirmState)}
        onOpenChange={(open) => {
          if (!open) setConfirmState(null);
        }}
        title={confirmState?.title || "Confirm Action"}
        description={confirmState?.description || ""}
        confirmLabel={confirmState?.confirmLabel || "Confirm"}
        confirmVariant={confirmState?.confirmVariant || "default"}
        requireReason={Boolean(confirmState?.requireReason)}
        isPending={isMutating}
        onConfirm={async (reason) => {
          if (confirmState?.onConfirm) {
            await confirmState.onConfirm(reason);
          }
          setConfirmState(null);
        }}
      />
    </>
  );
}
