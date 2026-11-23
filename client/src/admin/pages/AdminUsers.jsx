import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import DataTable from "../components/DataTable";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Search, Eye, ShieldCheck, Ban, UserCheck } from "lucide-react";

const STATUS_BADGE = {
  active: "bg-[#00a99d]/15 text-[#00a99d] border-[#00a99d]/30",
  suspended: "bg-rose-100 text-rose-700 border-rose-200",
  pending_verification: "bg-amber-100 text-amber-700 border-amber-200",
  deactivated: "bg-slate-200 text-slate-700 border-slate-300"
};

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [detailUserId, setDetailUserId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search, role, status, page],
    queryFn: () => adminService.getUsers({ search, role, status, page, limit: 15 })
  });

  const { data: userDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin-user-detail", detailUserId],
    queryFn: () => adminService.getUserDetail(detailUserId),
    enabled: Boolean(detailUserId)
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, payload }) => adminService.updateUserStatus(id, payload),
    onSuccess: (res) => {
      toast({
        title: "Account Status Updated",
        description: `${res.user?.email} is now ${(res.user?.accountStatus || "").replace(/_/g, " ")}.`
      });
      setConfirmAction(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Action Failed", description: err.message })
  });

  const columns = [
    {
      key: "name",
      label: "User",
      render: (u) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
          <p className="text-[11px] text-slate-500">{u.email} {u.phone ? `· ${u.phone}` : ""}</p>
        </div>
      )
    },
    {
      key: "role",
      label: "Role",
      render: (u) => <Badge variant="outline" className="text-[10px] capitalize">{u.role}</Badge>
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
        <span className="text-slate-600 dark:text-slate-300">
          {u.propertyCount || 0} props · {u.unitCount || 0} units
        </span>
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
      label: "Actions",
      align: "right",
      render: (u) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setDetailUserId(u._id)} className="h-7 px-2 text-[11px] cursor-pointer">
            <Eye className="w-3 h-3 mr-1" /> View
          </Button>
          {u.accountStatus !== "suspended" && u.role !== "superadmin" && !u.isSuperAdmin ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmAction({ user: u, nextStatus: "suspended" })}
              className="h-7 px-2 text-[11px] text-rose-600 border-rose-200 hover:bg-rose-50 cursor-pointer"
            >
              <Ban className="w-3 h-3 mr-1" /> Suspend
            </Button>
          ) : (
            u.role !== "superadmin" && !u.isSuperAdmin && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmAction({ user: u, nextStatus: "active" })}
                className="h-7 px-2 text-[11px] text-[#00a99d] border-[#00a99d]/30 cursor-pointer"
              >
                <UserCheck className="w-3 h-3 mr-1" /> Reactivate
              </Button>
            )
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">User Management</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Search registered users, inspect portfolios and subscriptions, and enforce account activation or suspension safeguards.
        </p>
      </div>

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
          <option value="all">All Roles</option>
          <option value="admin">Admin / Landlord</option>
          <option value="landlord">Landlord</option>
          <option value="manager">Property Manager</option>
          <option value="caretaker">Caretaker</option>
          <option value="tenant">Tenant</option>
          <option value="superadmin">Super Admin</option>
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
        emptyMessage="No users match the selected filters."
      />

      {/* User Detail Dialog */}
      <Dialog open={Boolean(detailUserId)} onOpenChange={() => setDetailUserId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00a99d]" />
              {userDetail?.user?.name || "User Details"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {userDetail?.user?.email} · Role: {userDetail?.user?.role}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <p className="text-xs text-slate-500 py-6 text-center">Loading profile...</p>
          ) : userDetail?.user && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg">
                <div>
                  <span className="text-slate-500 block">Status</span>
                  <strong className="capitalize">{String(userDetail.user.accountStatus).replace(/_/g, " ")}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Properties</span>
                  <strong>{userDetail.summary?.propertyCount || 0}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Units</span>
                  <strong>{userDetail.summary?.unitCount || 0}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Tenants</span>
                  <strong>{userDetail.summary?.tenantCount || 0}</strong>
                </div>
              </div>

              {userDetail.user.role !== "superadmin" && !userDetail.user.isSuperAdmin && (
                <div className="flex flex-wrap gap-2">
                  {userDetail.user.accountStatus !== "active" && (
                    <Button size="sm" onClick={() => setConfirmAction({ user: userDetail.user, nextStatus: "active" })} className="bg-[#00a99d] hover:bg-[#008f85] text-white text-xs cursor-pointer">
                      Activate Account
                    </Button>
                  )}
                  {userDetail.user.accountStatus !== "suspended" && (
                    <Button size="sm" variant="outline" onClick={() => setConfirmAction({ user: userDetail.user, nextStatus: "suspended" })} className="text-rose-600 border-rose-200 text-xs cursor-pointer">
                      Suspend Account
                    </Button>
                  )}
                  {userDetail.user.accountStatus !== "deactivated" && (
                    <Button size="sm" variant="outline" onClick={() => setConfirmAction({ user: userDetail.user, nextStatus: "deactivated" })} className="text-slate-600 text-xs cursor-pointer">
                      Deactivate
                    </Button>
                  )}
                </div>
              )}

              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1.5">Registered Properties ({userDetail.properties?.length || 0})</h4>
                {(userDetail.properties || []).length === 0 ? (
                  <p className="text-slate-400">No properties registered under this user.</p>
                ) : (
                  <div className="space-y-1.5">
                    {userDetail.properties.map((p) => (
                      <div key={p._id} className="border rounded-md p-2 flex justify-between items-center">
                        <span><strong>{p.name}</strong> · {p.location}</span>
                        <Badge variant="outline" className="text-[10px]">{p.type || "Apartment"}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1.5">Recent Activity ({userDetail.activityLogs?.length || 0})</h4>
                {(userDetail.activityLogs || []).length === 0 ? (
                  <p className="text-slate-400">No recent user activity.</p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {userDetail.activityLogs.slice(0, 10).map((a) => (
                      <div key={a._id} className="border-b border-slate-100 py-1 flex justify-between">
                        <span><strong>{a.action}</strong> — {a.description}</span>
                        <span className="text-slate-400 shrink-0 ml-2">{new Date(a.timestamp).toLocaleDateString("en-KE")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(confirmAction)}
        onOpenChange={() => setConfirmAction(null)}
        title={
          confirmAction?.nextStatus === "active"
            ? `Activate ${confirmAction?.user?.name}?`
            : `${confirmAction?.nextStatus === "suspended" ? "Suspend" : "Deactivate"} ${confirmAction?.user?.name}?`
        }
        description={
          confirmAction?.nextStatus === "active"
            ? "This restores full login access for the user immediately."
            : "This revokes active sessions and prevents the user from signing in until reactivated."
        }
        confirmLabel={confirmAction?.nextStatus === "active" ? "Confirm Activation" : "Confirm Restriction"}
        confirmVariant={confirmAction?.nextStatus === "active" ? "default" : "destructive"}
        requireReason={confirmAction?.nextStatus !== "active"}
        isPending={statusMutation.isPending}
        onConfirm={(reason) =>
          statusMutation.mutate({
            id: confirmAction.user._id,
            payload: { accountStatus: confirmAction.nextStatus, reason }
          })
        }
      />
    </div>
  );
}
