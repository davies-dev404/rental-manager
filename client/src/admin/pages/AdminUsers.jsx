import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import { adminHref } from "../utils/msimamiziMode";
import DataTable from "../components/DataTable";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Trash2 } from "lucide-react";

const STATUS_BADGE = {
  active: "bg-[#00a99d]/15 text-[#00a99d] border-[#00a99d]/30",
  suspended: "bg-rose-100 text-rose-700 border-rose-200",
  pending_verification: "bg-amber-100 text-amber-700 border-amber-200",
  deactivated: "bg-slate-200 text-slate-700 border-slate-300"
};

function formatRoleLabel(role, isSuperAdmin) {
  const r = String(role || "").toLowerCase();
  if (isSuperAdmin || r === "superadmin") return "Super Admin";
  if (r === "admin" || r === "landlord") return "Landlord";
  if (r === "caretaker") return "Caretaker";
  if (r === "tenant") return "Tenant";
  return role || "Landlord";
}

export default function AdminUsers() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [confirmCleanup, setConfirmCleanup] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search, role, status, page],
    queryFn: () => adminService.getUsers({ search, role, status, page, limit: 15 })
  });

  const cleanupTestsMutation = useMutation({
    mutationFn: () => adminService.cleanupTestAccounts(["kipsoidavis@gmail.com"]),
    onSuccess: (res) => {
      toast({
        title: "Test Accounts Cleaned",
        description: `Removed ${res.deletedUsers || 0} old test account(s) & ${res.deletedProperties || 0} test properties. Active landlord: kipsoidavis@gmail.com.`
      });
      setConfirmCleanup(false);
      queryClient.invalidateQueries();
    },
    onError: (err) => toast({ variant: "destructive", title: "Cleanup Failed", description: err.message })
  });

  const columns = [
    {
      key: "name",
      label: "Subscriber",
      render: (u) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">
            {u.name} {u.companyName ? <span className="font-normal text-slate-500">· {u.companyName}</span> : ""}
          </p>
          <p className="text-[11px] text-slate-500">{u.email} {u.phone ? `· ${u.phone}` : ""}</p>
        </div>
      )
    },
    {
      key: "role",
      label: "Role",
      render: (u) => <Badge variant="outline" className="text-[10px]">{formatRoleLabel(u.role, u.isSuperAdmin)}</Badge>
    },
    {
      key: "accountStatus",
      label: "Status",
      render: (u) => (
        <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_BADGE[u.accountStatus] || ""}`}>
          {String(u.accountStatus || "active").replace(/_/g, " ")}
        </Badge>
      )
    },
    {
      key: "subscription",
      label: "Subscription",
      render: (u) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {u.entitlement?.planName || u.subscription?.planName || u.subscriptionTier || "Starter"}
          </p>
          <p className="text-[10px] text-slate-500 capitalize">
            {u.entitlement?.status || u.subscription?.status || "trial"}
          </p>
        </div>
      )
    },
    {
      key: "portfolio",
      label: "Portfolio",
      render: (u) => (
        <div>
          <span className="text-slate-600 dark:text-slate-300 block">
            {u.propertyCount || 0} props · {u.unitCount || 0} units · {u.tenantCount || 0} tenants
          </span>
          <span className="text-[10.5px] font-semibold text-[#00a99d]">
            KES {Number(u.revenueGenerated || 0).toLocaleString()} collected
          </span>
        </div>
      )
    },
    {
      key: "createdAt",
      label: "Registered",
      render: (u) => (
        <span className="text-slate-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-KE") : "—"}</span>
      )
    },
    {
      key: "actions",
      label: "Manage",
      align: "right",
      render: (u) => (
        <Button size="sm" variant="outline" onClick={() => setLocation(adminHref(`/users/${u._id}`))} className="h-7 px-2.5 text-[11px] cursor-pointer">
          <Eye className="w-3 h-3 mr-1" /> View Profile
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Subscriber &amp; User Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor registered MakaziFlow landlords &amp; users, inspect full business profiles, and manage account status.
          </p>
        </div>
        {(data?.items?.length || 0) > 1 && !confirmCleanup && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmCleanup(true)}
            className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 cursor-pointer shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Keep Only kipsoidavis@gmail.com
          </Button>
        )}
      </div>

      {confirmCleanup && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <p className="text-rose-900 dark:text-rose-200 font-medium">
            Remove all other test user accounts and test properties permanently while keeping <strong>kipsoidavis@gmail.com</strong>?
          </p>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              disabled={cleanupTestsMutation.isPending}
              onClick={() => cleanupTestsMutation.mutate()}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs cursor-pointer"
            >
              {cleanupTestsMutation.isPending ? "Cleaning..." : "Confirm Purge"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmCleanup(false)} className="text-xs cursor-pointer">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative sm:col-span-2">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email or phone..."
            className="pl-8 h-8.5 text-xs"
          />
        </div>
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="h-8.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs"
        >
          <option value="all">All Subscriber Roles</option>
          <option value="admin">Admin / Landlord</option>
          <option value="landlord">Landlord</option>
          <option value="manager">Property Manager</option>
          <option value="caretaker">Caretaker</option>
          <option value="tenant">Tenant</option>
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="h-8.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending_verification">Pending Verification</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        emptyMessage="No subscribers match the selected filters."
      />
    </div>
  );
}
