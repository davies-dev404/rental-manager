import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  Database,
  Server,
  ShieldAlert,
  RefreshCw,
  Wifi,
  CreditCard,
  HardDrive,
  RotateCcw,
  CheckCircle2,
  ToggleLeft,
  Layers
} from "lucide-react";

export default function AdminSystemHealth() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: health, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-system-health"],
    queryFn: adminService.getSystemHealth,
    refetchInterval: 15000
  });

  const { data: dlqData } = useQuery({
    queryKey: ["admin-dlq"],
    queryFn: () => adminService.getDeadLetterJobs({ status: "dead" })
  });

  const { data: flagsData } = useQuery({
    queryKey: ["admin-feature-flags"],
    queryFn: adminService.getFeatureFlags
  });

  const flagMutation = useMutation({
    mutationFn: ({ key, enabled }) => adminService.updateFeatureFlag(key, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feature-flags"] });
      toast({ title: "Feature Flag Updated", description: "Rollout configuration saved." });
    },
    onError: (err) => toast({ variant: "destructive", title: "Update Failed", description: err.message })
  });

  const replayMutation = useMutation({
    mutationFn: (id) => adminService.replayDeadLetterJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dlq"] });
      queryClient.invalidateQueries({ queryKey: ["admin-system-health"] });
      toast({ title: "Job Replayed", description: "Dead letter job executed cleanly." });
    },
    onError: (err) => toast({ variant: "destructive", title: "Replay Failed", description: err.message })
  });

  const resolveMutation = useMutation({
    mutationFn: (id) => adminService.resolveDeadLetterJob(id, "Resolved via System Health console"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dlq"] });
      queryClient.invalidateQueries({ queryKey: ["admin-system-health"] });
      toast({ title: "Job Resolved" });
    }
  });

  const app = health?.application || {};
  const db = health?.database || {};
  const infra = health?.infrastructure || {};
  const rel = health?.reliability || {};
  const pay = health?.payments || {};
  const sec = health?.security || {};
  const backups = health?.backups || {};
  const dlqJobs = dlqData?.jobs || [];
  const flags = flagsData?.flags || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0d2240] dark:text-white tracking-tight">
            System Health &amp; SRE Telemetry
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Live infrastructure status, latency percentiles, circuit breakers, DLQ replay &amp; feature flags.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 text-xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh Telemetry
        </Button>
      </div>

      {/* Top SRE Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span>APPLICATION STATUS</span>
              <Server className="w-4 h-4 text-[#00a99d]" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge className={app.status === "healthy" ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}>
                {isLoading ? "Checking..." : String(app.status || "unknown").toUpperCase()}
              </Badge>
              <span className="text-xs text-slate-500">{app.env}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Uptime: <strong>{app.uptimeSeconds ?? 0}s</strong> · RSS: <strong>{app.memoryMB?.rss ?? 0} MB</strong>
            </p>
            <p className="text-[11px] text-slate-400">PID {app.pid || "-"} · Node {app.nodeVersion || "-"}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span>MONGODB ATLAS</span>
              <Database className="w-4 h-4 text-[#00a99d]" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <Badge className={db.healthy ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}>
              {String(db.status || "unknown").toUpperCase()}
            </Badge>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Ping Latency: <strong>{db.pingLatencyMs != null ? `${db.pingLatencyMs} ms` : "N/A"}</strong>
            </p>
            <p className="text-[11px] text-slate-400">Backup Policy: {backups.policyDoc || "BACKUP_AND_RECOVERY.md"}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span>API LATENCY &amp; ERRORS</span>
              <Activity className="w-4 h-4 text-[#00a99d]" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <p className="text-slate-700 dark:text-slate-200">
              P50: <strong>{rel.latencyMs?.p50 ?? 0}ms</strong> · P95: <strong>{rel.latencyMs?.p95 ?? 0}ms</strong> · P99: <strong>{rel.latencyMs?.p99 ?? 0}ms</strong>
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              5xx Error Rate: <strong>{rel.errorRate5xxPct ?? 0}%</strong> ({rel.totalRequests ?? 0} reqs)
            </p>
            <p className="text-[11px] text-slate-400">
              Auth Failures: {sec.authFailuresSinceBoot ?? 0} · Rate Limits: {sec.rateLimitHitsSinceBoot ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span>REDIS, QUEUES &amp; SOCKETS</span>
              <Wifi className="w-4 h-4 text-[#00a99d]" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <p>
              Redis: <strong className="capitalize">{infra.redis?.status || "not_configured"}</strong> · Cache:{" "}
              <strong>{infra.cache?.backend || "memory"}</strong>
            </p>
            <p>
              Queues: <strong>{infra.queues?.mode || "inline_fallback"}</strong> · DLQ Pending: <strong>{rel.deadLetterJobsPending ?? 0}</strong>
            </p>
            <p className="text-[11px] text-slate-400">
              Socket.IO Clients: {infra.socket?.connectedClients ?? 0} · Failed Txns (24h): {pay.failedLast24h ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gateway, Tax & Email Integration Readiness */}
      {health?.integrations && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#00a99d]" /> Gateway, KRA eTIMS &amp; Email Integration Readiness
            </CardTitle>
            <CardDescription className="text-xs">
              Live configuration status and operational reconciliation queues across external providers.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 text-xs">
            {[
              { label: "Pesapal", ok: health.integrations.pesapalConfigured },
              { label: "IntaSend", ok: health.integrations.intasendConfigured },
              { label: "M-Pesa Paybill", ok: health.integrations.mpesaConfigured },
              { label: "KRA eTIMS", ok: health.integrations.etimsConfigured },
              { label: "Brevo Email", ok: health.integrations.brevoConfigured }
            ].map((item) => (
              <div key={item.label} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
                <p className="text-[11px] font-semibold text-slate-500">{item.label}</p>
                <Badge variant="outline" className={`mt-1 text-[10px] ${item.ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                  {item.ok ? "Configured" : "Not Configured"}
                </Badge>
              </div>
            ))}
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
              <p className="text-[11px] font-semibold text-slate-500">Unmatched Webhooks</p>
              <p className="text-base font-extrabold text-amber-600 mt-0.5">{pay.unmatchedCallbacksCount ?? 0}</p>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
              <p className="text-[11px] font-semibold text-slate-500">Failed eTIMS</p>
              <p className="text-base font-extrabold text-rose-600 mt-0.5">{pay.failedEtimsCount ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Circuit Breakers & Cache Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#00a99d]" /> External Service Circuit Breakers
            </CardTitle>
            <CardDescription className="text-xs">
              Real-time state of Pesapal, IntaSend, and Brevo resilience breakers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {(infra.circuitBreakers || []).length === 0 ? (
              <p className="text-xs text-slate-500">All external adapters initialize breakers on first request.</p>
            ) : (
              infra.circuitBreakers.map((b) => (
                <div key={b.name} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{b.name}</p>
                    <p className="text-[11px] text-slate-500">
                      Failures: {b.failures} / {b.failureThreshold}
                      {b.lastFailure?.message ? ` · Last: ${b.lastFailure.message}` : ""}
                    </p>
                  </div>
                  <Badge className={b.state === "CLOSED" ? "bg-emerald-600 text-white" : b.state === "HALF-OPEN" ? "bg-amber-600 text-white" : "bg-rose-600 text-white"}>
                    {b.state}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Feature Flags */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ToggleLeft className="w-4 h-4 text-[#00a99d]" /> Feature Flags &amp; Safe Releases
            </CardTitle>
            <CardDescription className="text-xs">
              Controlled rollout and emergency kill-switches restricted strictly to Msimamizi Super Admins.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {flags.map((flag) => (
              <div key={flag.key} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-xs text-slate-900 dark:text-white">{flag.name}</p>
                    <Badge variant="outline" className="text-[10px] capitalize">{flag.category}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{flag.description}</p>
                </div>
                <Switch
                  checked={Boolean(flag.enabled)}
                  disabled={flagMutation.isPending}
                  onCheckedChange={(checked) => flagMutation.mutate({ key: flag.key, enabled: checked })}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Dead Letter Queue */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#00a99d]" /> Dead Letter Queue ({dlqJobs.length} Pending)
          </CardTitle>
          <CardDescription className="text-xs">
            Repeatedly failing webhook verifications or background jobs captured safely for inspection and controlled replay.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dlqJobs.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> No pending dead letter jobs require attention.
            </div>
          ) : (
            <div className="space-y-2.5">
              {dlqJobs.map((job) => (
                <div key={job._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {job.queueName} · {job.jobName} <span className="text-slate-400 font-normal">(attempts: {job.attempts})</span>
                    </p>
                    <p className="text-rose-600 text-[11px] truncate">{job.errorMessage}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => replayMutation.mutate(job._id)}
                      disabled={replayMutation.isPending}
                      className="h-7 text-[11px] cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" /> Replay
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => resolveMutation.mutate(job._id)}
                      disabled={resolveMutation.isPending}
                      className="h-7 text-[11px] cursor-pointer"
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
