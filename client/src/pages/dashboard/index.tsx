import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Building2, 
  Users, 
  Wallet, 
  TrendingUp, 
  ArrowUpRight,
  ArrowDownRight,
  Home,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const chartData = [
  { name: "Jan", revenue: 120000, target: 140000 },
  { name: "Feb", revenue: 135000, target: 140000 },
  { name: "Mar", revenue: 128000, target: 140000 },
  { name: "Apr", revenue: 142000, target: 140000 },
  { name: "May", revenue: 150000, target: 140000 },
  { name: "Jun", revenue: 165000, target: 140000 },
];

const occupancyData = [
  { name: "Occupied", value: 85, fill: "hsl(var(--chart-2))" },
  { name: "Vacant", value: 15, fill: "hsl(var(--muted))" },
];

function StatCard({ title, value, subtext, icon: Icon, trend, color = "primary" }: any) {
    const colorVariants = {
        primary: "bg-primary/10 text-primary",
        emerald: "bg-emerald-500/10 text-emerald-600",
        amber: "bg-amber-500/10 text-amber-600",
        rose: "bg-rose-500/10 text-rose-600",
    };

    return (
        <Card className="group border-border/50 shadow-sm hover:shadow-md transition-all hover:border-primary/20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6 relative">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <div className={`p-2.5 rounded-lg ${colorVariants[color as keyof typeof colorVariants]}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
                <div className="mt-4">
                    <div className="text-3xl font-bold tracking-tight">{value}</div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        {trend === 'up' && <ArrowUpRight className="w-3 h-3 text-emerald-500" />}
                        {trend === 'down' && <ArrowDownRight className="w-3 h-3 text-rose-500" />}
                        <span className={trend === 'up' ? "text-emerald-500" : trend === 'down' ? "text-rose-500" : ""}>{subtext}</span>
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

function RecentActivityItem({ icon: Icon, title, description, time, status }: any) {
    return (
        <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="p-2 rounded-lg bg-primary/10 text-primary mt-1">
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
            </div>
            <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">{time}</p>
                {status && <Badge variant="outline" className="mt-1 text-xs">{status}</Badge>}
            </div>
        </div>
    )
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: api.getStats,
  });

  if (isLoading) {
    return (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
                <Skeleton className="lg:col-span-2 h-96 rounded-xl" />
                <Skeleton className="h-96 rounded-xl" />
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">Dashboard</h2>
            <p className="text-muted-foreground mt-1">Welcome back. Here's your property portfolio overview.</p>
        </div>
        <Button className="shadow-md hover:shadow-lg transition-all">Generate Report</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Properties"
          value={stats?.totalProperties}
          subtext="All properties active"
          icon={Building2}
          trend="up"
          color="primary"
        />
        <StatCard
          title="Occupancy Rate"
          value={`${stats?.occupancyRate}%`}
          subtext={`${stats?.vacantUnits} units vacant`}
          icon={Home}
          trend={stats?.occupancyRate && stats.occupancyRate > 80 ? 'up' : 'down'}
          color="emerald"
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${(stats?.collectedThisMonth / 1000).toFixed(0)}K`}
          subtext="+8% from last month"
          icon={Wallet}
          trend="up"
          color="amber"
        />
        <StatCard
          title="Outstanding"
          value={`$${(stats?.outstandingAmount / 1000).toFixed(0)}K`}
          subtext="Pending collection"
          icon={AlertCircle}
          trend="down"
          color="rose"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue vs target collection</CardDescription>
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
                <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value / 1000}K`}
                />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: 'hsl(var(--card))' }}
                    formatter={(value) => `$${value.toLocaleString()}`}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Actual Revenue" />
                <Line type="monotone" dataKey="target" stroke="hsl(var(--muted))" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Target" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Occupancy Chart */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Occupancy Status</CardTitle>
            <CardDescription>Current unit distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={occupancyData} layout="vertical" barSize={40} margin={{ left: 80 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            tickLine={false} 
                            axisLine={false}
                            fontSize={13}
                            fontWeight={500}
                        />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', background: 'hsl(var(--card))' }} formatter={(value) => `${value}%`} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="hsl(var(--primary))">
                            {occupancyData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest transactions and events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <RecentActivityItem
              icon={Wallet}
              title="Payment Received"
              description="John Doe paid rent for Unit A101 - $25,000"
              time="2 hours ago"
              status="Completed"
            />
            <RecentActivityItem
              icon={Users}
              title="New Tenant Added"
              description="Alice Johnson registered for Unit B101"
              time="5 hours ago"
            />
            <RecentActivityItem
              icon={AlertCircle}
              title="Overdue Rent Alert"
              description="Bob Smith's rent is 5 days overdue"
              time="1 day ago"
              status="Pending"
            />
            <RecentActivityItem
              icon={Building2}
              title="Maintenance Requested"
              description="Unit C205 reported water leakage issue"
              time="2 days ago"
            />
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Key metrics at a glance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rent Collected</span>
                <span className="font-semibold text-gray-900 dark:text-white">${((stats?.collectedThisMonth ?? 0) / 1000).toFixed(1)}K</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{width: `${Math.min((stats?.collectedThisMonth || 0) / (stats?.expectedMonthlyRent || 1) * 100, 100)}%`}}></div>
              </div>
              <p className="text-xs text-muted-foreground">of ${((stats?.expectedMonthlyRent ?? 0) / 1000).toFixed(0)}K expected</p>
            </div>

            <div className="pt-4 space-y-3 border-t">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-sm">{stats?.occupiedUnits} Occupied Units</span>
              </div>
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-amber-500" />
                <span className="text-sm">{stats?.vacantUnits} Vacant Units</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span className="text-sm">${((stats?.outstandingAmount ?? 0) / 1000).toFixed(0)}K Outstanding</span>
              </div>
            </div>

            <Button className="w-full mt-4">View Detailed Report</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
