import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Search, Download, Filter } from "lucide-react";
const activityLogs = [
    {
        id: "log1",
        timestamp: "2024-06-01 14:32:15",
        user: "Admin User",
        action: "Payment Recorded",
        description: "John Doe - Unit A101 - $25,000",
        status: "success",
        type: "payment"
    },
    {
        id: "log2",
        timestamp: "2024-06-01 13:15:42",
        user: "John Caretaker",
        action: "Tenant Added",
        description: "Alice Johnson - Unit B101",
        status: "success",
        type: "tenant"
    },
    {
        id: "log3",
        timestamp: "2024-06-01 11:20:08",
        user: "Admin User",
        action: "Settings Updated",
        description: "Email notifications enabled",
        status: "success",
        type: "settings"
    },
    {
        id: "log4",
        timestamp: "2024-05-31 16:45:33",
        user: "John Caretaker",
        action: "Property Accessed",
        description: "Sunset Apartments - view only",
        status: "success",
        type: "access"
    },
    {
        id: "log5",
        timestamp: "2024-05-31 14:20:50",
        user: "Admin User",
        action: "Reminder Created",
        description: "Rent due reminder for Unit A102",
        status: "success",
        type: "reminder"
    },
    {
        id: "log6",
        timestamp: "2024-05-31 10:15:22",
        user: "Admin User",
        action: "Login",
        description: "Successful login from 192.168.1.1",
        status: "success",
        type: "auth"
    },
    {
        id: "log7",
        timestamp: "2024-05-30 18:30:45",
        user: "John Caretaker",
        action: "Failed Login",
        description: "Invalid credentials attempt",
        status: "warning",
        type: "auth"
    },
    {
        id: "log8",
        timestamp: "2024-05-30 15:12:08",
        user: "Admin User",
        action: "Document Uploaded",
        description: "Standard Lease Agreement",
        status: "success",
        type: "document"
    },
];
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
          <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">Activity Logs</h2>
          <p className="text-muted-foreground mt-1">System audit trail and user activity history.</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2"/> Export Logs
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="space-y-4">
            <CardTitle>Activity History</CardTitle>
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                <Input placeholder="Search activities..." className="pl-9 h-9"/>
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-44 h-9">
                  <Filter className="w-4 h-4 mr-2"/>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="payment">Payments</SelectItem>
                  <SelectItem value="tenant">Tenants</SelectItem>
                  <SelectItem value="auth">Authentication</SelectItem>
                  <SelectItem value="settings">Settings</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-44 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length > 0 ? (filteredLogs.map((log) => (<TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="text-xs font-mono text-muted-foreground">{log.timestamp}</TableCell>
                    <TableCell className="text-sm font-medium">{log.user}</TableCell>
                    <TableCell className="text-sm font-medium">{log.action}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTypeColor(log.type)}>
                        {log.type.charAt(0).toUpperCase() + log.type.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(log.status)}>
                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>))) : (<TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No activities found
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Total Activities</p>
            <p className="text-3xl font-bold">{activityLogs.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Today</p>
            <p className="text-3xl font-bold">6</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">This Week</p>
            <p className="text-3xl font-bold">23</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Failed Logins</p>
            <p className="text-3xl font-bold text-rose-500">1</p>
          </CardContent>
        </Card>
      </div>
    </div>);
}
