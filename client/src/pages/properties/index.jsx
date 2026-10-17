import { useState } from "react";
import { Protect, PERMISSIONS } from "@/lib/access-control";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Plus, MapPin, Building2, MoreHorizontal, Loader2,
  Pencil, Trash2, UserPlus, Save, Search, ChevronDown, ChevronUp,
  UploadCloud, Link as LinkIcon, Camera, Image as ImageIcon, ArrowLeft
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { usePreferences } from "@/lib/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ActionModals } from "@/components/dashboard/Modals";
// --- Manage Units Dialog ---
const unitSchema = z.object({
    unitNumber: z.string().min(1, "Unit Number is required"),
    type: z.string().min(1, "Type is required"),
    rentAmount: z.string().min(1, "Rent Amount is required"),
    bedrooms: z.string().min(1, "Bedrooms is required"),
    bathrooms: z.string().min(1, "Bathrooms is required"),
    status: z.string().optional()
});



function ManageUnitsDialog({ property }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const { formatCurrency } = usePreferences();
    
    // Fetch units for this property
    const { data: units } = useQuery({
        queryKey: ["units", property._id || property.id],
        queryFn: () => api.getUnits(property._id || property.id),
        enabled: open
    });

    const form = useForm({
        resolver: zodResolver(unitSchema),
        defaultValues: {
            unitNumber: "",
            type: "Apartment",
            rentAmount: "",
            bedrooms: "1",
            bathrooms: "1"
        }
    });

    const mutation = useMutation({
        mutationFn: api.addUnit,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["units"] });
            queryClient.invalidateQueries({ queryKey: ["properties"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] }); // Update dashboard
            form.reset();
            toast({ title: "Unit Added", description: "New unit created successfully." });
        },
        onError: () => {
            toast({ variant: "destructive", title: "Error", description: "Failed to add unit." });
        }
    });

    function onSubmit(values) {
        mutation.mutate({
            ...values,
            propertyId: property._id || property.id,
            status: "vacant"
        });
    }

    const [editingUnit, setEditingUnit] = useState(null);
    const [deletingUnitId, setDeletingUnitId] = useState(null);

    const deleteMutation = useMutation({
        mutationFn: api.deleteUnit,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["units"] });
            queryClient.invalidateQueries({ queryKey: ["properties"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] });
            setDeletingUnitId(null);
            toast({ title: "Unit Deleted", description: "Unit removed successfully." });
        }
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full mr-2">{t('manage_units')}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-175 h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t('manage_units')} - {property.name}</DialogTitle>
                    <DialogDescription>{t('manage_properties_desc') || "Add and view units for this property."}</DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto space-y-6 py-4 px-1">
                    {/* Add Unit Form */}
                    <div className="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-4">
                        <h4 className="font-semibold text-sm">{t('add_new_unit')}</h4>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-6 gap-3 items-end">
                                <div className="col-span-1">
                                    <FormField control={form.control} name="unitNumber" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">{t('unit_no')}</FormLabel>
                                            <FormControl><Input placeholder="A1" className="h-8" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="col-span-2">
                                    <FormField control={form.control} name="type" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">{t('type')}</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger className="h-8"><SelectValue placeholder={t('type')} /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Apartment">{t('apartment') || "Apartment"}</SelectItem>
                                                    <SelectItem value="Studio">{t('studio') || "Studio"}</SelectItem>
                                                    <SelectItem value="Shop">{t('shop') || "Shop"}</SelectItem>
                                                    <SelectItem value="Office">{t('office') || "Office"}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="col-span-2">
                                     <FormField control={form.control} name="rentAmount" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">{t('rent')}</FormLabel>
                                            <FormControl><Input type="number" placeholder="25000" className="h-8" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="col-span-1">
                                    <Button type="submit" size="sm" className="w-full h-8" disabled={mutation.isPending}>
                                        {mutation.isPending ? <Loader2 className="w-3 h-3 animate-spin"/> : <Plus className="w-3 h-3"/>} {t('add')}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </div>

                    {/* Units List */}
                    <div>
                         <h4 className="font-semibold text-sm mb-3">{t('existing_units')} ({units?.length || 0})</h4>
                         <div className="border border-border/50 rounded-md overflow-hidden">
                             <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr className="border-b border-border/50 text-left">
                                        <th className="p-3 font-medium text-muted-foreground w-20">{t('unit')}</th>
                                        <th className="p-3 font-medium text-muted-foreground">{t('type')}</th>
                                        <th className="p-3 font-medium text-muted-foreground">{t('rent')}</th>
                                        <th className="p-3 font-medium text-muted-foreground">{t('status')}</th>
                                        <th className="p-3 font-medium text-muted-foreground text-right">{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!units?.length && (
                                        <tr><td colSpan={5} className="p-4 text-center text-muted-foreground italic">{t('no_units')}</td></tr>
                                    )}
                                    {units?.map((unit) => (
                                        <tr key={unit._id || unit.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                                            <td className="p-3 font-medium">{unit.unitNumber}</td>
                                            <td className="p-3">{unit.type}</td>
                                            <td className="p-3">{formatCurrency(unit.rentAmount)}</td>
                                            <td className="p-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${unit.status === 'occupied' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {unit.status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="w-3 h-3"/></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => setEditingUnit(unit)}>
                                                            <Pencil className="w-3 h-3 mr-2 text-muted-foreground"/> {t('edit_details')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => setDeletingUnitId(unit._id || unit.id)}>
                                                            <Trash2 className="w-3 h-3 mr-2"/> {t('delete_unit')}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                         </div>
                    </div>
                </div>
                
                 {/* Delete Alert */}
                <AlertDialog open={!!deletingUnitId} onOpenChange={() => setDeletingUnitId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t('delete_unit_confirm')}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {t('delete_unit_desc')}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate(deletingUnitId)}>{t('delete')}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Edit Unit Dialog */}
                {editingUnit && <EditUnitDialog unit={editingUnit} open={!!editingUnit} onOpenChange={(val) => !val && setEditingUnit(null)} />}
            </DialogContent>
        </Dialog>
    );
}

