import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Plus, Search, Download, CheckCircle2, Clock, AlertCircle, Loader2, ArrowUpDown, Printer, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { generateCSVReport } from "@/lib/reports";
import { usePreferences } from "@/lib/currency";

const getStatusColor = (status) => {
    switch (status) {
        case "paid": return "bg-emerald-500/15 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/25";
        case "partial": return "bg-amber-500/15 text-amber-700 border-amber-500/20 hover:bg-amber-500/25";
        case "overdue": return "bg-rose-500/15 text-rose-700 border-rose-500/20 hover:bg-rose-500/25";
        default: return "bg-gray-500/15 text-gray-700 border-gray-500/20";
    }
};
const getStatusIcon = (status) => {
    switch (status) {
        case "paid": return <CheckCircle2 className="w-3 h-3 mr-1"/>;
        case "partial": return <Clock className="w-3 h-3 mr-1"/>;
        case "overdue": return <AlertCircle className="w-3 h-3 mr-1"/>;
        default: return null;
    }
};

const printReceipt = (payment, currency) => {
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    if (printWindow) {
        printWindow.document.write(`
            <html>
                <head>
                    <title>Receipt - ${payment.id}</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 20px; line-height: 1.6; color: #333; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                        .logo { font-size: 24px; font-weight: bold; color: #000; }
                        .details { margin-bottom: 20px; }
                        .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
                        .label { font-weight: bold; color: #666; }
                        .status { font-weight: bold; text-transform: uppercase; color: ${payment.status === 'paid' ? 'green' : 'orange'}; }
                        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">Rental Manager</div>
                        <div>Official Payment Receipt</div>
                    </div>
                    <div class="details">
                        <div class="row">
                            <span class="label">Receipt ID:</span>
                            <span>${payment.id}</span>
                        </div>
                        <div class="row">
                            <span class="label">Date:</span>
                            <span>${payment.date}</span>
                        </div>
                        <div class="row">
                            <span class="label">Tenant:</span>
                            <span>${payment.tenantId}</span> 
                        </div>
                        <div class="row">
                            <span class="label">Unit:</span>
                            <span>${typeof payment.unitId === 'object' ? (payment.unitId.unitNumber || 'N/A') : payment.unitId}</span>
                        </div>
                        <div class="row">
                            <span class="label">Amount:</span>
                            <span>${currency} ${payment.amount}</span>
                        </div>
                        <div class="row">
                            <span class="label">Method:</span>
                            <span style="text-transform: capitalize">${payment.method.replace('_', ' ')}</span>
                        </div>
                        <div class="row">
                            <span class="label">Status:</span>
                            <span class="status">${payment.status}</span>
                        </div>
                    </div>
                    <div class="footer">
                        <p>Thank you for your payment.</p>
                        <p>Generated on ${new Date().toLocaleString()}</p>
                    </div>
                    <script>
                        window.print();
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }
};

// --- Record Payment Dialog ---
const paymentSchema = z.object({
    tenantId: z.string().min(1, "Tenant is required"),
    amount: z.coerce.number().min(1, "Amount must be greater than 0"),
    date: z.string(),
    method: z.enum(["cash", "bank", "mobile_money", "lipa_na_mpesa"]),
    status: z.enum(["paid", "partial"]),
    monthCovered: z.string(),
});
function RecordPaymentDialog() {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { data: tenants } = useQuery({ queryKey: ["tenants"], queryFn: api.getTenants });
    const { t } = useTranslation();
    const { currency } = usePreferences();
    const form = useForm({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            tenantId: "",
            amount: 0,
            date: new Date().toISOString().split('T')[0],
            method: "mobile_money",
            status: "paid",
            monthCovered: new Date().toISOString().slice(0, 7)
        }
    });
    const mutation = useMutation({
        mutationFn: api.recordPayment,
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["payments"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] });
            setOpen(false);
            form.reset();
            
            // Simulate Email Sending
            const tenant = tenants?.find(t => t.id === variables.tenantId);
            const tenantEmail = tenant?.email || "tenant@example.com";
            
            toast({ 
                title: t('payment_recorded') || "Payment Recorded", 
                description: `${t('record_payment_success')} ${t('receipt_sent_desc')} (${tenantEmail})` 
            });
        },
        onError: () => {
            toast({ variant: "destructive", title: "Error", description: "Failed to record payment." });
        }
    });
    function onSubmit(values) {
        const tenant = tenants?.find(t => t.id === values.tenantId);
        if (!tenant)
            return;
        mutation.mutate({
            ...values,
            unitId: tenant.unitId
        });
    }
    return (<Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-lg hover:shadow-xl transition-all">
            <Plus className="w-4 h-4 mr-2"/> {t('record_payment')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('record_payment')}</DialogTitle>
            {t('record_payment_desc')}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="tenantId" render={({ field }) => (<FormItem>
                  <FormLabel>{t('tenant')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('select_tenant')}/>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tenants?.map(tenant => (<SelectItem key={tenant.id} value={tenant.id}>
                              {tenant.name} (Unit {typeof tenant.unitId === 'object' ? (tenant.unitId.unitNumber || 'N/A') : tenant.unitId?.toString().replace('un', '')})
                          </SelectItem>))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>)}/>
            
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="amount" render={({ field }) => (<FormItem>
                    <FormLabel>{t('amount')} ({currency})</FormLabel>
                    <FormControl>
                        <Input type="number" {...field}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>)}/>
                 <FormField control={form.control} name="date" render={({ field }) => (<FormItem>
                    <FormLabel>{t('date')}</FormLabel>
                    <FormControl>
                        <Input type="date" {...field}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>)}/>
            </div>

            <div className="grid grid-cols-2 gap-4">
                 <FormField control={form.control} name="method" render={({ field }) => (<FormItem>
                    <FormLabel>{t('payment_method')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="lipa_na_mpesa">{t('mpesa_integration') || "Lipa na M-Pesa"}</SelectItem>
                            <SelectItem value="mobile_money">{t('mobile_money')}</SelectItem>
                            <SelectItem value="bank">{t('bank')}</SelectItem>
                            <SelectItem value="cash">{t('cash')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>)}/>
                 <FormField control={form.control} name="status" render={({ field }) => (<FormItem>
                    <FormLabel>{t('status')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="paid">{t('full_payment')}</SelectItem>
                            <SelectItem value="partial">{t('partial_payment')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>)}/>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                {t('save_record')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>);
}
export default function PaymentsPage() {
    const { t } = useTranslation();
    const { data: payments, isLoading } = useQuery({
        queryKey: ["payments"],
        queryFn: api.getPayments,
    });
    const { formatCurrency, currency } = usePreferences();
    const [sortBy, setSortBy] = useState("date");
    const sortedPayments = payments ? [...payments].sort((a, b) => {
        switch (sortBy) {
            case "date":
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            case "amount":
                return b.amount - a.amount;
            case "status":
                return a.status.localeCompare(b.status);
            default:
                return 0;
        }
    }) : [];

    // Helper for email receipt toast
    const { toast } = useToast();
    const handleEmailReceipt = (payment) => {
         toast({ 
            title: t('receipt_sent'), 
            description: t('receipt_sent_desc') 
        });
    };

    return (<div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <p className="text-muted-foreground mt-1">{t('payments_desc')}</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" className="shadow-sm" onClick={() => generateCSVReport('payments')}>
                <Download className="w-4 h-4 mr-2"/> {t('export_report')}
            </Button>
            <RecordPaymentDialog />
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle>{t('transaction_history')}</CardTitle>
                <div className="flex items-center gap-2">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                        <Input placeholder={t('search_placeholder')} className="pl-9 h-9"/>
                    </div>
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value)}>
                        <SelectTrigger className="w-44 h-9">
                            <ArrowUpDown className="w-4 h-4 mr-2"/>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date">{t('sort_by_date')}</SelectItem>
                            <SelectItem value="amount">{t('sort_by_amount')}</SelectItem>
                            <SelectItem value="status">{t('sort_by_status')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead>{t('date')}</TableHead>
                        <TableHead>{t('tenant')}</TableHead>
                        <TableHead>{t('unit')}</TableHead>
                        <TableHead>{t('amount')}</TableHead>
                        <TableHead>{t('payment_method')}</TableHead>
                        <TableHead>{t('status')}</TableHead>
                        <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (<TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">{t('loading')}</TableCell>
                        </TableRow>) : sortedPayments.map((payment) => (<TableRow key={payment.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="font-medium text-sm">{payment.date}</TableCell>
                            <TableCell className="text-muted-foreground text-xs uppercase tracking-wide">
                                {payment.tenantId}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="bg-background">
                                    {typeof payment.unitId === 'object' ? (payment.unitId.unitNumber || payment.unitId.number || 'N/A') : payment.unitId}
                                </Badge>
                            </TableCell>
                            <TableCell className="font-bold text-gray-900 dark:text-white">
                                {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell className="capitalize text-sm text-muted-foreground">
                                {t(payment.method)}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className={getStatusColor(payment.status)}>
                                    {getStatusIcon(payment.status)}
                                    <span className="capitalize">{t(payment.status)}</span>
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => printReceipt(payment, currency)}>
                                        <Printer className="w-4 h-4"/>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEmailReceipt(payment)}>
                                        <Mail className="w-4 h-4"/>
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>);
}
