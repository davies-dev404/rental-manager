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
import { ArrowLeft, Save, Layers } from "lucide-react";

const emptyPlanForm = {
  code: "",
  name: "",
  maxUnits: 10,
  isCustomUnlimited: false,
  monthly: 0,
  quarterly: 0,
  semi_annual: 0,
  annual: 0,
  trialDays: 14,
  gracePeriodDays: 7,
  discountPercent: 0,
  featuresText: "",
  isActive: true
};

export default function AdminSubscriptionPlanForm({ id, mode = "create" }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyPlanForm);

  const { data } = useQuery({
    queryKey: ["admin-subscriptions", "all", "all", 1],
    queryFn: () => adminService.getSubscriptions({ status: "all", planCode: "all", page: 1, limit: 15 }),
    enabled: mode === "edit" && Boolean(id)
  });

  useEffect(() => {
    if (mode === "edit" && id && data?.plans) {
      const p = data.plans.find((x) => String(x._id) === String(id));
      if (p) {
        setForm({
          code: p.code || "",
          name: p.name || "",
          maxUnits: p.maxUnits || 5,
          isCustomUnlimited: Boolean(p.isCustomUnlimited),
          monthly: p.pricing?.monthly || 0,
          quarterly: p.pricing?.quarterly || 0,
          semi_annual: p.pricing?.semi_annual || 0,
          annual: p.pricing?.annual || 0,
          trialDays: p.trialDays || 14,
          gracePeriodDays: p.gracePeriodDays || 7,
          discountPercent: p.discountPercent || 0,
          featuresText: (p.features || []).join("\n"),
          isActive: p.isActive !== false
        });
      }
    }
  }, [data, id, mode]);

  const savePlanMutation = useMutation({
    mutationFn: (payload) => (mode === "create" ? adminService.createPlan(payload) : adminService.updatePlan(id, payload)),
    onSuccess: () => {
      toast({ title: "Subscription Plan Saved" });
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      setLocation(adminHref("/subscriptions"));
    },
    onError: (err) => toast({ variant: "destructive", title: "Save Failed", description: err.message })
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    savePlanMutation.mutate({
      code: String(form.code || "").trim().toLowerCase(),
      name: String(form.name || "").trim(),
      maxUnits: Number(form.maxUnits || 5),
      isCustomUnlimited: Boolean(form.isCustomUnlimited),
      pricing: {
        monthly: Number(form.monthly || 0),
        quarterly: Number(form.quarterly || 0),
        semi_annual: Number(form.semi_annual || 0),
        annual: Number(form.annual || 0)
      },
      trialDays: Number(form.trialDays || 14),
      gracePeriodDays: Number(form.gracePeriodDays || 7),
      discountPercent: Number(form.discountPercent || 0),
      features: String(form.featuresText || "").split("\n").map((x) => x.trim()).filter(Boolean),
      isActive: Boolean(form.isActive)
    });
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setLocation(adminHref("/subscriptions"))} className="h-8 text-xs cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Subscriptions
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#00a99d]" />
            {mode === "create" ? "Create Subscription Plan" : `Edit Plan: ${form.name || form.code}`}
          </h1>
          <p className="text-xs text-slate-500">Configure pricing intervals (KES), unit cap, trial/grace days, and plan features.</p>
        </div>
      </div>

      <Card className="bg-white dark:bg-slate-900 shadow-xs">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Plan Configuration</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <Label>Plan Code</Label>
              <Input value={form.code} disabled={mode === "edit"} required onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. free, basic, pro" />
            </div>
            <div>
              <Label>Plan Name</Label>
              <Input value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Professional" />
            </div>
            <div>
              <Label>Max Units</Label>
              <Input type="number" value={form.maxUnits} onChange={(e) => setForm({ ...form, maxUnits: Number(e.target.value) })} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isCustomUnlimited} onChange={(e) => setForm({ ...form, isCustomUnlimited: e.target.checked })} />
                <span>Custom / Unlimited Units</span>
              </label>
            </div>
            <div><Label>Monthly (KES)</Label><Input type="number" value={form.monthly} onChange={(e) => setForm({ ...form, monthly: Number(e.target.value) })} /></div>
            <div><Label>Quarterly (KES)</Label><Input type="number" value={form.quarterly} onChange={(e) => setForm({ ...form, quarterly: Number(e.target.value) })} /></div>
            <div><Label>Semi-Annual (KES)</Label><Input type="number" value={form.semi_annual} onChange={(e) => setForm({ ...form, semi_annual: Number(e.target.value) })} /></div>
            <div><Label>Annual (KES)</Label><Input type="number" value={form.annual} onChange={(e) => setForm({ ...form, annual: Number(e.target.value) })} /></div>
            <div><Label>Trial Days</Label><Input type="number" value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: Number(e.target.value) })} /></div>
            <div><Label>Grace Period Days</Label><Input type="number" value={form.gracePeriodDays} onChange={(e) => setForm({ ...form, gracePeriodDays: Number(e.target.value) })} /></div>
            <div className="sm:col-span-2">
              <Label>Plan Features (one per line)</Label>
              <Textarea rows={4} value={form.featuresText} onChange={(e) => setForm({ ...form, featuresText: e.target.value })} />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setLocation(adminHref("/subscriptions"))} className="text-xs cursor-pointer">Cancel</Button>
              <Button type="submit" size="sm" disabled={savePlanMutation.isPending} className="bg-[#00a99d] hover:bg-[#008f85] text-white text-xs cursor-pointer">
                <Save className="w-3.5 h-3.5 mr-1.5" /> {savePlanMutation.isPending ? "Saving..." : "Save Plan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