function EditUnitDialog({ unit, open, onOpenChange }) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const { currency } = usePreferences();
    const form = useForm({
        resolver: zodResolver(unitSchema),
        defaultValues: {
            unitNumber: unit.unitNumber,
            type: unit.type,
            rentAmount: String(unit.rentAmount || ""),
            bedrooms: String(unit.bedrooms || "1"),
            bathrooms: String(unit.bathrooms || "1"),
            status: unit.status || "vacant"
        }
    });

    const mutation = useMutation({
        mutationFn: api.updateUnit,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["units"] });
            queryClient.invalidateQueries({ queryKey: ["properties"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] });
            onOpenChange(false);
            toast({ title: "Unit Updated", description: "Unit details updated." });
        },
        onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to update unit." })
    });

    function onSubmit(values) {
        mutation.mutate({ ...values, id: unit._id || unit.id, propertyId: unit.propertyId });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-106.25">
                <DialogHeader>
                    <DialogTitle>{t('edit_details')}</DialogTitle>
                    <DialogDescription>
                        {t('edit_unit_desc') || "Make changes to the unit here. Click save when you're done."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="unitNumber" render={({ field }) => (
                            <FormItem><FormLabel>Unit Number</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="type" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Apartment">Apartment</SelectItem>
                                        <SelectItem value="Studio">Studio</SelectItem>
                                        <SelectItem value="Shop">Shop</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="status" render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('status') || "Status"}</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="vacant">{t('vacant') || "Vacant"}</SelectItem>
                                        <SelectItem value="occupied">{t('occupied') || "Occupied"}</SelectItem>
                                        <SelectItem value="maintenance">{t('maintenance') || "Maintenance"}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="rentAmount" render={({ field }) => (
                            <FormItem><FormLabel>{t('rent')} ({currency})</FormLabel><FormControl><Input type="number" {...field}/></FormControl><FormMessage /></FormItem>
                        )}/>
                        <DialogFooter>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// --- Edit Property Dialog ---
function EditPropertyDialog({ property, open, onOpenChange }) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const form = useForm({
        resolver: zodResolver(propertySchema),
        defaultValues: {
            name: property.name,
            location: property.location,
            image: property.image
        }
    });

    const mutation = useMutation({
        mutationFn: api.updateProperty,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["properties"] });
            onOpenChange(false);
            toast({ title: "Property Updated", description: "Property details saved successfully." });
        },
        onError: () => {
            toast({ variant: "destructive", title: "Error", description: "Failed to update property." });
        }
    });

    function onSubmit(values) {
        mutation.mutate({ ...values, id: property._id || property.id });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-106.25">
                <DialogHeader>
                    <DialogTitle>{t('edit_property')}</DialogTitle>
                    <DialogDescription>{t('update_property_desc') || "Update property details."}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('property_name')}</FormLabel>
                                <FormControl><Input {...field}/></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="location" render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('address')}</FormLabel>
                                <FormControl><Input {...field}/></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="image" render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('image')} URL ({t('optional') || "Optional"})</FormLabel>
                                <FormControl><Input {...field}/></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <DialogFooter>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                {t('save_changes')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// --- Property Card ---
function PropertyCard({ property, onAssign }) {
    const { t } = useTranslation();
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const queryClient = useQueryClient();
    const { toast } = useToast();
    
    const { data: units } = useQuery({
        queryKey: ["units", property._id || property.id],
        queryFn: () => api.getUnits(property._id || property.id)
    });
    
    const deleteMutation = useMutation({
        mutationFn: api.deleteProperty,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["properties"] });
            queryClient.invalidateQueries({ queryKey: ["units"] });
            queryClient.invalidateQueries({ queryKey: ["tenants"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] }); // Important for dashboard update
            toast({ title: "Property Deleted", description: "Property and all associated data removed." });
        }
    });

    const vacantCount = units?.filter(u => u.status === "vacant").length || 0;

    return (
        <>
            <EditPropertyDialog property={property} open={editOpen} onOpenChange={setEditOpen} />
            
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('delete_confirm')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('delete_property_desc') || `This will permanently delete "${property.name}" and all associated units.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteMutation.mutate(property._id || property.id)}>
                            {t('delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Card className="group overflow-hidden border-border/50 shadow-sm hover:shadow-lg transition-all hover:border-primary/20">
                <div className="h-40 bg-muted relative overflow-hidden">
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent z-10"/>
                    <img src={property.image || `https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`} alt={property.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                    <div className="absolute bottom-3 left-4 z-20 text-white">
                        <h3 className="font-bold text-lg">{property.name}</h3>
                        <div className="flex items-center text-xs opacity-90">
                            <MapPin className="w-3 h-3 mr-1"/>
                            {property.location}
                        </div>
                    </div>
                </div>
                <CardContent className="p-4 pt-5">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider font-medium">{t('total_units')}</span>
                            <div className="flex items-center font-medium">
                                <Building className="w-4 h-4 mr-2 text-primary"/>
                                {units?.length || 0}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider font-medium">{t('vacant')}</span>
                            <div className="flex items-center font-medium">
                                <Home className="w-4 h-4 mr-2 text-emerald-500"/>
                                {vacantCount}
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="p-4 border-t bg-muted/20 flex justify-between items-center">
                    <ManageUnitsDialog property={property} />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4"/></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setEditOpen(true)}>
                                <Pencil className="w-4 h-4 mr-2 text-muted-foreground"/> {t('edit_property')}
                            </DropdownMenuItem>
                            <Protect permission={PERMISSIONS.MANAGE_PROPERTIES}>
                                <DropdownMenuItem onClick={() => onAssign(property)}>
                                    <UserPlus className="w-4 h-4 mr-2 text-muted-foreground"/> {t('assign_caretaker')}
                                </DropdownMenuItem>
                            </Protect>
                            <DropdownMenuSeparator />
                            <Protect permission={PERMISSIONS.DELETE_DATA}>
                                <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20" onClick={() => setDeleteOpen(true)}>
                                    <Trash2 className="w-4 h-4 mr-2"/> {t('delete')}
                                </DropdownMenuItem>
                            </Protect>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardFooter>
            </Card>
        </>
    );
}
// ─── Property Form View (Bomahut Layout matching Screenshots 3 & 4) ───────────
function PropertyFormView({ onBack }) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [hideOptional, setHideOptional] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form states
    const [name, setName] = useState("");
    const [unitsCount, setUnitsCount] = useState("0");
    const [city, setCity] = useState("");
    const [waterRate, setWaterRate] = useState("0");
    const [electricityRate, setElectricityRate] = useState("0");
    const [mpesaType, setMpesaType] = useState("paybill"); // "paybill" | "till"
    const [mpesaNumber, setMpesaNumber] = useState("");
    const [penaltyType, setPenaltyType] = useState("");
    const [taxRate, setTaxRate] = useState("7.5");
    const [recurringBills, setRecurringBills] = useState([]);
    const [newBillType, setNewBillType] = useState("");
    const [newBillAmount, setNewBillAmount] = useState("");
    const [managementFeeType, setManagementFeeType] = useState("");
    const [streetName, setStreetName] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [notes, setNotes] = useState("");
    const [paymentInstructions, setPaymentInstructions] = useState("");
    const [ownerPhone, setOwnerPhone] = useState("");
    const [paymentCode, setPaymentCode] = useState("");

    const handleClear = () => {
        setName("");
        setUnitsCount("0");
        setCity("");
        setWaterRate("0");
        setElectricityRate("0");
        setMpesaType("paybill");
        setMpesaNumber("");
        setPenaltyType("");
        setTaxRate("7.5");
        setRecurringBills([]);
        setNewBillType("");
        setNewBillAmount("");
        setManagementFeeType("");
        setStreetName("");
        setCompanyName("");
        setNotes("");
        setPaymentInstructions("");
        setOwnerPhone("");
        setPaymentCode("");
    };

    const handleAddRecurringBill = () => {
        if (!newBillType || !newBillAmount) return;
        setRecurringBills([...recurringBills, { type: newBillType, amount: newBillAmount }]);
        setNewBillType("");
        setNewBillAmount("");
    };

    const handleRemoveRecurringBill = (idx) => {
        setRecurringBills(recurringBills.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            toast({ variant: "destructive", title: "Property Name Required", description: "Please enter a property name." });
            return;
        }

        setLoading(true);
        try {
            const location = city ? (streetName ? `${streetName}, ${city}` : city) : (streetName || "Nairobi");
            const propertyData = {
                name: name.trim(),
                location,
                city: city.trim(),
                streetName: streetName.trim(),
                waterRate: Number(waterRate) || 0,
                electricityRate: Number(electricityRate) || 0,
                mpesaType,
                mpesaNumber: mpesaNumber.trim(),
                penaltyType,
                taxRate: Number(taxRate) || 0,
                recurringBills,
                managementFeeType,
                companyName: companyName.trim(),
                notes: notes.trim(),
                paymentInstructions: paymentInstructions.trim(),
                ownerPhone: ownerPhone ? `+254${ownerPhone.replace(/^0+/, "")}` : "",
                paymentCode: paymentCode.trim()
            };

            const res = await api.addProperty(propertyData);
            const propId = res?._id || res?.id;

            const count = parseInt(unitsCount) || 0;
            if (count > 0 && propId) {
                try {
                    for (let i = 1; i <= Math.min(count, 50); i++) {
                        await api.addUnit({
                            propertyId: propId,
                            unitNumber: `U${i}`,
                            type: "Apartment",
                            rentAmount: "25000",
                            bedrooms: "1",
                            bathrooms: "1",
                            status: "vacant"
                        });
                    }
                } catch {
                    // handled
                }
            }

            queryClient.invalidateQueries({ queryKey: ["properties"] });
            queryClient.invalidateQueries({ queryKey: ["units"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] });

            toast({ title: "Property Created", description: `Property "${name}" added successfully.` });
            onBack();
        } catch {
            toast({ variant: "destructive", title: "Error", description: "Failed to add property." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            {/* Top Back Button */}
            <div>
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0b1065] dark:text-blue-400 border border-[#0b1065] dark:border-blue-400 rounded-md hover:bg-[#0b1065]/5 transition cursor-pointer"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
            </div>

            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Property Form</h2>
            </div>

            {/* Form Card (matching Screenshots 3 & 4) */}
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-10 shadow-xs space-y-5">
                {/* Property Name */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                    <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
                        Property Name
                    </label>
                    <div className="flex-1 max-w-lg">
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Property Name ..."
                            className="h-9 text-xs"
                        />
                    </div>
                </div>

                {/* Number of units */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                    <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
                        Number of units
                    </label>
                    <div className="flex-1 max-w-lg">
                        <Input
                            type="number"
                            min="0"
                            value={unitsCount}
                            onChange={e => setUnitsCount(e.target.value)}
                            className="h-9 text-xs"
                        />
                    </div>
                </div>

                {/* City */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                    <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
                        City
                    </label>
                    <div className="flex-1 max-w-lg">
                        <Input
                            value={city}
                            onChange={e => setCity(e.target.value)}
                            placeholder="City or nearest town ..."
                            className="h-9 text-xs"
                        />
                    </div>
                </div>

                {/* Hide / Show Toggle */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                    <div className="sm:w-52 shrink-0" />
                    <div className="flex-1 max-w-lg">
                        <button
                            type="button"
                            onClick={() => setHideOptional(!hideOptional)}
                            className="text-xs font-semibold text-[#0b1065] dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            {hideOptional ? "Show Optional Fields" : "Hide"}
                            {hideOptional ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>

                {!hideOptional && (
                    <>
                        {/* Water rate (optional) */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                            <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 pt-2 shrink-0">
                                Water rate (optional)
                            </label>
                            <div className="flex-1 max-w-lg">
                                <Input
                                    type="number"
                                    value={waterRate}
                                    onChange={e => setWaterRate(e.target.value)}
                                    className="h-9 text-xs"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">(KES per unit consumed)</p>
                            </div>
                        </div>

                        {/* Electricity rate (optional) */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                            <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 pt-2 shrink-0">
                                Electricity rate (optional)
                            </label>
                            <div className="flex-1 max-w-lg">
                                <Input
                                    type="number"
                                    value={electricityRate}
                                    onChange={e => setElectricityRate(e.target.value)}
                                    className="h-9 text-xs"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">(KES per unit consumed)</p>
                            </div>
                        </div>

                        {/* MPESA (optional) */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                            <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 pt-1 shrink-0">
                                MPESA (optional)
                            </label>
                            <div className="flex-1 max-w-lg space-y-2.5">
                                <div className="flex items-center gap-6 text-xs text-slate-700 dark:text-slate-300">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="mpesaType"
                                            checked={mpesaType === "paybill"}
                                            onChange={() => setMpesaType("paybill")}
                                            className="accent-[#0b1065]"
                                        />
                                        <span>Paybill</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="mpesaType"
                                            checked={mpesaType === "till"}
                                            onChange={() => setMpesaType("till")}
                                            className="accent-[#0b1065]"
                                        />
                                        <span>Till Number</span>
                                    </label>
                                </div>

                                <div>
                                    <label className="text-[11px] text-slate-500 font-medium block mb-1">
                                        {mpesaType === "paybill" ? "Paybill Number" : "Till Number"}
                                    </label>
                                    <Input
                                        value={mpesaNumber}
                                        onChange={e => setMpesaNumber(e.target.value)}
                                        placeholder={mpesaType === "paybill" ? "e.g. 247247" : "e.g. 123456"}
                                        className="h-9 text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Rent Payment Penalty (optional) */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                            <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
                                Rent Payment Penalty (optional)
                            </label>
                            <div className="flex-1 max-w-lg">
                                <select
                                    value={penaltyType}
                                    onChange={e => setPenaltyType(e.target.value)}
                                    className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                                >
                                    <option value="">Select Penalty Type</option>
                                    <option value="fixed">Fixed Late Fee (e.g. KES 1,000)</option>
                                    <option value="percent">Percentage of Rent (e.g. 5%)</option>
                                    <option value="daily">Daily Late Charge (e.g. KES 100/day)</option>
                                    <option value="none">None</option>
                                </select>
                            </div>
                        </div>

                        {/* Tax Rate % (optional) */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                            <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 pt-2 shrink-0">
                                Tax Rate % (optional)
                            </label>
                            <div className="flex-1 max-w-lg">
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={taxRate}
                                    onChange={e => setTaxRate(e.target.value)}
                                    className="h-9 text-xs"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">(Percentage tax rate)</p>
                            </div>
                        </div>

                        {/* Other Recurring Bills (optional) */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                            <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 pt-2 shrink-0">
                                Other Recurring Bills (optional)
                            </label>
                            <div className="flex-1 max-w-lg space-y-2">
                                <div className="flex items-center gap-2">
                                    <select
                                        value={newBillType}
                                        onChange={e => setNewBillType(e.target.value)}
                                        className="flex-1 h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                                    >
                                        <option value="">Select bill type</option>
                                        <option value="Garbage Collection">Garbage Collection</option>
                                        <option value="Security / Guard">Security / Guard</option>
                                        <option value="Service Charge">Service Charge</option>
                                        <option value="Internet / WiFi">Internet / WiFi</option>
                                        <option value="Water Fixed Charge">Water Fixed Charge</option>
                                    </select>
                                    <Input
                                        type="number"
                                        placeholder="amount"
                                        value={newBillAmount}
                                        onChange={e => setNewBillAmount(e.target.value)}
                                        className="w-28 h-9 text-xs"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleAddRecurringBill}
                                        className="h-9 px-3 text-xs"
                                    >
                                        +
                                    </Button>
                                </div>

                                {recurringBills.length > 0 && (
                                    <div className="space-y-1 pt-1">
                                        {recurringBills.map((b, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded text-xs border border-slate-200 dark:border-slate-700">
                                                <span>{b.type}: <strong>KES {b.amount}</strong></span>
                                                <button type="button" onClick={() => handleRemoveRecurringBill(idx)} className="text-red-500 hover:text-red-700 font-bold ml-2">×</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Management Fee (optional) */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                            <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
                                Management Fee (optional)
                            </label>
                            <div className="flex-1 max-w-lg">
                                <select
                                    value={managementFeeType}
                                    onChange={e => setManagementFeeType(e.target.value)}
                                    className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                                >
                                    <option value="">Select Management Fee Type</option>
                                    <option value="10_percent">10% of Collected Rent</option>
                                    <option value="8_percent">8% of Collected Rent</option>
                                    <option value="5_percent">5% of Collected Rent</option>
                                    <option value="fixed">Fixed Monthly Management Fee</option>
                                    <option value="none">None (Self Managed)</option>
                                </select>
                            </div>
                        </div>

                        {/* Street Name (optional) */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                            <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
                                Street Name (optional)
                            </label>
                            <div className="flex-1 max-w-lg">
                                <Input
                                    value={streetName}
                                    onChange={e => setStreetName(e.target.value)}
                                    placeholder="Address / Closest street Name ..."
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        {/* Company Name (Optional) */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                            <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
                                Company Name (Optional)
                            </label>
                            <div className="flex-1 max-w-lg">
                                <Input
                                    value={companyName}
                                    onChange={e => setCompanyName(e.target.value)}
                                    placeholder="Company Name ..."
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        {/* Notes (optional) */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                            <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 pt-2 shrink-0">
                                Notes (optional)
                            </label>
                            <div className="flex-1 max-w-lg">
                                <Textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="notes ..."
                                    rows={3}
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        {/* Payment Instructions (optional) */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                            <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 pt-2 shrink-0">
                                Payment Instructions (optional)
                            </label>
                            <div className="flex-1 max-w-lg">
                                <Textarea
                                    value={paymentInstructions}
                                    onChange={e => setPaymentInstructions(e.target.value)}
                                    placeholder="payment instructions ..."
                                    rows={3}
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        {/* Owner Phone Number (optional) */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                            <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 pt-2 shrink-0">
                                Owner Phone Number (optional)
                            </label>
                            <div className="flex-1 max-w-lg">
                                <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-md overflow-hidden bg-white dark:bg-slate-800">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        <span>🇰🇪</span>
                                        <span>+254</span>
                                    </div>
                                    <input
                                        type="tel"
                                        placeholder="712345678"
                                        value={ownerPhone}
                                        onChange={e => setOwnerPhone(e.target.value)}
                                        className="flex-1 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 bg-transparent focus:outline-none"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    The phone number should be in international format country code then phone number.
                                </p>
                            </div>
                        </div>

                        {/* Payment Code (optional) */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                            <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
                                Payment Code (optional)
                            </label>
                            <div className="flex-1 max-w-lg">
                                <Input
                                    value={paymentCode}
                                    onChange={e => setPaymentCode(e.target.value)}
                                    placeholder="e.g. W00"
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Action Buttons (matching Screenshots 3 & 4) */}
                <div className="pt-4 max-w-lg mx-auto sm:ml-58 space-y-2.5">
                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-9 font-medium shadow-xs cursor-pointer"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        + Add Property
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClear}
                        className="w-full text-xs h-9 border-slate-300 hover:bg-slate-50 cursor-pointer"
                    >
                        Clear
                    </Button>
                </div>
            </form>

            {/* Bottom Back Button */}
            <div className="pt-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0b1065] dark:text-blue-400 border border-[#0b1065] dark:border-blue-400 rounded-md hover:bg-[#0b1065]/5 transition cursor-pointer"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
            </div>
        </div>
    );
}

function AssignCaretakerDialog({ property, open, onOpenChange }) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedCaretaker, setSelectedCaretaker] = useState(property.caretakerId || "");

    const { data: caretakers } = useQuery({
        queryKey: ["caretakers"],
        queryFn: api.getCaretakers
    });

    const mutation = useMutation({
        mutationFn: ({ propertyId, caretakerId }) => api.assignCaretaker(propertyId, caretakerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["properties"] });
            onOpenChange(false);
            toast({ title: "Success", description: t('caretaker_assigned') });
        },
        onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to assign caretaker." })
    });

    const handleAssign = () => {
        if (!selectedCaretaker) return;
        mutation.mutate({ propertyId: property._id || property.id, caretakerId: selectedCaretaker });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-106.25">
                <DialogHeader>
                    <DialogTitle>{t('assign_caretaker')} - {property.name}</DialogTitle>
                    <DialogDescription>{t('select_caretaker')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>{t('caretaker')}</Label>
                        <Select value={selectedCaretaker} onValueChange={setSelectedCaretaker}>
                             <SelectTrigger>
                                <SelectValue placeholder={t('select_caretaker')} />
                            </SelectTrigger>
                            <SelectContent>
                                {caretakers?.map((caretaker) => (
                                    <SelectItem key={caretaker.id} value={caretaker.id}>
                                        {caretaker.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleAssign} disabled={mutation.isPending || !selectedCaretaker}>
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} {t('assign')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
// ─── Row Actions ──────────────────────────────────────────────────────────────
function PropertyRowActions({ property }) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [unitsOpen, setUnitsOpen] = useState(false);

    const deleteMutation = useMutation({
        mutationFn: api.deleteProperty,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["properties"] });
            queryClient.invalidateQueries({ queryKey: ["units"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] });
            toast({ title: "Property Deleted" });
        },
        onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to delete property." }),
    });

    return (
        <>
            {editOpen && <EditPropertyDialog property={property} open={editOpen} onOpenChange={setEditOpen} />}
            {assignOpen && <AssignCaretakerDialog property={property} open={assignOpen} onOpenChange={setAssignOpen} />}
            {unitsOpen && <ManageUnitsDialog property={property} open={unitsOpen} onOpenChange={setUnitsOpen} />}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {property.name}?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete this property and all associated units.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate(property._id || property.id)}>
                            {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t("delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setUnitsOpen(true)}><Building2 className="w-3.5 h-3.5 mr-2 text-muted-foreground" /> Manage Units</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditOpen(true)}><Pencil className="w-3.5 h-3.5 mr-2 text-muted-foreground" /> {t("edit_property")}</DropdownMenuItem>
                    <Protect permission={PERMISSIONS.MANAGE_PROPERTIES}>
                        <DropdownMenuItem onClick={() => setAssignOpen(true)}><UserPlus className="w-3.5 h-3.5 mr-2 text-muted-foreground" /> {t("assign_caretaker")}</DropdownMenuItem>
                    </Protect>
                    <DropdownMenuSeparator />
                    <Protect permission={PERMISSIONS.DELETE_DATA}>
                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20" onClick={() => setDeleteOpen(true)}>
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> {t("delete")}
                        </DropdownMenuItem>
                    </Protect>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PropertiesPage() {
    const { t } = useTranslation();
    const [view, setView] = useState("list"); // 'list' | 'form'
    const [search, setSearch] = useState("");
    const [collapseSummary, setCollapseSummary] = useState(false);
    const [collapseTable, setCollapseTable] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);

    const { data: properties = [], isLoading } = useQuery({
        queryKey: ["properties"],
        queryFn: api.getProperties,
    });

    if (view === "form") {
        return <PropertyFormView onBack={() => setView("list")} />;
    }

    const totalUnits = properties.reduce((s, p) => s + (p.units?.length ?? p.totalUnits ?? 0), 0);
    const totalVacancies = properties.reduce((s, p) => s + (p.vacancies ?? 0), 0);
    const totalOccupied = totalUnits - totalVacancies;

    const filtered = properties.filter((p) =>
        !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.location?.toLowerCase().includes(search.toLowerCase())
    );
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

    return (
        <div className="space-y-4 max-w-7xl mx-auto">
            {/* Top Bar */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-[#0b1065] dark:text-blue-400">Properties</h2>
                    <p className="text-xs text-slate-500">Manage real estate assets, locations, and unit configurations.</p>
                </div>
                <Button
                    onClick={() => setView("form")}
                    className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-8 px-4 font-semibold shadow-xs cursor-pointer"
                >
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Property
                </Button>
            </div>

            {/* Summary Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer select-none" onClick={() => setCollapseSummary((v) => !v)}>
                    <h4 className="text-sm font-semibold text-[#0b1065] dark:text-blue-400">Summary</h4>
                    {collapseSummary ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                </div>
                {!collapseSummary && (
                    <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-6 divide-x divide-slate-100 dark:divide-slate-800">
                        <div className="pr-6 text-center">
                            <p className="text-xs text-muted-foreground">Total Properties</p>
                            <p className="text-3xl font-bold text-[#0b1065] dark:text-white mt-2">{properties.length}</p>
                        </div>
                        <div className="px-6 text-center">
                            <p className="text-xs text-muted-foreground">Total Units</p>
                            <p className="text-3xl font-bold text-[#0b1065] dark:text-white mt-2">{totalUnits}</p>
                        </div>
                        <div className="px-6 text-center">
                            <p className="text-xs text-muted-foreground">Occupied</p>
                            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{totalOccupied}</p>
                        </div>
                        <div className="pl-6 text-center">
                            <p className="text-xs text-muted-foreground">Vacancies</p>
                            <p className="text-3xl font-bold text-amber-500 dark:text-amber-400 mt-2">{totalVacancies}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Properties Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                    <h4 className="text-sm font-semibold text-[#0b1065] dark:text-blue-400">Properties</h4>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input type="text" placeholder="Search..." value={search}
                                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                className="h-7 w-44 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md pl-3 pr-7 text-xs focus:outline-none focus:border-blue-500" />
                            <Search className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                        </div>
                        <button onClick={() => setCollapseTable((v) => !v)} className="text-slate-400 hover:text-slate-600 transition-colors p-0.5">
                            {collapseTable ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {!collapseTable && (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                                    <tr>
                                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Property Name</th>
                                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Type</th>
                                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Location</th>
                                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Units</th>
                                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Vacancies</th>
                                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Added</th>
                                        <th className="py-2.5 px-4 text-right font-semibold text-slate-600 dark:text-slate-400">Options</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {isLoading ? (
                                        Array.from({ length: 4 }).map((_, i) => (
                                            <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="py-3 px-4"><Skeleton className="h-4 w-full" /></td>)}</tr>
                                        ))
                                    ) : paginated.length === 0 ? (
                                        <tr><td colSpan={7} className="py-12 text-center text-muted-foreground italic text-xs">
                                            {search ? "No properties match your search." : "No properties yet. Click \"Add Property\" to get started."}
                                        </td></tr>
                                    ) : paginated.map((prop) => (
                                        <tr key={prop._id || prop.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                                                <div className="flex items-center gap-2">
                                                    {prop.image ? (
                                                        <img src={prop.image} alt="" className="w-7 h-7 rounded object-cover shrink-0" onError={(e) => (e.target.style.display = "none")} />
                                                    ) : (
                                                        <div className="w-7 h-7 rounded bg-[#0b1065]/10 flex items-center justify-center shrink-0">
                                                            <Building2 className="w-3.5 h-3.5 text-[#0b1065]" />
                                                        </div>
                                                    )}
                                                    {prop.name}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                                    {prop.type || "Apartment"}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                                                <div className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{prop.location || "—"}</div>
                                            </td>
                                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">{prop.units?.length ?? prop.totalUnits ?? 0}</td>
                                            <td className="py-3 px-4">
                                                <span className={`font-medium ${(prop.vacancies ?? 0) > 0 ? "text-amber-500" : "text-emerald-500"}`}>{prop.vacancies ?? 0}</span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-400">
                                                {prop.createdAt ? new Date(prop.createdAt).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                            </td>
                                            <td className="py-3 px-4 text-right"><PropertyRowActions property={prop} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                            <div className="flex items-center gap-2">
                                <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    className="h-7 w-14 border border-slate-200 dark:border-slate-700 rounded text-xs px-1.5 bg-white dark:bg-slate-800 dark:text-slate-300">
                                    {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                                </select>
                                <span>Showing {filtered.length === 0 ? 0 : (currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filtered.length)} of {filtered.length}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40">‹</button>
                                <span className="px-2 font-medium">{currentPage}</span>
                                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40">›</button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
