import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import { adminHref } from "../utils/msimamiziMode";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Award,
  ShieldCheck,
  LifeBuoy,
  ArrowLeft,
  RefreshCw
} from "lucide-react";

import User360Header from "../components/user360/User360Header";
import OverviewTab from "../components/user360/OverviewTab";
import PropertiesTab from "../components/user360/PropertiesTab";
import TenantsTab from "../components/user360/TenantsTab";
import PaymentsTab from "../components/user360/PaymentsTab";
import SubscriptionsTab from "../components/user360/SubscriptionsTab";
import SecurityAuditTab from "../components/user360/SecurityAuditTab";
import SupportTab from "../components/user360/SupportTab";

function User360Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-28 rounded-xl bg-white border border-[#E1E7EF]" />
      <div className="h-11 rounded-xl bg-white border border-[#E1E7EF]" />
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-white border border-[#E1E7EF]" />
        ))}
      </div>
      <div className="h-72 rounded-xl bg-white border border-[#E1E7EF]" />
    </div>
  );
}

export default function AdminUserDetail({ id }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [globalSearch, setGlobalSearch] = useState("");

  const {
    data: userDetail,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ["admin-user-detail", id],
    queryFn: () => adminService.getUserDetail(id),
    enabled: Boolean(id)
  });

  const invalidateUser = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-user-detail", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-user-security", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-user-support", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };

  const editProfileMutation = useMutation({
    mutationFn: (payload) => adminService.updateUserProfile(id, payload),
    onSuccess: () => {
      toast({ title: "Profile Updated", description: "User details updated and recorded in audit log." });
      invalidateUser();
    },
    onError: (err) => toast({ variant: "destructive", title: "Update Failed", description: err.message })
  });

  const statusMutation = useMutation({
    mutationFn: (payload) => adminService.updateUserStatus(id, payload),
    onSuccess: (res) => {
      toast({
        title: "Account Status Updated",
        description: `${res.user?.email} is now ${(res.user?.accountStatus || "").replace(/_/g, " ")}.`
      });
      invalidateUser();
    },
    onError: (err) => toast({ variant: "destructive", title: "Action Failed", description: err.message })
  });

  const accountActionMutation = useMutation({
    mutationFn: (payload) => adminService.performUserAccountAction(id, payload),
    onSuccess: (res) => {
      toast({ title: "Security Action Completed", description: res?.message || "Account updated." });
      invalidateUser();
    },
    onError: (err) => toast({ variant: "destructive", title: "Action Failed", description: err.message })
  });

  const notifyMutation = useMutation({
    mutationFn: (payload) => adminService.sendUserNotification(id, payload),
    onSuccess: (res) => {
      toast({
        title: "Notification Sent",
        description:
          res?.emailStatus === "failed"
            ? `In-app notification saved, email failed: ${res.emailError}`
            : "Notification dispatched and recorded in audit log."
      });
      invalidateUser();
    },
    onError: (err) => toast({ variant: "destructive", title: "Notification Failed", description: err.message })
  });

  const handleExport = async (format) => {
    try {
      await adminService.exportUserData(id, format);
      toast({ title: "Export Ready", description: `Downloaded User 360 data (${format.toUpperCase()}).` });
    } catch (err) {
      toast({ variant: "destructive", title: "Export Failed", description: err.message });
    }
  };

  if (isLoading) {
    return <User360Skeleton />;
  }

  if (isError) {
    return (
      <Card className="p-8 text-center space-y-3 bg-white border-[#E1E7EF] rounded-xl">
        <p className="text-sm font-semibold text-[#DC4545]">
          {error?.message || "Failed to load subscriber 360° profile."}
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setLocation(adminHref("/users"))} className="text-xs cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Users
          </Button>
          <Button size="sm" onClick={() => refetch()} className="bg-[#102B4C] text-white text-xs cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
          </Button>
        </div>
      </Card>
    );
  }

  const u = userDetail?.user;
  if (!u) {
    return (
      <Card className="p-8 text-center space-y-3 bg-white border-[#E1E7EF] rounded-xl">
        <p className="text-sm text-[#DC4545]">Subscriber profile not found.</p>
        <Button variant="outline" size="sm" onClick={() => setLocation(adminHref("/users"))} className="text-xs cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Users
        </Button>
      </Card>
    );
  }

  const summary = userDetail.summary || {};

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "properties", label: "Properties", icon: Building2, count: summary.propertyCount },
    { id: "tenants", label: "Tenants", icon: Users, count: summary.tenantCount },
    { id: "payments", label: "Payments", icon: CreditCard, count: summary.totalPaymentRecords },
    { id: "subscriptions", label: "Subscriptions", icon: Award },
    { id: "security", label: "Security & Audit", icon: ShieldCheck, count: userDetail.securityAlerts?.length || 0 },
    { id: "support", label: "Support", icon: LifeBuoy, count: summary.supportTicketCount }
  ];

  const isMutating =
    editProfileMutation.isPending ||
    statusMutation.isPending ||
    accountActionMutation.isPending ||
    notifyMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Persistent User 360° Profile Header */}
      <User360Header
        user={u}
        engagement={userDetail.engagement}
        globalSearch={globalSearch}
        onGlobalSearchChange={setGlobalSearch}
        onEditProfile={(payload) => editProfileMutation.mutateAsync(payload)}
        onUpdateStatus={(payload) => statusMutation.mutateAsync(payload)}
        onAccountAction={(payload) => accountActionMutation.mutateAsync(payload)}
        onSendNotification={(payload) => notifyMutation.mutateAsync(payload)}
        onExportData={handleExport}
        isMutating={isMutating}
      />

      {/* Responsive 7-Tab Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 border border-[#E1E7EF] dark:border-slate-800 rounded-xl shadow-xs p-1.5 overflow-x-auto">
        <nav className="flex items-center gap-1 min-w-max" aria-label="User 360 Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-[#102B4C] text-white shadow-2xs"
                    : "text-[#738197] hover:text-[#152238] hover:bg-[#F4F6FA] dark:hover:bg-slate-800"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#00B8B0]" : ""}`} />
                <span>{tab.label}</span>
                {typeof tab.count === "number" && tab.count > 0 && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-white/15 text-white" : "bg-[#F4F6FA] text-[#152238]"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab userDetail={userDetail} globalSearch={globalSearch} onSelectTab={setActiveTab} />
      )}
      {activeTab === "properties" && (
        <PropertiesTab userId={id} globalSearch={globalSearch} onNavigateToTab={setActiveTab} />
      )}
      {activeTab === "tenants" && <TenantsTab userId={id} globalSearch={globalSearch} />}
      {activeTab === "payments" && <PaymentsTab userId={id} globalSearch={globalSearch} />}
      {activeTab === "subscriptions" && <SubscriptionsTab userId={id} />}
      {activeTab === "security" && <SecurityAuditTab userId={id} />}
      {activeTab === "support" && <SupportTab userId={id} userEmail={u.email} />}
    </div>
  );
}
