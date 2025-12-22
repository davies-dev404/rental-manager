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

const tenantSchema = z.object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email(),
    phone: z.string().min(10, "Phone is required"),
    idType: z.enum(["national_id", "passport", "driving_license"]),
    nationalId: z.string().min(5, "ID is required"),
    unitId: z.string().min(1, "Unit is required"),
    leaseStart: z.string(),
});

export function AddTenantDialog() {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { data: units } = useQuery({ queryKey: ["units"], queryFn: () => api.getUnits() });
    const vacantUnits = units?.filter(u => u.status === "vacant") || [];
    
    const form = useForm({
        resolver: zodResolver(tenantSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            idType: "national_id",
            nationalId: "",
            unitId: "",
            leaseStart: new Date().toISOString().split('T')[0]
        }
    });

    const mutation = useMutation({
        mutationFn: api.addTenant,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tenants"] });
            queryClient.invalidateQueries({ queryKey: ["units"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] });
            queryClient.invalidateQueries({ queryKey: ["reports_data"] });
            setOpen(false);
            form.reset();
            toast({ title: t('tenant_added'), description: t('tenant_added_desc') });
        },
        onError: () => {
            toast({ variant: "destructive", title: t('error'), description: t('tenant_add_failed') });
        }
    });

    function onSubmit(values) {
        mutation.mutate({
            ...values,
            status: "active" // Default status for new tenants
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="shadow-lg hover:shadow-xl transition-all">
                    <Plus className="w-4 h-4 mr-2"/> {t('add_tenant')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t('register_new_tenant')}</DialogTitle>
                    <DialogDescription>
                        {t('add_tenant_desc')}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('full_name')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John Doe" {...field}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            
                            <FormField control={form.control} name="idType" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('id_type')}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('select_id_type')}/>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="national_id">{t('national_id')}</SelectItem>
                                            <SelectItem value="passport">{t('passport')}</SelectItem>
                                            <SelectItem value="driving_license">{t('driving_license')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="nationalId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('id_number')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder="12345678" {...field}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('email')}</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="john@example.com" {...field}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="phone" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('phone')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder="+254..." {...field}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="leaseStart" render={({ field }) => (
                                <FormItem>
                                   <FormLabel>{t('lease_start_date')}</FormLabel>
                                   <FormControl>
                                     <Input type="date" {...field}/>
                                   </FormControl>
                                   <FormMessage />
                                 </FormItem>
                            )}/>
                        </div>

                        <FormField control={form.control} name="unitId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('assign_unit')}</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('select_unit_placeholder') || "Select a vacant unit"}/>
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {vacantUnits.length === 0 ? (
                                            <SelectItem value="none" disabled>{t('no_vacant_units')}</SelectItem>
                                        ) : (
                                            vacantUnits.map(unit => (
                                                <SelectItem key={unit.id} value={unit.id}>
                                                    Unit {unit.unitNumber} ({unit.type}) - KES {unit.rentAmount}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>

                        <DialogFooter>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                {t('register_tenant')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
