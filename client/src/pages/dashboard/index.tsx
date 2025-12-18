import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Building2, 
  Users, 
  Wallet, 
  TrendingUp, 
  ArrowUpRight,
  ArrowDownRight
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
  Cell
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const chartData = [
  { name: "Jan", total: 120000 },
  { name: "Feb", total: 135000 },
  { name: "Mar", total: 128000 },
  { name: "Apr", total: 142000 },
  { name: "May", total: 150000 },
  { name: "Jun", total: 165000 },
];

const occupancyData = [
  { name: "Occupied", value: 85, color: "hsl(var(--chart-2))" },
  { name: "Vacant", value: 15, color: "hsl(var(--muted))" },
];

function StatCard({ title, value, subtext, icon: Icon, trend }: any) {
    return (
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <div className="p-2 bg-primary/10 rounded-full text-primary">
                        <Icon className="h-4 w-4" />
                    </div>
                </div>
                <div className="mt-3">
                    <div className="text-3xl font-bold tracking-tight">{value}</div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        {trend === 'up' && <ArrowUpRight className="w-3 h-3 text-emerald-500" />}
                        {trend === 'down' && <ArrowDownRight className="w-3 h-3 text-rose-500" />}
                        <span className={trend === 'up' ? "text-emerald-500" : trend === 'down' ? "text-rose-500" : ""}>{subtext}</span>
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: api.getStats,
  });

  if (isLoading) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            </div>
            <Skeleton className="h-96 w-full rounded-xl" />
        </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Overview of your property portfolio performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Properties"
          value={stats?.totalProperties}
          subtext="Across 3 regions"
          icon={Building2}
          trend="up"
        />
        <StatCard
          title="Occupancy Rate"
          value={`${stats?.occupancyRate}%`}
          subtext={`${stats?.vacantUnits} units vacant`}
          icon={Users}
          trend={stats?.occupancyRate && stats.occupancyRate > 90 ? 'up' : 'down'}
        />
        <StatCard
          title="Collected This Month"
          value={`$${stats?.collectedThisMonth.toLocaleString()}`}
          subtext="+12% from last month"
          icon={Wallet}
          trend="up"
        />
        <StatCard
          title="Outstanding Rent"
          value={`$${stats?.outstandingAmount.toLocaleString()}`}
          subtext="Due for collection"
          icon={TrendingUp}
          trend="down"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue collection for the current year</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <XAxis 
                    dataKey="name" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Unit Status</CardTitle>
             <CardDescription>Occupancy distribution</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="h-[350px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={occupancyData} layout="vertical" barSize={30}>
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={100} 
                            tickLine={false} 
                            axisLine={false}
                            fontSize={14}
                            fontWeight={500}
                        />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {occupancyData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
