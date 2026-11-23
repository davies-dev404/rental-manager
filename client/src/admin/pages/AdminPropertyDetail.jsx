import React, { useState } from "react";
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
import { ArrowLeft, Building2, Flag, CheckCircle2 } from "lucide-react";

export default function AdminPropertyDetail({ id }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [showFlagForm, setShowFlagForm] = useState(false);

  const { data: detail, isLoading } = useQuery({
    queryKey: ["admin-property-detail", id],
    queryFn: () => adminService.getPropertyDetail(id),
    enabled: Boolean(id)
  });

  const flagMutation = useMutation({
    mutationFn: (payload) => adminService.flagProperty(id, payload),
    onSuccess: (res) => {
      toast({
        title: "Property Status Updated",
        description: `"${res.property?.name}" marked as ${res.property?.status}.`
      });
      setShowFlagForm(false);
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-property-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Update Failed", description: err.message })
  });

  if (isLoading) {
    return <p className="text-xs text-slate-500 py-8 text-center">Loading property details...</p>;
  }

  const prop = detail?.property;
  if (!prop) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setLocation(adminHref("/properties"))} className="text-xs cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Properties
        </Button>
        <p className="text-sm text-rose-600">Property not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setLocation(adminHref("/properties"))} className="h-8 text-xs cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Properties
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#00a99d]" />
              {prop.name}
            </h1>
            <p className="text-xs text-slate-500">
              {prop.location} · {prop.type || "Apartment"} · Landlord: {detail.landlord?.name || "—"} ({detail.landlord?.email})
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs uppercase self-start sm:self-auto">
          {prop.isFlagged ? "Flagged" : (prop.status || "Active")}
        </Badge>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <Card className="bg-white dark:bg-slate-900"><CardContent className="p-3.5"><span className="text-slate-500 block">Total Units</span><strong className="text-lg">{detail.occupancy?.totalUnits || 0}</strong></CardContent></Card>
        <Card className="bg-white dark:bg-slate-900"><CardContent className="p-3.5"><span className="text-slate-500 block">Occupied Units</span><strong className="text-lg">{detail.occupancy?.occupiedUnits || 0}</strong></CardContent></Card>
        <Card className="bg-white dark:bg-slate-900"><CardContent className="p-3.5"><span className="text-slate-500 block">Vacant Units</span><strong className="text-lg">{detail.occupancy?.vacantUnits || 0}</strong></CardContent></Card>
        <Card className="bg-white dark:bg-slate-900"><CardContent className="p-3.5"><span className="text-slate-500 block">Tenants Registered</span><strong className="text-lg text-[#00a99d]">{detail.occupancy?.tenantCount || 0}</strong></CardContent></Card>
        <Card className="bg-white dark:bg-slate-900"><CardContent className="p-3.5"><span className="text-slate-500 block">Occupancy Rate</span><strong className="text-lg">{detail.occupancy?.occupancyRate || 0}%</strong></CardContent></Card>
      </div>

      {/* Inline Moderation Section */}
      <Card className="bg-white dark:bg-slate-900 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">Property Moderation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {prop.flagReason && (
            <div className="bg-rose-50 border border-rose-200 rounded-md p-2.5 text-rose-800">
              <strong>Flag Reason:</strong> {prop.flagReason}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {prop.isFlagged || prop.status === "flagged" ? (
              <Button
                size="sm"
                disabled={flagMutation.isPending}
                onClick={() => flagMutation.mutate({ status: "active", isFlagged: false, reason: "Flag cleared on Property Detail page" })}
                className="bg-[#00a99d] hover:bg-[#008f85] text-white text-xs cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Restore Active
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowFlagForm(true)}
                className="text-rose-600 border-rose-200 text-xs cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5 mr-1.5" /> Flag Property
              </Button>
            )}
          </div>

          {showFlagForm && (
            <div className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-800/60 space-y-2.5 max-w-lg">
              <Label className="text-xs font-semibold">Moderation Reason</Label>
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this property is being flagged..." />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={flagMutation.isPending || !reason.trim()}
                  onClick={() => flagMutation.mutate({ status: "flagged", isFlagged: true, reason: reason.trim() })}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs cursor-pointer"
                >
                  Confirm Flag
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowFlagForm(false); setReason(""); }} className="text-xs cursor-pointer">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Associated Units */}
      <Card className="bg-white dark:bg-slate-900 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">Configured Units ({detail.units?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {(detail.units || []).length === 0 ? (
            <p className="text-xs text-slate-400">No units configured for this property yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
              {detail.units.map((u) => (
                <div key={u._id} className="border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold">Unit {u.unitNumber}</p>
                    <p className="text-[11px] text-slate-500">{u.type} · KES {Number(u.rentAmount || 0).toLocaleString()}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">{u.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
