import { useState } from "react";
import { Protect, PERMISSIONS } from "@/lib/access-control";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Phone, Mail, FileText, MoreHorizontal, Loader2, Save, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Copy, Printer } from "lucide-react";

import { AddTenantDialog } from "@/components/dialogs/AddTenantDialog";

// Define schema for Edit Tenant as well
const tenantSchema = z.object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email(),
    phone: z.string().min(10, "Phone is required"),
    idType: z.enum(["national_id", "passport", "driving_license"]),
    nationalId: z.string().min(5, "ID is required"),
    unitId: z.string(), // Can be optional or string in edit
    leaseStart: z.string(),
});

// --- View Lease Dialog ---
function ViewLeaseDialog({ tenant, open, onOpenChange }) {
    const { t } = useTranslation();
    if (!tenant) return null;
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t('lease_details')}</DialogTitle>
                    <DialogDescription>{t('signed')} {tenant.leaseStart}</DialogDescription>
                </DialogHeader>
                <div className="flex-1 bg-muted/20 border border-border/50 rounded-lg p-8 overflow-y-auto font-mono text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    <div className="text-center mb-6">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg uppercase tracking-widest border-b pb-4">{t('lease_agreement')}</h3>
                    </div>
                    {`${t('landlord')}: Dwello Inc.\n${t('tenant_label')}: ${tenant.name}\n\n${t('lease_prop_title')}\n${t('lease_prop_text', { unit: typeof tenant.unitId === 'object' ? (tenant.unitId.unitNumber || 'N/A') : tenant.unitId })}\n\n${t('lease_term_title')}\n${t('lease_term_text', { date: tenant.leaseStart })}\n\n${t('lease_rent_title')}\n${t('lease_rent_text')}\n\n${t('digital_sig_verified')}`}
                </div>
                <DialogFooter className="gap-2">
                     <Button variant="outline" size="sm"><Printer className="w-4 h-4 mr-2"/> {t('print')}</Button>
                     <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2"/> {t('download_pdf')}</Button>
                     <Button size="sm" onClick={() => onOpenChange(false)}>{t('close')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Edit Tenant Dialog ---
function EditTenantDialog({ tenant, open, onOpenChange }) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const form = useForm({
        resolver: zodResolver(tenantSchema),
        defaultValues: {
            name: tenant?.name || "",
            email: tenant?.email || "",
            phone: tenant?.phone || "",
            idType: tenant?.idType || "national_id",
            nationalId: tenant?.nationalId || "",
            unitId: typeof tenant?.unitId === 'object' ? tenant.unitId.id : (tenant?.unitId || ""),
            leaseStart: tenant?.leaseStart || ""
        }
    });

    const mutation = useMutation({
        mutationFn: api.updateTenant,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tenants"] });
            queryClient.invalidateQueries({ queryKey: ["units"] });
            onOpenChange(false);
            toast({ title: t('tenant_updated'), description: t('tenant_updated_desc') });
        },
        onError: () => {
            toast({ variant: "destructive", title: t('error'), description: t('tenant_update_failed') });
        }
    });

    function onSubmit(values) {
        mutation.mutate({ ...values, id: tenant.id });
    }

    return (<Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('edit_tenant')}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem>
                            <FormLabel>{t('full_name')}</FormLabel>
                            <FormControl>
                                <Input placeholder="John Doe" {...field}/>
                            </FormControl>
                            <FormMessage />
                            </FormItem>)}/>
                        
                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="idType" render={({ field }) => (<FormItem>
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
                            </FormItem>)}/>
                            <FormField control={form.control} name="nationalId" render={({ field }) => (<FormItem>
                                <FormLabel>{t('id_number')}</FormLabel>
                                <FormControl>
                                    <Input placeholder="12345678" {...field}/>
                                </FormControl>
                                <FormMessage />
                                </FormItem>)}/>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="email" render={({ field }) => (<FormItem>
                                <FormLabel>{t('email')}</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="john@example.com" {...field}/>
                                </FormControl>
                                <FormMessage />
                                </FormItem>)}/>
                            <FormField control={form.control} name="phone" render={({ field }) => (<FormItem>
                                <FormLabel>{t('phone')}</FormLabel>
                                <FormControl>
                                    <Input placeholder="+254..." {...field}/>
                                </FormControl>
                                <FormMessage />
                                </FormItem>)}/>
                        </div>
                        <Button type="submit" disabled={mutation.isPending} className="w-full">
                            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            {t('save_changes')}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>);
}


