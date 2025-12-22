import { useState } from "react";
import { Protect, PERMISSIONS } from "@/lib/access-control";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Building, Home, MoreHorizontal, Loader2, ArrowUpDown, Pencil, Trash2, UserPlus, Save } from "lucide-react";
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
import { Camera, Image as ImageIcon, Link as LinkIcon, UploadCloud } from "lucide-react";
// --- Manage Units Dialog ---
const unitSchema = z.object({
    unitNumber: z.string().min(1, "Unit Number is required"),
    type: z.string().min(1, "Type is required"),
    rentAmount: z.string().min(1, "Rent Amount is required"),
    bedrooms: z.string().min(1, "Bedrooms is required"),
    bathrooms: z.string().min(1, "Bathrooms is required"),
});



function ManageUnitsDialog({ property }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const { formatCurrency } = usePreferences();
    
    // Fetch units for this property
    const { data: units } = useQuery({
        queryKey: ["units", property.id],
        queryFn: () => api.getUnits(property.id),
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
            queryClient.invalidateQueries({ queryKey: ["units", property.id] });
            queryClient.invalidateQueries({ queryKey: ["properties"] }); // Update counts
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
            propertyId: property.id,
            status: "vacant"
        });
    }

    const [editingUnit, setEditingUnit] = useState(null);
    const [deletingUnitId, setDeletingUnitId] = useState(null);

    const deleteMutation = useMutation({
        mutationFn: api.deleteUnit,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["units", property.id] });
            queryClient.invalidateQueries({ queryKey: ["properties"] });
            setDeletingUnitId(null);
            toast({ title: "Unit Deleted", description: "Unit removed successfully." });
        }
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full mr-2">{t('manage_units')}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col">
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
                                        <tr key={unit.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
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
                                                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => setDeletingUnitId(unit.id)}>
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
            rentAmount: unit.rentAmount,
            bedrooms: unit.bedrooms || "1",
            bathrooms: unit.bathrooms || "1"
        }
    });

    const mutation = useMutation({
        mutationFn: api.updateUnit,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["units"] });
            onOpenChange(false);
            toast({ title: "Unit Updated", description: "Unit details updated." });
        },
        onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to update unit." })
    });

    function onSubmit(values) {
        mutation.mutate({ ...values, id: unit.id, propertyId: unit.propertyId, status: unit.status });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('edit_details')}</DialogTitle>
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
            address: property.address,
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
        mutation.mutate({ ...values, id: property.id });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
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
                        <FormField control={form.control} name="address" render={({ field }) => (
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
        queryKey: ["units", property.id],
        queryFn: () => api.getUnits(property.id)
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
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteMutation.mutate(property.id)}>
                            {t('delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Card className="group overflow-hidden border-border/50 shadow-sm hover:shadow-lg transition-all hover:border-primary/20">
                <div className="h-40 bg-muted relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"/>
                    <img src={property.image || `https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`} alt={property.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                    <div className="absolute bottom-3 left-4 z-20 text-white">
                        <h3 className="font-bold text-lg">{property.name}</h3>
                        <div className="flex items-center text-xs opacity-90">
                            <MapPin className="w-3 h-3 mr-1"/>
                            {property.address}
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
// --- Add Property Dialog ---
const propertySchema = z.object({
    name: z.string().min(2, "Name is required"),
    address: z.string().min(5, "Address is required"),
    image: z.string().optional(),
});
function AddPropertyDialog() {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [uploadTab, setUploadTab] = useState("url");
    const [preview, setPreview] = useState(null);

    const form = useForm({
        resolver: zodResolver(propertySchema),
        defaultValues: {
            name: "",
            address: "",
            image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
        }
    });

    const mutation = useMutation({
        mutationFn: api.addProperty,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["properties"] });
            setOpen(false);
            form.reset();
            setPreview(null);
            toast({ title: "Property Added", description: "New property has been listed successfully." });
        },
        onError: () => {
            toast({ variant: "destructive", title: "Error", description: "Failed to add property." });
        }
    });

    function onSubmit(values) {
        mutation.mutate(values);
    }
    
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                 toast({ variant: "destructive", title: "File too large", description: "Image size must be less than 2MB" });
                 return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result;
                setPreview(base64String);
                form.setValue("image", base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    return (<Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-lg hover:shadow-xl transition-all">
            <Plus className="w-4 h-4 mr-2"/> {t('add_property')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('add_property')}</DialogTitle>
          <DialogDescription>
            {t('add_property_desc')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem>
                  <FormLabel>{t('property_name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('property_name_placeholder')} {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>
            <FormField control={form.control} name="address" render={({ field }) => (<FormItem>
                  <FormLabel>{t('address')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('address_placeholder')} {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>
            
            <div className="space-y-2">
                <Label>{t('image')}</Label>
                <Tabs value={uploadTab} onValueChange={setUploadTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="url"><LinkIcon className="w-3 h-3 mr-2"/> {t('image_url')}</TabsTrigger>
                        <TabsTrigger value="file"><UploadCloud className="w-3 h-3 mr-2"/> {t('upload_photo')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="url" className="pt-2">
                        <FormField control={form.control} name="image" render={({ field }) => (<FormItem>
                            <FormControl>
                                <Input placeholder="https://..." {...field} onChange={(e) => {
                                    field.onChange(e);
                                    setPreview(e.target.value);
                                }}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>)}/>
                    </TabsContent>
                    <TabsContent value="file" className="pt-2">
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">{t('click_to_upload') || "Click to upload or drag and drop"}</p>
                                    <p className="text-xs text-muted-foreground mt-1">({t('max_size') || "Max 2MB"})</p>
                                </div>
                                <input id="dropzone-file" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                        </div>
                    </TabsContent>
                </Tabs>
                
                {(preview || form.getValues("image")) && (
                    <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border/50 mt-2">
                        <img src={preview || form.getValues("image")} alt="Preview" className="object-cover w-full h-full" onError={(e) => e.target.style.display = 'none'} />
                    </div>
                )}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                {t('add_property')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>);
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
        mutation.mutate({ propertyId: property.id, caretakerId: selectedCaretaker });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
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
// --- Main Page ---
export default function PropertiesPage() {
    const { t } = useTranslation();
    const [assigningCaretaker, setAssigningCaretaker] = useState(null);
    const { data: properties, isLoading } = useQuery({
        queryKey: ["properties"],
        queryFn: api.getProperties,
    });
    const [sortBy, setSortBy] = useState("name");
    const sortedProperties = properties ? [...properties].sort((a, b) => {
        if (sortBy === "name") {
            return a.name.localeCompare(b.name);
        }
        return 0;
    }) : [];
    return (<div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">{t('properties')}</h2>
            <p className="text-muted-foreground mt-1">{t('manage_properties_desc') || "Manage your buildings and units."}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value)}>
            <SelectTrigger className="w-40 h-10">
              <ArrowUpDown className="w-4 h-4 mr-2"/>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">{t('sort_by_name')}</SelectItem>
              <SelectItem value="units">{t('sort_by_units')}</SelectItem>
            </SelectContent>
          </Select>
          <Protect permission={PERMISSIONS.MANAGE_PROPERTIES}>
            <AddPropertyDialog />
          </Protect>
        </div>
      </div>

      {isLoading ? (<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 w-full rounded-xl"/>)}
        </div>) : (<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             {sortedProperties.map(prop => (<PropertyCard key={prop.id} property={prop} onAssign={setAssigningCaretaker}/>))}
        </div>)}
        
        {assigningCaretaker && (
            <AssignCaretakerDialog 
                property={assigningCaretaker} 
                open={!!assigningCaretaker} 
                onOpenChange={(val) => !val && setAssigningCaretaker(null)} 
            />
        )}
    </div>);
}
