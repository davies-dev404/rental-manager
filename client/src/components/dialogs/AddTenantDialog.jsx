import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Bookmark, Trash2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

const DRAFT_STORAGE_KEY = "dwello_tenant_draft";

const tenantSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().regex(/^\+?[\d\s-]{10,15}$/, "Invalid phone number format"),
    idType: z.enum(["national_id", "passport", "driving_license"]),
    nationalId: z.string().min(5, "ID Number must be at least 5 characters"),
    unitId: z.string().min(1, "Please select a unit"),
    leaseStart: z.string().refine((date) => new Date(date).toString() !== 'Invalid Date', { message: "Invalid date" }),
});

export function AddTenantDialog() {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    
    // Always fetch fresh units when dialog is opened
    const { data: units, refetch: refetchUnits } = useQuery({ 
        queryKey: ["units"], 
        queryFn: () => api.getUnits(),
        enabled: open,
        refetchOnMount: 'always'
    });
    const vacantUnits = units?.filter(u => u.status === "vacant") || [];

    // Draft state
    const [savedDraft, setSavedDraft] = useState(null);

    // Dynamic utilities state (Water, Electricity, Garbage, Parking, etc.)
    const [utilities, setUtilities] = useState([
        { name: "Water Bill", amount: 500, billingType: "fixed", isIncluded: false },
        { name: "Garbage Collection", amount: 300, billingType: "fixed", isIncluded: false },
        { name: "Parking Fee", amount: 0, billingType: "fixed", isIncluded: false },
        { name: "Electricity (Post-pay)", amount: 0, billingType: "postpay_metered", isIncluded: false },
        { name: "Security", amount: 0, billingType: "fixed", isIncluded: false },
        { name: "Internet", amount: 0, billingType: "fixed", isIncluded: false }
    ]);

    const addCustomUtility = () => {
        setUtilities([...utilities, { name: "Custom Utility", amount: 0, billingType: "fixed", isIncluded: false }]);
    };

    const removeUtility = (index) => {
        setUtilities(utilities.filter((_, i) => i !== index));
    };

    const updateUtility = (index, field, value) => {
        const copy = [...utilities];
        copy[index][field] = value;
        setUtilities(copy);
    };

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

    // Check for draft when dialog opens or mounts
    useEffect(() => {
        try {
            const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (rawDraft) {
                const parsed = JSON.parse(rawDraft);
                setSavedDraft(parsed);
            } else {
                setSavedDraft(null);
            }
        } catch {
            setSavedDraft(null);
        }
    }, [open]);

    // Auto-save draft as user edits form values (if any field has content)
    useEffect(() => {
        const subscription = form.watch((values) => {
            if (values.name || values.email || values.phone || values.nationalId || values.unitId) {
                const draftData = {
                    ...values,
                    savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
                setSavedDraft(draftData);
            }
        });
        return () => subscription.unsubscribe();
    }, [form.watch]);

    const handleRestoreDraft = () => {
        if (savedDraft) {
            form.reset({
                name: savedDraft.name || "",
                email: savedDraft.email || "",
                phone: savedDraft.phone || "",
                idType: savedDraft.idType || "national_id",
                nationalId: savedDraft.nationalId || "",
                unitId: savedDraft.unitId || "",
                leaseStart: savedDraft.leaseStart || new Date().toISOString().split('T')[0]
            });
            toast({ title: "Draft Restored", description: "Your previously saved tenant details have been loaded." });
        }
    };

    const handleDiscardDraft = () => {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setSavedDraft(null);
        form.reset({
            name: "",
            email: "",
            phone: "",
            idType: "national_id",
            nationalId: "",
            unitId: "",
            leaseStart: new Date().toISOString().split('T')[0]
        });
        toast({ title: "Draft Discarded", description: "Draft has been removed." });
    };

    const handleSaveDraftManually = () => {
        const currentValues = form.getValues();
        const draftData = {
            ...currentValues,
            savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
        setSavedDraft(draftData);
        toast({ title: "Draft Saved", description: "You can resume adding this tenant at any time." });
        setOpen(false);
    };

    const mutation = useMutation({
        mutationFn: api.addTenant,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tenants"] });
            queryClient.invalidateQueries({ queryKey: ["units"] });
            queryClient.invalidateQueries({ queryKey: ["properties"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] });
            queryClient.invalidateQueries({ queryKey: ["reports_data"] });
            queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
            localStorage.removeItem(DRAFT_STORAGE_KEY);
            setSavedDraft(null);
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
            utilities,
            status: "active"
        });
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (val) refetchUnits();
        }}>
            <DialogTrigger asChild>
                <div className="relative inline-flex items-center">
                    <Button className="shadow-lg hover:shadow-xl transition-all">
                        <Plus className="w-4 h-4 mr-2"/> {t('add_tenant')}
                    </Button>
                    {savedDraft && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </span>
                    )}
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-130">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>{t('register_new_tenant')}</DialogTitle>
                        {savedDraft && (
                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-700">
                                Draft Saved ({savedDraft.savedAt})
                            </Badge>
                        )}
                    </div>
                    <DialogDescription>
                        {t('add_tenant_desc')}
                    </DialogDescription>
                </DialogHeader>

                {/* Draft Notification Banner */}
                {savedDraft && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-amber-200 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-800/50 text-xs">
                        <div className="flex items-center gap-2">
                            <Bookmark className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>
                                Resuming draft: <strong>{savedDraft.name || "Incomplete tenant"}</strong>
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2" onClick={handleRestoreDraft}>
                                Fill Draft
                            </Button>
                            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600" onClick={handleDiscardDraft}>
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                )}

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
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                                                <SelectItem key={unit._id || unit.id} value={unit._id || unit.id}>
                                                    {unit.propertyId?.name ? `${unit.propertyId.name} - ` : ''}Unit {unit.unitNumber} ({unit.type}) - KES {unit.rentAmount}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>

                        {/* Landlord Utility Bills Configuration */}
                        <div className="space-y-2.5 p-3 rounded-lg border border-border/60 bg-muted/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-semibold text-foreground">Utility Bills & Fees</h4>
                                    <p className="text-[11px] text-muted-foreground">Add monthly utility charges (Water, Garbage, Parking, Post-pay Electricity).</p>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addCustomUtility} className="h-7 text-xs">
                                    <Plus className="w-3 h-3 mr-1"/> Add Fee
                                </Button>
                            </div>

                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {utilities.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                        <Input
                                            className="h-8 text-xs flex-1"
                                            value={item.name}
                                            onChange={(e) => updateUtility(idx, "name", e.target.value)}
                                            placeholder="Utility Name"
                                        />
                                        <Input
                                            type="number"
                                            className="h-8 text-xs w-24 font-mono"
                                            value={item.amount}
                                            onChange={(e) => updateUtility(idx, "amount", Number(e.target.value))}
                                            placeholder="Amount"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                                            onClick={() => removeUtility(idx)}
                                        >
                                            <Trash2 className="w-3.5 h-3.5"/>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={handleSaveDraftManually} className="text-xs">
                                <Bookmark className="w-3.5 h-3.5 mr-1.5" /> Save Draft
                            </Button>
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
