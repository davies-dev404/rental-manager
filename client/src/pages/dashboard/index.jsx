import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Users, Wallet, ArrowUpRight, ArrowDownRight, Home, AlertCircle, CheckCircle2, TrendingDown, Receipt } from "lucide-react";
import { ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, BarChart, Bar, Cell, LineChart, Line, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { usePreferences } from "@/lib/currency";


function StatCard({ title, value, subtext, icon: Icon, trend, color = "primary" }) {
    const colorVariants = {
        primary: "bg-primary/10 text-primary",
        emerald: "bg-emerald-500/10 text-emerald-600",
        amber: "bg-amber-500/10 text-amber-600",
        rose: "bg-rose-500/10 text-rose-600",
    };
    return (<Card className="group border-border/50 shadow-sm hover:shadow-md transition-all hover:border-primary/20 overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
            <CardContent className="p-6 relative">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <div className={`p-2.5 rounded-lg ${colorVariants[color]}`}>
                        <Icon className="h-5 w-5"/>
                    </div>
                </div>
                <div className="mt-4">
                    <div className="text-3xl font-bold tracking-tight">{value || 0}</div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        {trend === 'up' && <ArrowUpRight className="w-3 h-3 text-emerald-500"/>}
                        {trend === 'down' && <ArrowDownRight className="w-3 h-3 text-rose-500"/>}
                        <span className={trend === 'up' ? "text-emerald-500" : trend === 'down' ? "text-rose-500" : ""}>{subtext}</span>
                    </p>
                </div>
            </CardContent>
        </Card>);
}
function RecentActivityItem({ icon: Icon, title, description, time, status }) {
    return (<div className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="p-2 rounded-lg bg-primary/10 text-primary mt-1">
                <Icon className="w-4 h-4"/>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
            </div>
            <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">{time}</p>
                {status && <Badge variant="outline" className="mt-1 text-xs">{status}</Badge>}
            </div>
        </div>);
}
export default function Dashboard() {
    const { toast } = useToast();
    const { data: stats, isLoading } = useQuery({
        queryKey: ["stats"],
        queryFn: api.getStats,
    });
    
    const { t } = useTranslation();
    const { formatCurrency, formatDate } = usePreferences();
    
    // Fetch activity logs for real-time dashboard stream
    const { data: activityLogs = [] } = useQuery({
        queryKey: ["activity-logs"],
        queryFn: api.getActivityLogs
    });

    const handleGenerateReport = () => {
        window.print();
    };

    if (isLoading) {
        return (<div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl"/>)}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
                <Skeleton className="lg:col-span-2 h-96 rounded-xl"/>
                <Skeleton className="h-96 rounded-xl"/>
            </div>
        </div>);
    }

    // Dynamic Synced Chart Data from real backend history
    const chartData = stats?.sixMonthTrend && stats.sixMonthTrend.length > 0 
        ? stats.sixMonthTrend 
        : [
            { name: "Current", revenue: stats?.collectedThisMonth || 0, target: stats?.expectedMonthlyRent || 0 }
        ];

    const occupancyData = [
        { name: "Occupied", value: stats?.occupiedUnits || 0, fill: "hsl(var(--chart-2))" },
        { name: "Vacant", value: stats?.vacantUnits || 0, fill: "hsl(var(--muted))" },
    ];
    
    // Prevent empty chart rendering issues if total is 0
    const totalUnits = (stats?.occupiedUnits || 0) + (stats?.vacantUnits || 0);
    const safeOccupancyData = totalUnits > 0 ? occupancyData : [
         { name: "No Data", value: 1, fill: "hsl(var(--muted))" }
    ];

    return (<div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">{t('dashboard')}</h2>
            <p className="text-muted-foreground mt-1">Real-time overview of your rental properties, billing collections, and occupancy status.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" className="shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => window.location.href = '/reminders'}>
                <AlertCircle className="w-4 h-4 mr-2 text-rose-500"/>
                Reminders
            </Button>
            <Button variant="outline" className="shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => window.location.href = '/expenses'}>
                <DollarSign className="w-4 h-4 mr-2 text-amber-500"/>
                Expenses
            </Button>
            <Button variant="outline" className="shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={handleGenerateReport}>
                <Download className="w-4 h-4 mr-2"/>
                {t('export_report')}
            </Button>
            <Button className="shadow-md hover:shadow-lg transition-all cursor-pointer" onClick={() => window.location.href = '/payments'}>
                <Wallet className="w-4 h-4 mr-2"/>
                Payments
            </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t('total_properties')} value={stats?.totalProperties || 0} subtext={`${stats?.totalUnits || 0} total units`} icon={Building2} trend="neutral" color="primary"/>
        <StatCard title={t('occupancy_rate')} value={`${stats?.occupancyRate || 0}%`} subtext={`${stats?.occupiedUnits || 0} occupied / ${stats?.vacantUnits || 0} vacant`} icon={Home} trend="neutral" color="emerald"/>
        <StatCard title="Collected This Month" value={formatCurrency(stats?.collectedThisMonth || 0)} subtext={`Of ${formatCurrency(stats?.expectedMonthlyRent || 0)} expected`} icon={Wallet} trend="up" color="amber"/>
        <StatCard title="Money Not Paid" value={formatCurrency(stats?.outstandingAmount || 0)} subtext={stats?.recordedUnpaidAmount > 0 ? `Incl. ${formatCurrency(stats.recordedUnpaidAmount)} recorded unpaid` : "Pending / Overdue balances"} icon={AlertCircle} trend="down" color="rose"/>
      </div>

      {/* Secondary Financial KPI Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 shadow-sm bg-muted/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Expected Total Billing</p>
              <p className="text-xl font-bold">{formatCurrency(stats?.expectedMonthlyRent || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Gross Rent + Utilities</p>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10"><Receipt className="w-5 h-5 text-primary"/></div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Operating Expenses (Month)</p>
              <p className="text-xl font-bold text-amber-600">{formatCurrency(stats?.expensesThisMonth || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Maintenance, repairs, taxes</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10" onClick={() => window.location.href = '/expenses'}>Manage</Button>
          </CardContent>
        </Card>

        <Card className={`border shadow-sm ${(stats?.netIncomeThisMonth || 0) >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${(stats?.netIncomeThisMonth || 0) >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>Net Realized Income</p>
              <p className={`text-xl font-bold ${(stats?.netIncomeThisMonth || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(stats?.netIncomeThisMonth || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Collected minus Expenses</p>
            </div>
            <Badge className={`text-xs ${(stats?.netIncomeThisMonth || 0) >= 0 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'}`}>
              {(stats?.netIncomeThisMonth || 0) >= 0 ? 'Profitable' : 'Deficit'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>{t('revenue_overview')}</CardTitle>
            <CardDescription>Real monthly collections synced with your expected targets.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value)}/>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))"/>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: 'hsl(var(--card))' }} formatter={(value) => `${formatCurrency(value)}`}/>
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={true} name={t('actual_revenue')}/>
                <Line type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" dot={false} name={t('target')}/>
                <Line type="monotone" dataKey="expenses" stroke="#f59e0b" strokeWidth={2} dot={true} name="Expenses"/>
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Occupancy Chart */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>{t('occupancy_status')}</CardTitle>
            <CardDescription>{t('occupancy_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-87.5 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={safeOccupancyData} layout="vertical" barSize={40} margin={{ left: 80 }}>
                        <XAxis type="number" hide/>
                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} fontSize={13} fontWeight={500}/>
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', background: 'hsl(var(--card))' }} formatter={(value) => `${value}`}/>
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="hsl(var(--primary))">
                            {safeOccupancyData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill || "hsl(var(--primary))"}/>))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Real-time Activity Logs Stream */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Live Activity Stream</CardTitle>
              <CardDescription>Real-time audit log of system events, payments, and reminders</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => window.location.href = '/activity-logs'} className="text-xs">
              View All Logs
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {activityLogs && activityLogs.length > 0 ? (
                activityLogs.slice(0, 5).map(log => (
                    <RecentActivityItem 
                        key={log._id || log.id} 
                        icon={
                          log.type === 'payment' ? Wallet :
                          log.type === 'reminder' ? AlertCircle :
                          log.type === 'tenant' ? Users :
                          CheckCircle2
                        } 
                        title={log.action} 
                        description={log.description} 
                        time={log.timestamp ? formatDate(log.timestamp, 'p, PPP') : 'Recently'}
                        status={log.status}
                    />
                ))
            ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">No recent activity logged.</div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats & Collection Progress */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>{t('quick_stats')}</CardTitle>
            <CardDescription>{t('stats_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('rent_collected')}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(stats?.collectedThisMonth || 0)}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(((stats?.collectedThisMonth || 0) / (stats?.expectedMonthlyRent || 1)) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground flex justify-between">
                <span>{Math.round(((stats?.collectedThisMonth || 0) / (stats?.expectedMonthlyRent || 1)) * 100)}% of expected</span>
                <span>Target: {formatCurrency(stats?.expectedMonthlyRent || 0)}</span>
              </p>
            </div>

            <div className="pt-4 space-y-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500"/> Occupied Units:
                </span>
                <span className="font-semibold">{stats?.occupiedUnits || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-amber-500"/> Vacant Units:
                </span>
                <span className="font-semibold">{stats?.vacantUnits || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500"/> Money Not Paid:
                </span>
                <span className="font-semibold text-rose-600">{formatCurrency(stats?.outstandingAmount || 0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-amber-500"/> Expenses (MTD):
                </span>
                <span className="font-semibold text-amber-600">{formatCurrency(stats?.expensesThisMonth || 0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary"/> Net Income:
                </span>
                <span className={`font-semibold ${(stats?.netIncomeThisMonth || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(stats?.netIncomeThisMonth || 0)}
                </span>
              </div>
            </div>

            <Button className="w-full mt-4" onClick={() => window.location.href = '/reports'}>
              {t('view_detailed_report')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>);
}
