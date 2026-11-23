import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import { adminHref } from "../utils/msimamiziMode";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Award } from "lucide-react";

export default function AdminSubscriptionOverride({ landlordId }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    action: "activate",
    purchasedLimit: 10,
    expiryDate: "",
    reason: ""
  });

  const { data: userDetail } = useQuery({
    queryKey: ["admin-user-detail", landlordId],
    queryFn: () => adminService.getUserDetail(landlordId),
    enabled: Boolean(landlordId)
  });

  useEffect(() => {
    if (userDetail) {
      const ent = userDetail.entitlement;
      const latestSub = userDetail.subscriptions?.[0];
      setForm((prev) => ({
        ...prev,
        purchasedLimit: ent?.purchasedLimit || latestSub?.purchasedUnits || prev.purchasedLimit,
        expiryDate: latestSub?.expiryDate ? new Date(latestSub.expiryDate).toISOString().slice(0, 10) : prev.expiryDate
      }));
    }
  }, [userDetail]);

  const overrideMutation = useMutation({
    mutationFn: (payload) => adminService.overrideSubscription(landlordId, payload),
    onSuccess: () => {
      toast({ title: "Subscription Updated", description: "Landlord subscription override recorded in Audit Log." });
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setLocation(adminHref("/subscriptions"));
    },
    onError: (err) => toast({ variant: "destructive", title: "Override Failed", description: err.message })
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    overrideMutation.mutate(form);
  };

  return (
    <div className="space-y-5 max-w-xl">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setLocation(adminHref("/subscriptions"))} className="h-8 text-xs cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Subscriptions
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-[#00a99d]" />
            Override Subscription: {userDetail?.user?.name || "Subscriber"}
          </h1>
          <p className="text-xs text-slate-500">{userDetail?.user?.email || ""}</p>
        </div>
      </div>

      <Card className="bg-white dark:bg-slate-900 shadow-xs">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Administrative Override</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div>
              <Label>Administrative Action</Label>
              <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} className="w-full h-9 rounded-md border px-2 text-xs bg-white dark:bg-slate-800">
                <option value="activate">Activate Subscription</option>
                <option value="renew">Renew / Extend Expiry</option>
                <option value="extend_trial">Extend Free Trial</option>
                <option value="upgrade">Adjust Unit Allowance</option>
                <option value="cancel">Cancel Subscription</option>
                <option value="suspend">Suspend Subscription</option>
              </select>
            </div>
            <div>
              <Label>Unit Allowance Limit</Label>
              <Input type="number" value={form.purchasedLimit} onChange={(e) => setForm({ ...form, purchasedLimit: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Expiry / Renewal Date</Label>
              <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
            <div>
              <Label>Audit Reason</Label>
              <Textarea rows={3} required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Provide verification reference or justification..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setLocation(adminHref("/subscriptions"))} className="text-xs cursor-pointer">Cancel</Button>
              <Button type="submit" size="sm" disabled={overrideMutation.isPending} className="bg-[#0d2240] hover:bg-[#132d4a] text-white text-xs cursor-pointer">
                <Save className="w-3.5 h-3.5 mr-1.5" /> {overrideMutation.isPending ? "Applying..." : "Apply Override"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
