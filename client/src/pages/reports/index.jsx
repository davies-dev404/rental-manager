import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, FileText, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { exportToPDF, generateCSVReport } from "@/lib/reports";
import { usePreferences } from "@/lib/currency";

import { TaxCalculator } from "@/components/tools/TaxCalculator";

export default function ReportsPage() {
    const { t } = useTranslation();
    const { formatCurrency } = usePreferences();
    const [timeRange, setTimeRange] = useState("6months");
    const { data: reportData, isLoading } = useQuery({
        queryKey: ["reports_data"],
        queryFn: api.getReportsData
    });

    const revenueData = reportData?.revenueData || [];
    const tenantData = reportData?.tenantData || [{ name: "No Data", value: 1, fill: "#eee" }];
    const expenseData = reportData?.expenseData || [];

    return (<div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">{t('reports')}</h2>
          <p className="text-muted-foreground mt-1">{t('reports_desc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-44">
              <Calendar className="w-4 h-4 mr-2"/>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">{t('last_30_days')}</SelectItem>
              <SelectItem value="3months">{t('last_3_months')}</SelectItem>
              <SelectItem value="6months">{t('last_6_months')}</SelectItem>
              <SelectItem value="1year">{t('last_1_year')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => generateCSVReport('payments')}>
            <FileText className="w-4 h-4 mr-2"/> {t('export_csv')}
          </Button>
          <Button variant="outline" onClick={() => exportToPDF()}>
            <Download className="w-4 h-4 mr-2"/> {t('export_pdf')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="h-10">
          <TabsTrigger value="revenue">{t('revenue')}</TabsTrigger>
          <TabsTrigger value="tenants">{t('tenant_status')}</TabsTrigger>
          <TabsTrigger value="expenses">{t('expenses')}</TabsTrigger>
          <TabsTrigger value="kra">{t('kra_services') || "KRA Services"}</TabsTrigger>
          <TabsTrigger value="summary">{t('summary')}</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>{t('rent_collection_trend')}</CardTitle>
              <CardDescription>{t('collected_vs_expected')}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))"/>
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))"/>
                  <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => formatCurrency(value)}/>
                  <Tooltip contentStyle={{ borderRadius: '8px', background: 'hsl(var(--card))' }} formatter={(value) => formatCurrency(value)}/>
                  <Legend />
                  <Bar dataKey="expected" fill="hsl(var(--muted))" name={t('expected_revenue')}/>
                  <Bar dataKey="collected" fill="hsl(var(--primary))" name={t('collected_revenue')}/>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-border/50">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">{t('total_collected')}</p>
                <p className="text-3xl font-bold">
                    {formatCurrency(revenueData.reduce((acc, curr) => acc + (curr.collected || 0), 0))}
                </p>
                <p className="text-xs text-emerald-500 mt-2">-- {t('vs_last_period')}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">{t('collection_rate')}</p>
                <p className="text-3xl font-bold">
                    {(() => {
                        const totalExpected = revenueData.reduce((acc, curr) => acc + (curr.expected || 0), 0);
                        const totalCollected = revenueData.reduce((acc, curr) => acc + (curr.collected || 0), 0);
                        return totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
                    })()}%
                </p>
                <p className="text-xs text-muted-foreground mt-2">{t('of_expected')}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">{t('outstanding')}</p>
                 <p className="text-3xl font-bold">
                    {formatCurrency(revenueData.reduce((acc, curr) => acc + ((curr.expected || 0) - (curr.collected || 0)), 0))}
                </p>
                <p className="text-xs text-rose-500 mt-2">{t('pending_collection')}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">{t('avg_payment')}</p>
                <p className="text-3xl font-bold">
                    {(() => {
                        const totalCollected = revenueData.reduce((acc, curr) => acc + (curr.collected || 0), 0);
                         return formatCurrency(totalCollected / 6); // Average over 6 months
                    })()}
                </p>
                <p className="text-xs text-muted-foreground mt-2">{t('avg_per_month') || "avg per month"}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tenants" className="space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>{t('payment_status_dist')}</CardTitle>
              <CardDescription>{t('current_tenant_status')}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie 
                    data={tenantData} 
                    cx="50%" 
                    cy="50%" 
                    labelLine={false} 
                    label={({ name, value }) => name === "No Tenants" ? t('no_tenants') : `${name}: ${value}`} 
                    outerRadius={100} 
                    dataKey="value"
                  >
                    {tenantData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill}/>))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
             {tenantData.filter(d => d.value > 0 && d.name !== "No Tenants").map((status) => (
                <Card key={status.name} className="border-border/50">
                  <CardContent className="p-6">
                    <Badge className="mb-3" style={{ backgroundColor: status.fill + '20', color: status.fill }}>{status.name}</Badge>
                    <p className="text-3xl font-bold">{status.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t('tenants')}</p>
                  </CardContent>
                </Card>
             ))}
             {tenantData.some(d => d.name === "No Tenants") && (
                <Card className="border-border/50 col-span-3 flex items-center justify-center p-6 text-muted-foreground">
                    {t('no_tenant_data')}
                </Card>
             )}
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>{t('operating_expenses')}</CardTitle>
              <CardDescription>{t('expense_breakdown')}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={expenseData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))"/>
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => formatCurrency(value)}/>
                  <YAxis dataKey="month" type="category" width={100} stroke="hsl(var(--muted-foreground))"/>
                  <Tooltip contentStyle={{ borderRadius: '8px', background: 'hsl(var(--card))' }} formatter={(value) => formatCurrency(value)}/>
                  <Bar dataKey="amount" fill="hsl(var(--chart-1))"/>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-3">{t('total_expenses')}</p>
              <p className="text-4xl font-bold mb-4">
                  {formatCurrency(expenseData.reduce((acc, curr) => acc + (curr.amount || 0), 0))}
              </p>
              <div className="space-y-2">
                {expenseData.map((item) => (<div key={item.month} className="flex justify-between text-sm">
                    <span>{item.month}</span>
                    <span className="font-medium">{formatCurrency(item.amount)}</span>
                  </div>))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kra" className="space-y-4">
             <div className="grid gap-6 md:grid-cols-2">
                 <TaxCalculator />
                 <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle>{t('kra_info_title') || "About Monthly Rental Income (MRI)"}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-muted-foreground">
                        <p>{t('kra_info_1') || "MRI is a tax payable by resident persons (individual or company) on rental income earned in Kenya."}</p>
                        <p>{t('kra_info_2') || "The rate is 7.5% of the gross rent received. No expenses are deducted."}</p>
                        <p>{t('kra_info_3') || "Returns are filed monthly via iTax on or before the 20th of the following month."}</p>
                    </CardContent>
                 </Card>
             </div>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>{t('financial_summary')}</CardTitle>
              <CardDescription>{t('kpi')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                 <div>
                  <p className="text-sm text-muted-foreground mb-2">{t('total_revenue')}</p>
                  <p className="text-3xl font-bold">
                      {formatCurrency(revenueData.reduce((acc, curr) => acc + (curr.collected || 0), 0))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t('total_expenses')}</p>
                  <p className="text-3xl font-bold">
                      {formatCurrency(expenseData.reduce((acc, curr) => acc + (curr.amount || 0), 0))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t('net_income')}</p>
                  <p className="text-3xl font-bold text-emerald-500">
                      {(() => {
                           const rev = revenueData.reduce((acc, curr) => acc + (curr.collected || 0), 0);
                           const exp = expenseData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                           return formatCurrency(rev - exp);
                      })()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t('profit_margin')}</p>
                  <p className="text-3xl font-bold">
                       {(() => {
                           const rev = revenueData.reduce((acc, curr) => acc + (curr.collected || 0), 0);
                           const exp = expenseData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                           return rev > 0 ? Math.round(((rev - exp) / rev) * 100) + "%" : "0%";
                       })()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" size="lg" onClick={() => exportToPDF()}>
            <FileText className="w-4 h-4 mr-2"/> {t('view_detailed_report')}
          </Button>
        </TabsContent>
      </Tabs>
    </div>);
}
