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

import { RecordPaymentDialog } from "@/components/dialogs/RecordPaymentDialog";
import Receipt from "@/components/Receipt";

export default function PaymentsPage() {
    const { t } = useTranslation();
    const { data: payments, isLoading } = useQuery({
        queryKey: ["payments"],
        queryFn: api.getPayments,
    });
    const { data: settings } = useQuery({
        queryKey: ["settings"],
        queryFn: api.getSettings
    });

    const { formatCurrency, currency } = usePreferences();
    const [sortBy, setSortBy] = useState("date");
    // const [receiptPayment, setReceiptPayment] = useState(null); // No longer needed for CSS print

    const handlePrintReceipt = async (payment) => {
        try {
            toast({ title: t('generating_pdf'), description: t('please_wait') });
            // Fetch PDF blob directly
            const response = await fetch(`${api.API_URL}/payments/${payment._id}/pdf`, {
                headers: api.getAuthHeaders()
            });

            if (!response.ok) throw new Error("Failed to generate PDF");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            // Open in new tab for printing
            const printWindow = window.open(url, '_blank');
            if (printWindow) {
                printWindow.focus();
                // printWindow.print(); // Optional: Auto-trigger print
            } else {
                 toast({ variant: "destructive", title: t('error'), description: "Pop-up blocked. Please allow pop-ups." });
            }
        } catch (error) {
             toast({ variant: "destructive", title: t('error'), description: error.message });
        }
    };
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
    const [sendingEmailId, setSendingEmailId] = useState(null);
    const handleEmailReceipt = async (payment) => {
        try {
            setSendingEmailId(payment._id || payment.id);
            toast({ title: t('sending_email'), description: t('please_wait') });
            await api.emailReceipt(payment._id || payment.id);
            toast({ title: t('success'), description: t('receipt_sent_desc') });
        } catch (error) {
            toast({ variant: "destructive", title: t('error'), description: error.message });
        } finally {
            setSendingEmailId(null);
        }
    };

    return (<div className="space-y-8 print:hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">{t('payments')}</h2>
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
                        </TableRow>) : sortedPayments.map((payment) => (<TableRow key={payment._id || payment.id} className="hover:bg-muted/50 transition-colors">
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
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handlePrintReceipt(payment)}>
                                        <Printer className="w-4 h-4"/>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEmailReceipt(payment)} disabled={sendingEmailId === (payment._id || payment.id)}>
                                        {sendingEmailId === (payment._id || payment.id) ? <Loader2 className="w-4 h-4 animate-spin"/> : <Mail className="w-4 h-4"/>}
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
