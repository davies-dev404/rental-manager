import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Settings, ShieldCheck, Save, AlertTriangle } from "lucide-react";

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: adminService.getSettings
  });

  const [form, setForm] = useState({
    platformName: "MakaziFlow",
    platformLogo: "",
    supportEmail: "",
    supportPhone: "",
    supportAddress: "",
    defaultCurrency: "KES",
    timezone: "Africa/Nairobi",
    maintenanceMode: false,
    maintenanceMessage: "",
    subscriptionConfig: {
      trialDays: 14,
      gracePeriodDays: 7,
      allowPublicSignup: true,
      autoExpirySweepEnabled: true
    },
    notifications: {
      emailOnNewUser: true,
      emailOnLargePayment: true,
      emailOnSupportTicket: true,
      adminAlertEmail: ""
    }
  });

  useEffect(() => {
    if (data?.settings) {
      setForm((prev) => ({
        ...prev,
        ...data.settings,
        subscriptionConfig: { ...prev.subscriptionConfig, ...(data.settings.subscriptionConfig || {}) },
        notifications: { ...prev.notifications, ...(data.settings.notifications || {}) }
      }));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload) => adminService.updateSettings(payload),
    onSuccess: () => {
      toast({ title: "Platform Settings Saved", description: "Global configuration updated and audited." });
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Save Failed", description: err.message })
  });

  const paymentStatus = data?.paymentConfigurationStatus || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Platform Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure global MakaziFlow branding, support channels, subscription defaults, maintenance mode, and inspect payment gateway health.
          </p>
        </div>
        <Button
          size="sm"
          disabled={saveMutation.isPending || isLoading}
          onClick={() => saveMutation.mutate(form)}
          className="bg-[#0d2240] hover:bg-[#132d4a] text-white text-xs cursor-pointer"
        >
          <Save className="w-3.5 h-3.5 mr-1.5" /> Save Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* General Platform Info */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#00a99d]" /> General &amp; Support Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <Label>Platform Name</Label>
              <Input value={form.platformName} onChange={(e) => setForm({ ...form, platformName: e.target.value })} />
            </div>
            <div>
              <Label>Platform Logo URL (HTTPS or base64 PNG/JPEG)</Label>
              <Input value={form.platformLogo} onChange={(e) => setForm({ ...form, platformLogo: e.target.value })} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Support Email</Label>
                <Input value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} />
              </div>
              <div>
                <Label>Support Phone</Label>
                <Input value={form.supportPhone} onChange={(e) => setForm({ ...form, supportPhone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Default Currency</Label>
                <Input value={form.defaultCurrency} onChange={(e) => setForm({ ...form, defaultCurrency: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <Label>Timezone</Label>
                <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription & Notification Config */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Subscription &amp; Notification Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Default Trial Days</Label>
                <Input
                  type="number"
                  value={form.subscriptionConfig.trialDays}
                  onChange={(e) =>
                    setForm({ ...form, subscriptionConfig: { ...form.subscriptionConfig, trialDays: Number(e.target.value) } })
                  }
                />
              </div>
              <div>
                <Label>Grace Period Days</Label>
                <Input
                  type="number"
                  value={form.subscriptionConfig.gracePeriodDays}
                  onChange={(e) =>
                    setForm({ ...form, subscriptionConfig: { ...form.subscriptionConfig, gracePeriodDays: Number(e.target.value) } })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Admin Alert Email</Label>
              <Input
                value={form.notifications.adminAlertEmail}
                onChange={(e) => setForm({ ...form, notifications: { ...form.notifications, adminAlertEmail: e.target.value } })}
              />
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span>Allow Public Self-Registration</span>
                <Switch
                  checked={Boolean(form.subscriptionConfig.allowPublicSignup)}
                  onCheckedChange={(v) => setForm({ ...form, subscriptionConfig: { ...form.subscriptionConfig, allowPublicSignup: v } })}
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Email Alert on Support Tickets</span>
                <Switch
                  checked={Boolean(form.notifications.emailOnSupportTicket)}
                  onCheckedChange={(v) => setForm({ ...form, notifications: { ...form.notifications, emailOnSupportTicket: v } })}
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Email Alert on Large Payments</span>
                <Switch
                  checked={Boolean(form.notifications.emailOnLargePayment)}
                  onCheckedChange={(v) => setForm({ ...form, notifications: { ...form.notifications, emailOnLargePayment: v } })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Read-Only Payment Configuration Status (Zero Secrets) */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00a99d]" /> Payment Configuration Status (Read-Only)
            </CardTitle>
            <CardDescription className="text-xs">
              API credentials remain isolated in backend environment variables and are never transmitted to the browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <span>Active Primary Gateway</span>
              <Badge className="bg-[#00a99d] text-white uppercase">{paymentStatus.activeProvider || "pesapal"} ({paymentStatus.activeEnvironment || "sandbox"})</Badge>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <span>Pesapal API 3.0</span>
              <Badge variant="outline">{paymentStatus.gateways?.pesapal?.configured ? `Configured (${paymentStatus.gateways.pesapal.environment})` : "Not Configured"}</Badge>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <span>IntaSend Gateway</span>
              <Badge variant="outline">{paymentStatus.gateways?.intasend?.configured ? `Configured (${paymentStatus.gateways.intasend.environment})` : "Not Configured"}</Badge>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <span>Brevo Email Relay</span>
              <Badge variant="outline">{paymentStatus.messaging?.brevoConfigured ? "Configured" : "Not Configured"}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Mode */}
        <Card className={`shadow-xs ${form.maintenanceMode ? "border-rose-300 bg-rose-50/40 dark:bg-rose-950/20" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${form.maintenanceMode ? "text-rose-600" : "text-amber-500"}`} />
              Maintenance Mode Control
            </CardTitle>
            <CardDescription className="text-xs">
              Enabling maintenance mode pauses regular landlord &amp; tenant workspace endpoints with HTTP 503 while preserving Super Admin access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-slate-900">
              <span className="font-semibold">Enable Maintenance Mode</span>
              <Switch
                checked={Boolean(form.maintenanceMode)}
                onCheckedChange={(v) => setForm({ ...form, maintenanceMode: v })}
              />
            </div>
            <div>
              <Label>Maintenance Notice Message</Label>
              <Textarea
                rows={3}
                value={form.maintenanceMessage}
                onChange={(e) => setForm({ ...form, maintenanceMessage: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
