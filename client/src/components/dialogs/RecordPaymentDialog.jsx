import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { usePreferences } from "@/lib/currency";

const paymentSchema = z.object({
    tenantId: z.string().min(1, "Tenant is required"),
    rentAmount: z.coerce.number().min(0).default(0),
    depositAmount: z.coerce.number().min(0).default(0),
    date: z.string(),
    method: z.enum(["cash", "bank", "mobile_money", "lipa_na_mpesa"]),
    status: z.enum(["paid", "partial"]),
    monthCovered: z.string(),
    nextPaymentDate: z.string().optional(),
}).refine(data => data.rentAmount > 0 || data.depositAmount > 0, {
    message: "At least one amount must be greater than 0",
    path: ["rentAmount"]
});

export function RecordPaymentDialog() {
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
            rentAmount: 0,
            depositAmount: 0,
            date: new Date().toISOString().split('T')[0],
            method: "mobile_money",
            status: "paid",
            monthCovered: new Date().toISOString().slice(0, 7),
            nextPaymentDate: ""
        }
    });

    const mutation = useMutation({
        mutationFn: api.recordPayment,
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["payments"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] });
            queryClient.invalidateQueries({ queryKey: ["reports_data"] });
            setOpen(false);
            form.reset();
            
            // Simulate Email Sending
            const tenant = tenants?.find(t => (t._id || t.id) === variables.tenantId);
            const tenantEmail = tenant?.email || "tenant@example.com";
            
            toast({ 
                title: t('payment_recorded') || "Payment Recorded", 
                description: `${t('record_payment_success')} ${t('receipt_sent_desc')} (${tenantEmail})` 
            });
        },
        onError: () => {
            toast({ variant: "destructive", title: t('error'), description: t('payment_failed') });
        }
    });

    function onSubmit(values) {
        const tenant = tenants?.find(t => (t._id || t.id) === values.tenantId);
        if (!tenant) return;
        mutation.mutate({
            ...values,
            unitId: typeof tenant.unitId === 'object' ? (tenant.unitId._id || tenant.unitId.id) : tenant.unitId
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground border border-primary-border h-9 px-4 py-2 shadow-lg hover:shadow-xl transition-all cursor-pointer">
                <Plus className="w-4 h-4 mr-2"/> {t('record_payment')}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('record_payment')}</DialogTitle>
                    <DialogDescription>
                        {t('record_payment_desc')}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="tenantId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('tenant')}</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('select_tenant')}/>
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {tenants?.map(tenant => (
                                            <SelectItem key={tenant._id || tenant.id} value={tenant._id || tenant.id}>
                                                {tenant.name} (Unit {typeof tenant.unitId === 'object' ? (tenant.unitId.unitNumber || 'N/A') : tenant.unitId?.toString().replace('un', '')})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="rentAmount" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('rent_amount') || "Rent Amount"} ({currency})</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="depositAmount" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('deposit_amount') || "Deposit Amount"} ({currency})</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="date" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('date')}</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="date" 
                                            {...field} 
                                            value={field.value ? field.value.split('T')[0] : ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="nextPaymentDate" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('next_rent_due') || "Next Payment Due"}</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="date" 
                                            {...field} 
                                            value={field.value && !isNaN(new Date(field.value).getTime()) ? new Date(field.value).toISOString().split('T')[0] : ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="method" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('payment_method')}</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
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
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('status')}</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
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
                                </FormItem>
                            )}/>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                             <FormField control={form.control} name="monthCovered" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('month_covered') || "Month/Period"}</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="month" 
                                            {...field} 
                                            value={field.value && field.value.length >= 7 ? field.value.slice(0, 7) : field.value}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
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
        </Dialog>
    );
}
