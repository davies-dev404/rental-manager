import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Search, Download, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { generateCSVReport } from "@/lib/reports";
import { usePreferences } from "@/lib/currency";

const getStatusColor = (status) => {
    switch (status) {
        case "success":
            return "bg-emerald-500/15 text-emerald-700 border-emerald-500/20";
        case "warning":
            return "bg-amber-500/15 text-amber-700 border-amber-500/20";
        case "error":
            return "bg-rose-500/15 text-rose-700 border-rose-500/20";
        default:
            return "bg-gray-500/15 text-gray-700";
    }
};
const getTypeColor = (type) => {
    const colors = {
        payment: "bg-blue-500/10 text-blue-600",
        tenant: "bg-purple-500/10 text-purple-600",
        settings: "bg-orange-500/10 text-orange-600",
        access: "bg-green-500/10 text-green-600",
        reminder: "bg-pink-500/10 text-pink-600",
        auth: "bg-indigo-500/10 text-indigo-600",
        document: "bg-cyan-500/10 text-cyan-600",
    };
    return colors[type] || "bg-gray-500/10 text-gray-600";
};
export default function ActivityLogsPage() {
    const { t } = useTranslation();
    const { formatDate } = usePreferences();
    const { data: activityLogs = [] } = useQuery({
        queryKey: ["activity-logs"],
        queryFn: api.getActivityLogs
    });
    const [filterType, setFilterType] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const filteredLogs = activityLogs.filter((log) => {
        const typeMatch = filterType === "all" || log.type === filterType;
        const statusMatch = filterStatus === "all" || log.status === filterStatus;
        return typeMatch && statusMatch;
    });
    return (<div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">{t('activity_logs') || t('logs')}</h2>
          <p className="text-muted-foreground mt-1">{t('logs_desc')}</p>
        </div>
        <Button variant="outline" onClick={() => generateCSVReport('activity-logs')}>
          <Download className="w-4 h-4 mr-2"/> {t('export_logs')}
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="space-y-4">
            <CardTitle>{t('activity_history')}</CardTitle>
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                <Input placeholder={t('search_placeholder')} className="pl-9 h-9"/>
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-44 h-9">
                  <Filter className="w-4 h-4 mr-2"/>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_types')}</SelectItem>
                  <SelectItem value="payment">{t('payments')}</SelectItem>
                  <SelectItem value="tenant">{t('tenants')}</SelectItem>
                  <SelectItem value="auth">{t('authentication')}</SelectItem>
                  <SelectItem value="settings">{t('settings')}</SelectItem>
                  <SelectItem value="document">{t('documents')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-44 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_status')}</SelectItem>
                  <SelectItem value="success">{t('success')}</SelectItem>
                  <SelectItem value="warning">{t('warning')}</SelectItem>
                  <SelectItem value="error">{t('error')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t('timestamp')}</TableHead>
                <TableHead>{t('user')}</TableHead>
                <TableHead>{t('action')}</TableHead>
                <TableHead>{t('description')}</TableHead>
                <TableHead>{t('type')}</TableHead>
                <TableHead>{t('status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length > 0 ? (filteredLogs.map((log) => (<TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="text-xs font-mono text-muted-foreground">{formatDate(log.timestamp, 'p, PPP')}</TableCell>
                    <TableCell className="text-sm font-medium">{log.user}</TableCell>
                    <TableCell className="text-sm font-medium">{log.action}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTypeColor(log.type)}>
                        {t(log.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(log.status)}>
                        {t(log.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>))) : (<TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {t('no_activity')}
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">{t('total_activities')}</p>
            <p className="text-3xl font-bold">{activityLogs.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">{t('today')}</p>
            <p className="text-3xl font-bold">
                {(() => {
                     const today = new Date().toISOString().split('T')[0];
                     return activityLogs.filter(l => l.timestamp.startsWith(today)).length;
                })()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">{t('this_week')}</p>
            <p className="text-3xl font-bold">
                 {(() => {
                     const weekAgo = new Date();
                     weekAgo.setDate(weekAgo.getDate() - 7);
                     return activityLogs.filter(l => new Date(l.timestamp) > weekAgo).length;
                })()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">{t('failed_logins')}</p>
            <p className="text-3xl font-bold text-rose-500">
                {activityLogs.filter(l => l.type === 'auth' && (l.status === 'error' || l.status === 'warning')).length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>);
}