export default function TenantsPage() {
    const { t } = useTranslation();
    const { data: tenants, isLoading } = useQuery({
        queryKey: ["tenants"],
        queryFn: api.getTenants
    });
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Dialog States
    const [viewLeaseOpen, setViewLeaseOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [editTenantOpen, setEditTenantOpen] = useState(false);

    const deleteMutation = useMutation({
        mutationFn: api.deleteTenant,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tenants"] });
            queryClient.invalidateQueries({ queryKey: ["units"] });
            toast({ title: t('tenant_deleted'), description: t('tenant_deleted_desc') });
        }
    });

    const terminateMutation = useMutation({
        mutationFn: api.terminateLease,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tenants"] });
            queryClient.invalidateQueries({ queryKey: ["units"] });
            toast({ title: t('lease_terminated'), description: t('lease_terminated_desc') });
        }
    });

    const handleViewLease = (tenant) => {
        setSelectedTenant(tenant);
        setViewLeaseOpen(true);
    };

    const handleEditTenant = (tenant) => {
        setSelectedTenant(tenant);
        setEditTenantOpen(true);
    };

    return (<div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">{t('tenants')}</h2>
          <p className="text-muted-foreground mt-1">{t('tenants_desc')}</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" className="shadow-sm">
                <Download className="w-4 h-4 mr-2"/> {t('export')}
            </Button>
            <AddTenantDialog />
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle>{t('tenant_directory')}</CardTitle>
                <div className="flex items-center gap-2">
                    <div className="relative w-full md:w-64">
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                         <Input placeholder={t('search_tenants')} className="pl-9 h-9"/>
                    </div>
                    <Button variant="outline" size="sm" className="h-9">
                        <Filter className="w-4 h-4 mr-2"/> {t('filter')}
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead>{t('tenant_info')}</TableHead>
                        <TableHead>{t('contact')}</TableHead>
                        <TableHead>{t('unit')}</TableHead>
                        <TableHead>{t('lease_status')}</TableHead>
                        <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (<TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">{t('loading')}</TableCell>
                        </TableRow>) : tenants?.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">{t('no_tenants')}</TableCell>
                        </TableRow>
                        ) : tenants.map((tenant) => (<TableRow key={tenant.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9 border border-border">
                                        <AvatarFallback className="bg-primary/10 text-primary font-medium">{tenant.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-medium text-sm">{tenant.name}</div>
                                        <div className="text-xs text-muted-foreground">ID: {tenant.nationalId} <span className="uppercase text-[10px] bg-muted px-1 rounded ml-1">{t(tenant.idType) || t('national_id')}</span></div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-3 h-3"/> {tenant.email}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-3 h-3"/> {tenant.phone}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="bg-background font-mono">
                                    {typeof tenant.unitId === 'object' ? (tenant.unitId.unitNumber || tenant.unitId.number || 'N/A') : tenant.unitId}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className={`
                                    ${tenant.status === 'active' ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20' : ''}
                                    ${tenant.status === 'past' ? 'bg-gray-500/15 text-gray-700 border-gray-500/20' : ''}
                                    ${tenant.status === 'pending' ? 'bg-amber-500/15 text-amber-700 border-amber-500/20' : ''}
                                `}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current mr-2"/>
                                    <span className="capitalize">{t(tenant.status)}</span>
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreHorizontal className="w-4 h-4"/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => handleEditTenant(tenant)}>{t('edit_details')}</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleViewLease(tenant)}>
                                            <FileText className="w-4 h-4 mr-2"/> {t('view_lease')}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        
                                        <Protect permission={PERMISSIONS.MANAGE_TENANTS}>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600 focus:text-rose-600 focus:bg-rose-50">
                                                    {t('terminate_lease')}
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            {t('terminate_lease_confirm', { name: tenant.name })}
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => terminateMutation.mutate(tenant.id)} className="bg-rose-600 hover:bg-rose-700">
                                                            {t('terminate')}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </Protect>

                                        <Protect permission={PERMISSIONS.DELETE_DATA}>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600 focus:text-rose-600 focus:bg-rose-50">
                                                    {t('delete_record')}
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            {t('delete_tenant_confirm')}
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => deleteMutation.mutate(tenant.id)} className="bg-rose-600 hover:bg-rose-700">
                                                            {t('delete')}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </Protect>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

      <ViewLeaseDialog tenant={selectedTenant} open={viewLeaseOpen} onOpenChange={setViewLeaseOpen} />
      <EditTenantDialog tenant={selectedTenant} open={editTenantOpen} onOpenChange={setEditTenantOpen} />
    </div>);
}
