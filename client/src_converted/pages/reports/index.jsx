import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, FileText, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
const revenueData = [
    { month: "Jan", collected: 120000, expected: 140000 },
    { month: "Feb", collected: 135000, expected: 140000 },
    { month: "Mar", collected: 128000, expected: 140000 },
    { month: "Apr", collected: 142000, expected: 140000 },
    { month: "May", collected: 150000, expected: 140000 },
    { month: "Jun", collected: 165000, expected: 140000 },
];
const tenantData = [
    { name: "Paid", value: 85, fill: "hsl(var(--chart-2))" },
    { name: "Partial", value: 10, fill: "hsl(var(--chart-4))" },
    { name: "Overdue", value: 5, fill: "hsl(var(--chart-1))" },
];
const expenseData = [
    { category: "Maintenance", amount: 15000 },
    { category: "Utilities", amount: 8000 },
    { category: "Repairs", amount: 12000 },
    { category: "Insurance", amount: 6000 },
    { category: "Admin", amount: 5000 },
];
export default function ReportsPage() {
    const [timeRange, setTimeRange] = useState("6months");
    return (<div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">Reports</h2>
          <p className="text-muted-foreground mt-1">Detailed financial and operational analytics.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-44">
              <Calendar className="w-4 h-4 mr-2"/>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last 1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2"/> Export PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="h-10">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="tenants">Tenant Status</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Rent Collection Trend</CardTitle>
              <CardDescription>Collected vs Expected Revenue</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))"/>
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))"/>
                  <YAxis stroke="hsl(var(--muted-foreground))"/>
                  <Tooltip contentStyle={{ borderRadius: '8px', background: 'hsl(var(--card))' }}/>
                  <Legend />
                  <Bar dataKey="expected" fill="hsl(var(--muted))" name="Expected"/>
                  <Bar dataKey="collected" fill="hsl(var(--primary))" name="Collected"/>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-border/50">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">Total Collected</p>
                <p className="text-3xl font-bold">$840K</p>
                <p className="text-xs text-emerald-500 mt-2">+12% vs last period</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">Collection Rate</p>
                <p className="text-3xl font-bold">92%</p>
                <p className="text-xs text-muted-foreground mt-2">of expected revenue</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">Outstanding</p>
                <p className="text-3xl font-bold">$68K</p>
                <p className="text-xs text-rose-500 mt-2">Pending collection</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">Avg Payment</p>
                <p className="text-3xl font-bold">$25K</p>
                <p className="text-xs text-muted-foreground mt-2">per transaction</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tenants" className="space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Payment Status Distribution</CardTitle>
              <CardDescription>Current tenant payment status</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={tenantData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                    {tenantData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill}/>))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/50">
              <CardContent className="p-6">
                <Badge className="bg-emerald-500/15 text-emerald-700 mb-3">Paid</Badge>
                <p className="text-3xl font-bold">85</p>
                <p className="text-sm text-muted-foreground mt-1">tenants</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-6">
                <Badge className="bg-amber-500/15 text-amber-700 mb-3">Partial</Badge>
                <p className="text-3xl font-bold">10</p>
                <p className="text-sm text-muted-foreground mt-1">tenants</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-6">
                <Badge className="bg-rose-500/15 text-rose-700 mb-3">Overdue</Badge>
                <p className="text-3xl font-bold">5</p>
                <p className="text-sm text-muted-foreground mt-1">tenants</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Operating Expenses</CardTitle>
              <CardDescription>Monthly expense breakdown</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={expenseData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))"/>
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))"/>
                  <YAxis dataKey="category" type="category" width={100} stroke="hsl(var(--muted-foreground))"/>
                  <Tooltip contentStyle={{ borderRadius: '8px', background: 'hsl(var(--card))' }} formatter={(value) => `$${value}`}/>
                  <Bar dataKey="amount" fill="hsl(var(--chart-1))"/>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-3">Total Monthly Expenses</p>
              <p className="text-4xl font-bold mb-4">$46,000</p>
              <div className="space-y-2">
                {expenseData.map((item) => (<div key={item.category} className="flex justify-between text-sm">
                    <span>{item.category}</span>
                    <span className="font-medium">${item.amount.toLocaleString()}</span>
                  </div>))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
              <CardDescription>Key performance indicators</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Total Revenue (6 months)</p>
                  <p className="text-3xl font-bold">$840,000</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Total Expenses (6 months)</p>
                  <p className="text-3xl font-bold">$276,000</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Net Income</p>
                  <p className="text-3xl font-bold text-emerald-500">$564,000</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Profit Margin</p>
                  <p className="text-3xl font-bold">67%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" size="lg">
            <FileText className="w-4 h-4 mr-2"/> Generate Detailed Report
          </Button>
        </TabsContent>
      </Tabs>
    </div>);
}
