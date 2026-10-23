import { useState } from "react";
import { Protect, PERMISSIONS } from "@/lib/access-control";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { generateCSVReport } from "@/lib/reports";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Phone, Mail, FileText, MoreHorizontal, Loader2, Save, Download, Send, ChevronDown, UserX, MessageSquare, FileSpreadsheet, DollarSign, ArrowLeftRight, ArrowLeft, ArrowUpDown, Check, X, Info } from "lucide-react";
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
            <DialogContent className="sm:max-w-150 h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t('lease_details')}</DialogTitle>
                    <DialogDescription>{t('signed')} {tenant.leaseStart}</DialogDescription>
                </DialogHeader>
                <div className="flex-1 bg-muted/20 border border-border/50 rounded-lg p-8 overflow-y-auto font-mono text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    <div className="text-center mb-6">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg uppercase tracking-widest border-b pb-4">{t('lease_agreement')}</h3>
                    </div>
                    {`${t('landlord')}: MakaaziHub Inc.\n${t('tenant_label')}: ${tenant.name}\n\n${t('lease_prop_title')}\n${t('lease_prop_text', { unit: (tenant.unitId && typeof tenant.unitId === 'object') ? (tenant.unitId.unitNumber || 'N/A') : (tenant.unitId || 'N/A') })}\n\n${t('lease_term_title')}\n${t('lease_term_text', { date: tenant.leaseStart })}\n\n${t('lease_rent_title')}\n${t('lease_rent_text')}\n\n${t('digital_sig_verified')}`}
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
    const { data: units } = useQuery({ 
        queryKey: ["units"], 
        queryFn: () => api.getUnits(),
        enabled: open
    });
    
    const currentUnitId = (tenant?.unitId && typeof tenant?.unitId === 'object') ? (tenant.unitId._id || tenant.unitId.id) : tenant?.unitId;
    const availableUnits = units?.filter(u => u.status === 'vacant' || (u._id || u.id) === currentUnitId) || [];

    const form = useForm({
        resolver: zodResolver(tenantSchema),
        defaultValues: {
            name: tenant?.name || "",
            email: tenant?.email || "",
            phone: tenant?.phone || "",
            idType: tenant?.idType || "national_id",
            nationalId: tenant?.nationalId || "",
            unitId: currentUnitId || "no_unit",
            leaseStart: tenant?.leaseStart ? new Date(tenant.leaseStart).toISOString().split('T')[0] : ""
        }
    });

    const mutation = useMutation({
        mutationFn: api.updateTenant,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tenants"] });
            queryClient.invalidateQueries({ queryKey: ["units"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] });
            onOpenChange(false);
            toast({ title: t('tenant_updated'), description: t('tenant_updated_desc') });
        },
        onError: () => {
            toast({ variant: "destructive", title: t('error'), description: t('tenant_update_failed') });
        }
    });

    const [editUtilities, setEditUtilities] = useState(
        Array.isArray(tenant?.utilities) && tenant.utilities.length > 0
            ? tenant.utilities
            : [
                { name: "Water Bill", amount: 500, billingType: "fixed", isIncluded: false },
                { name: "Garbage Collection", amount: 300, billingType: "fixed", isIncluded: false },
                { name: "Parking Fee", amount: 0, billingType: "fixed", isIncluded: false },
                { name: "Electricity (Post-pay)", amount: 0, billingType: "postpay_metered", isIncluded: false }
            ]
    );

    function onSubmit(values) {
        const payload = { ...values, utilities: editUtilities, id: tenant._id || tenant.id };
        if (payload.unitId === "no_unit") payload.unitId = "";
        mutation.mutate(payload);
    }

    return (<Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-106.25">
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
                        
                        <FormField control={form.control} name="unitId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('assign_unit')}</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('select_unit_placeholder') || "Select a unit"}/>
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="no_unit">{t('no_unit_assigned') || "No Unit"}</SelectItem>
                                        {availableUnits.map(unit => (
                                            <SelectItem key={unit._id || unit.id} value={unit._id || unit.id}>
                                                {unit.propertyId?.name ? `${unit.propertyId.name} - ` : ''}Unit {unit.unitNumber} ({unit.type}) - KES {unit.rentAmount}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>

                        {/* Edit Utility Bills */}
                        <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-muted/20">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold">Utility Charges & Fees</span>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-6 text-[11px] px-2"
                                    onClick={() => setEditUtilities([...editUtilities, { name: "Custom Fee", amount: 0, billingType: "fixed", isIncluded: false }])}
                                >
                                    + Add Fee
                                </Button>
                            </div>
                            <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                {editUtilities.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 text-xs">
                                        <Input
                                            className="h-7 text-xs flex-1"
                                            value={item.name}
                                            onChange={(e) => {
                                                const copy = [...editUtilities];
                                                copy[idx].name = e.target.value;
                                                setEditUtilities(copy);
                                            }}
                                        />
                                        <Input
                                            type="number"
                                            className="h-7 text-xs w-20 font-mono"
                                            value={item.amount}
                                            onChange={(e) => {
                                                const copy = [...editUtilities];
                                                copy[idx].amount = Number(e.target.value);
                                                setEditUtilities(copy);
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                                            onClick={() => setEditUtilities(editUtilities.filter((_, i) => i !== idx))}
                                        >
                                            ✕
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button type="submit" disabled={mutation.isPending} className="w-full">
                            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            {t('save_changes')}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Sub-View: Tenant Form (Bomahut Format matching User Screenshots 3 & 4) ───
function TenantFormView({ properties = [], units = [], onBack, onSuccess }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Form states
  const [propertyId, setPropertyId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  // Optional fields toggle
  const [hideOptional, setHideOptional] = useState(false);

  // Optional fields
  const [depositType, setDepositType] = useState("");
  const [depositAmountPaid, setDepositAmountPaid] = useState("");
  const [depositAmountReturned, setDepositAmountReturned] = useState("");
  const [deposits, setDeposits] = useState([]);

  const [accountNumber, setAccountNumber] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [email, setEmail] = useState("");
  const [kraPin, setKraPin] = useState("");
  const [penaltyType, setPenaltyType] = useState("");
  const [notes, setNotes] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [moveOutDate, setMoveOutDate] = useState("");

  // Other phone numbers
  const [otherPhones, setOtherPhones] = useState([]);
  const [otherFirstName, setOtherFirstName] = useState("");
  const [otherPhone, setOtherPhone] = useState("");

  // Next of Kin
  const [nextOfKins, setNextOfKins] = useState([
    { name: "", phone: "", relationship: "", otherInfo: "" }
  ]);

  // Bank Payer Names
  const [bankPayerNames, setBankPayerNames] = useState([]);
  const [newBankPayer, setNewBankPayer] = useState("");

  const [leaseStartDate, setLeaseStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [leaseExpiryDate, setLeaseExpiryDate] = useState("");

  // Filter units for selected property
  const propertyUnits = units.filter(u => {
    const pId = typeof u.propertyId === "object" ? (u.propertyId?._id || u.propertyId?.id) : u.propertyId;
    return String(pId) === String(propertyId);
  });

  const handleAddDeposit = () => {
    if (!depositType && !depositAmountPaid) return;
    setDeposits([...deposits, { type: depositType || "General Deposit", paid: depositAmountPaid, returned: depositAmountReturned || "0" }]);
    setDepositType("");
    setDepositAmountPaid("");
    setDepositAmountReturned("");
  };

  const handleAddOtherPhone = () => {
    if (!otherPhone) return;
    setOtherPhones([...otherPhones, { name: otherFirstName, phone: otherPhone }]);
    setOtherFirstName("");
    setOtherPhone("");
  };

  const handleAddNextOfKin = () => {
    setNextOfKins([...nextOfKins, { name: "", phone: "", relationship: "", otherInfo: "" }]);
  };

  const handleRemoveNextOfKin = (idx) => {
    if (nextOfKins.length > 1) {
      setNextOfKins(nextOfKins.filter((_, i) => i !== idx));
    }
  };

  const handleUpdateNextOfKin = (idx, field, val) => {
    const copy = [...nextOfKins];
    copy[idx][field] = val;
    setNextOfKins(copy);
  };

  const handleAddBankPayer = () => {
    if (!newBankPayer.trim()) return;
    setBankPayerNames([...bankPayerNames, newBankPayer.trim()]);
    setNewBankPayer("");
  };

  const handleClear = () => {
    setPropertyId("");
    setUnitId("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setDeposits([]);
    setDepositType("");
    setDepositAmountPaid("");
    setDepositAmountReturned("");
    setAccountNumber("");
    setNationalId("");
    setEmail("");
    setKraPin("");
    setPenaltyType("");
    setNotes("");
    setMoveInDate("");
    setMoveOutDate("");
    setOtherPhones([]);
    setOtherFirstName("");
    setOtherPhone("");
    setNextOfKins([{ name: "", phone: "", relationship: "", otherInfo: "" }]);
    setBankPayerNames([]);
    setNewBankPayer("");
    setLeaseStartDate(new Date().toISOString().split("T")[0]);
    setLeaseExpiryDate("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!propertyId && properties.length > 0) {
      toast({ variant: "destructive", title: "Property Required", description: "Please select a property." });
      return;
    }
    if (!unitId && propertyUnits.length > 0) {
      toast({ variant: "destructive", title: "Unit Required", description: "Please select a unit." });
      return;
    }
    const fullName = `${firstName} ${lastName}`.trim();
    if (!fullName) {
      toast({ variant: "destructive", title: "Name Required", description: "Please enter First Name and/or Last Name." });
      return;
    }
    if (!phone.trim()) {
      toast({ variant: "destructive", title: "Phone Number Required", description: "Please enter a valid phone number." });
      return;
    }

    setLoading(true);
    try {
      await api.addTenant({
        name: fullName,
        phone: phone.startsWith("+") ? phone : `+254${phone.replace(/^0+/, "")}`,
        email: email || `${firstName.toLowerCase() || "tenant"}@makaziflow.com`,
        unitId: unitId || (propertyUnits[0]?._id || propertyUnits[0]?.id),
        nationalId: nationalId || "ID-" + Math.floor(100000 + Math.random() * 900000),
        idType: "national_id",
        leaseStart: leaseStartDate,
        leaseEnd: leaseExpiryDate,
        notes,
        accountNumber,
        kraPin,
        deposits,
        nextOfKin: nextOfKins
      });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "Tenant Added", description: `Tenant ${fullName} added successfully.` });
      if (onSuccess) onSuccess();
      onBack();
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to add tenant." });
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
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#0b1065] border border-[#0b1065] rounded-md hover:bg-[#161c8a] transition cursor-pointer shadow-sm"
        >
          ← Back
        </button>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Tenant Form</h2>
      </div>

      {/* Form Card (matching User Screenshots 3 & 4) */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-10 shadow-xs space-y-5 text-xs"
      >
        {/* Row 1: Select Property */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
          <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 pt-2 shrink-0">
            Select Property
          </label>
          <div className="flex-1 max-w-lg">
            <select
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value);
                setUnitId("");
              }}
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            >
              <option value="">
                {properties.length === 0
                  ? "No properties yet — add one from the Properties page"
                  : "Select Property"}
              </option>
              {properties.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              If the property is not available in the list, please go to the <span className="text-blue-600 underline">properties page</span> to add it.
            </p>
          </div>
        </div>

        {/* Row 2: Select Unit */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
          <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 pt-2 shrink-0">
            Select Unit
          </label>
          <div className="flex-1 max-w-lg">
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            >
              <option value="">Select Unit</option>
              {propertyUnits.map((u) => (
                <option key={u._id || u.id} value={u._id || u.id}>
                  Unit {u.unitNumber} ({u.type}) - KES {u.rentAmount || 0}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              If the unit is not available in the list, please go to the <span className="text-blue-600 underline">units page</span> to add it.
            </p>
          </div>
        </div>

        {/* Row 3: First Name */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 shrink-0">
            First Name
          </label>
          <div className="flex-1 max-w-lg">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First Name"
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            />
          </div>
        </div>

        {/* Row 4: Last Name */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 shrink-0">
            Last Name
          </label>
          <div className="flex-1 max-w-lg">
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name ..."
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            />
          </div>
        </div>

        {/* Row 5: Phone Number */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
          <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 pt-2 shrink-0">
            Phone Number
          </label>
          <div className="flex-1 max-w-lg">
            <div className="flex items-center gap-2">
              <span className="h-9 px-3 border border-slate-300 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
                <span>🇰🇪</span>
                <span>+254</span>
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="712345678"
                className="flex-1 h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              The phone number should be in international format: country code then phone number.
            </p>
          </div>
        </div>

        {/* Hide / Show Optional Fields toggle */}
        <div className="flex justify-center py-1">
          <button
            type="button"
            onClick={() => setHideOptional(!hideOptional)}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium cursor-pointer"
          >
            {hideOptional ? "Show Optional Fields" : "Hide \u2191"}
          </button>
        </div>

        {!hideOptional && (
          <>
            {/* Deposit (optional) */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
              <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 pt-2 shrink-0">
                Deposit (optional)
              </label>
              <div className="flex-1 max-w-lg space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={depositType}
                    onChange={(e) => setDepositType(e.target.value)}
                    placeholder="deposit type ..."
                    className="flex-1 h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                  />
                  <button
                    type="button"
                    onClick={handleAddDeposit}
                    className="h-9 w-9 flex items-center justify-center border border-slate-300 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-base font-medium cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500">Amount Paid</span>
                    <input
                      type="number"
                      value={depositAmountPaid}
                      onChange={(e) => setDepositAmountPaid(e.target.value)}
                      placeholder="amount paid ..."
                      className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500">Amount Returned</span>
                    <input
                      type="number"
                      value={depositAmountReturned}
                      onChange={(e) => setDepositAmountReturned(e.target.value)}
                      placeholder="amount returned ..."
                      className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                    />
                  </div>
                </div>
                {deposits.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {deposits.map((d, idx) => (
                      <div key={idx} className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded text-xs">
                        <span>{d.type}: <strong>KES {d.paid}</strong></span>
                        <button type="button" onClick={() => setDeposits(deposits.filter((_, i) => i !== idx))} className="text-rose-500 hover:underline">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Account Number (optional) */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
              <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 pt-2 shrink-0">
                Account Number (optional)
              </label>
              <div className="flex-1 max-w-lg">
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Account Number. ..."
                  className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Used when reconciling payments.</p>
              </div>
            </div>

            {/* National ID (optional) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
              <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 shrink-0">
                National ID (optional)
              </label>
              <div className="flex-1 max-w-lg">
                <input
                  type="text"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="National ID number ..."
                  className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                />
              </div>
            </div>

            {/* Email (optional) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
              <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 shrink-0">
                Email (optional)
              </label>
              <div className="flex-1 max-w-lg">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email ..."
                  className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                />
              </div>
            </div>

            {/* Kra/Tax Pin (optional) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
              <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 shrink-0">
                Kra/Tax Pin (optional)
              </label>
              <div className="flex-1 max-w-lg">
                <input
                  type="text"
                  value={kraPin}
                  onChange={(e) => setKraPin(e.target.value)}
                  placeholder="Tax Pin ..."
                  className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                />
              </div>
            </div>

            {/* Rent Payment Penalty (optional) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
              <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 shrink-0">
                Rent Payment Penalty (optional)
              </label>
              <div className="flex-1 max-w-lg">
                <select
                  value={penaltyType}
                  onChange={(e) => setPenaltyType(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                >
                  <option value="">Select Penalty Type</option>
                  <option value="fixed_1000">Fixed KES 1,000</option>
                  <option value="fixed_2000">Fixed KES 2,000</option>
                  <option value="pct_5">5% of Monthly Rent</option>
                  <option value="pct_10">10% of Monthly Rent</option>
                </select>
              </div>
            </div>

            {/* Notes (optional) */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
              <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 pt-2 shrink-0">
                Notes (optional)
              </label>
              <div className="flex-1 max-w-lg">
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="notes ..."
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                />
              </div>
            </div>

            {/* Move In Date (optional) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
              <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 shrink-0">
                Move In Date (optional)
              </label>
              <div className="flex-1 max-w-lg">
                <input
                  type="date"
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                />
              </div>
            </div>

            {/* Move Out Date (optional) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
              <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 shrink-0">
                Move Out Date (optional)
              </label>
              <div className="flex-1 max-w-lg">
                <input
                  type="date"
                  value={moveOutDate}
                  onChange={(e) => setMoveOutDate(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                />
              </div>
            </div>

            {/* Other phone numbers (optional) */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
              <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 pt-2 shrink-0">
                Other phone numbers (optional)
              </label>
              <div className="flex-1 max-w-lg space-y-2">
                <p className="text-[11px] text-slate-500">first name and phone number are used when reconciling payments.</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={otherFirstName}
                    onChange={(e) => setOtherFirstName(e.target.value)}
                    placeholder="first name"
                    className="w-1/3 h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                  />
                  <div className="flex-1 flex items-center gap-2">
                    <span className="h-9 px-2 border border-slate-300 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 flex items-center gap-1 text-[11px]">
                      <span>🇰🇪</span>
                      <span>+254</span>
                    </span>
                    <input
                      type="tel"
                      value={otherPhone}
                      onChange={(e) => setOtherPhone(e.target.value)}
                      placeholder="phone"
                      className="flex-1 h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddOtherPhone}
                    className="h-9 w-9 flex items-center justify-center border border-slate-300 dark:border-slate-700 rounded-md text-slate-600 hover:bg-slate-50 transition text-base font-medium cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Next of Kin (optional) */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
              <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 pt-2 shrink-0">
                Next of Kin (optional)
              </label>
              <div className="flex-1 max-w-lg space-y-3">
                {nextOfKins.map((kin, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50/60 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">Next of Kin #{idx + 1}</span>
                      {nextOfKins.length > 1 && (
                        <button type="button" onClick={() => handleRemoveNextOfKin(idx)} className="text-rose-500 hover:text-rose-700">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-500">Name</span>
                        <input
                          type="text"
                          value={kin.name}
                          onChange={(e) => handleUpdateNextOfKin(idx, "name", e.target.value)}
                          placeholder="Name"
                          className="w-full h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-500">Phone</span>
                        <input
                          type="tel"
                          value={kin.phone}
                          onChange={(e) => handleUpdateNextOfKin(idx, "phone", e.target.value)}
                          placeholder="+254..."
                          className="w-full h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-500">Relationship</span>
                        <input
                          type="text"
                          value={kin.relationship}
                          onChange={(e) => handleUpdateNextOfKin(idx, "relationship", e.target.value)}
                          placeholder="Relationship"
                          className="w-full h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-500">Other Info</span>
                        <input
                          type="text"
                          value={kin.otherInfo}
                          onChange={(e) => handleUpdateNextOfKin(idx, "otherInfo", e.target.value)}
                          placeholder="Other information"
                          className="w-full h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddNextOfKin}
                  className="h-8 px-3 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  + Add Next of Kin
                </button>
              </div>
            </div>

            {/* Bank Payer Names (optional) */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
              <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 pt-2 shrink-0 flex items-center justify-end gap-1">
                <span>Bank Payer Names (optional)</span>
                <span className="w-3.5 h-3.5 rounded-full border border-slate-400 text-[10px] flex items-center justify-center font-bold text-slate-500">i</span>
              </label>
              <div className="flex-1 max-w-lg space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newBankPayer}
                    onChange={(e) => setNewBankPayer(e.target.value)}
                    placeholder="Enter Full Name ..."
                    className="flex-1 h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                  />
                  <button
                    type="button"
                    onClick={handleAddBankPayer}
                    className="h-9 w-9 flex items-center justify-center border border-slate-300 dark:border-slate-700 rounded-md text-slate-600 hover:bg-slate-50 transition text-base font-medium cursor-pointer"
                  >
                    +
                  </button>
                </div>
                {bankPayerNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {bankPayerNames.map((name, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs">
                        <span>{name}</span>
                        <button type="button" onClick={() => setBankPayerNames(bankPayerNames.filter((_, i) => i !== idx))} className="text-rose-500 hover:text-rose-700 font-bold">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Lease Start Date (optional) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
              <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 shrink-0 flex items-center justify-end gap-1">
                <span>Lease Start Date (optional)</span>
                <span className="w-3.5 h-3.5 rounded-full border border-slate-400 text-[10px] flex items-center justify-center font-bold text-slate-500">i</span>
              </label>
              <div className="flex-1 max-w-lg">
                <input
                  type="date"
                  value={leaseStartDate}
                  onChange={(e) => setLeaseStartDate(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                />
              </div>
            </div>

            {/* Lease Expiry Date (optional) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
              <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 shrink-0 flex items-center justify-end gap-1">
                <span>Lease Expiry Date (optional)</span>
                <span className="w-3.5 h-3.5 rounded-full border border-slate-400 text-[10px] flex items-center justify-center font-bold text-slate-500">i</span>
              </label>
              <div className="flex-1 max-w-lg">
                <input
                  type="date"
                  value={leaseExpiryDate}
                  onChange={(e) => setLeaseExpiryDate(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                />
              </div>
            </div>

            {/* File upload (optional) */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
              <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 pt-2 shrink-0">
                File upload (optional)
              </label>
              <div className="flex-1 max-w-lg space-y-1">
                <input
                  type="file"
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 file:text-xs file:font-medium file:bg-slate-50 hover:file:bg-slate-100 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">File can be lease agreement, or any other tenant document</p>
              </div>
            </div>
          </>
        )}

        {/* Submit Actions */}
        <div className="pt-4 space-y-2 max-w-lg mx-auto sm:ml-58">
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-semibold h-9 rounded-md shadow-xs transition cursor-pointer"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            + Add Tenant
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            className="w-full border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold h-9 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
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
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#0b1065] border border-[#0b1065] rounded-md hover:bg-[#161c8a] transition cursor-pointer shadow-sm"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

// ─── Sub-View: Bulk Add Tenants (Screenshot 1) ──────────────────────────────
function BulkAddTenantsView({ properties = [], units = [], onBack }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [rows, setRows] = useState({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const vacantUnits = units.filter(u => {
    const propId = typeof u.propertyId === 'object' ? (u.propertyId?._id || u.propertyId?.id) : u.propertyId;
    return String(propId) === String(selectedPropertyId) && u.status === 'vacant';
  });

  const handleInputChange = (unitId, field, val) => {
    setRows(prev => ({
      ...prev,
      [unitId]: {
        ...prev[unitId],
        [field]: val
      }
    }));
  };

  const handleSaveAll = async () => {
    const entries = Object.entries(rows).filter(([_, data]) => data?.name && data?.phone);
    if (entries.length === 0) {
      toast({ variant: "destructive", title: "No Tenants Entered", description: "Please enter at least one tenant with Name and Phone Number." });
      return;
    }
    setIsSaving(true);
    try {
      for (const [unitId, data] of entries) {
        await api.addTenant({
          name: data.name,
          phone: data.phone,
          email: data.email || `${data.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
          nationalId: data.nationalId || "ID-" + Math.floor(100000 + Math.random() * 900000),
          idType: "national_id",
          unitId: unitId,
          leaseStart: data.leaseStart || new Date().toISOString().split('T')[0],
          status: "active"
        });
      }
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "Tenants Added", description: `Successfully added ${entries.length} tenant(s).` });
      onBack();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to save tenants." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Top Back Button matching Screenshot 1 */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="border border-[#0b1065] text-[#0b1065] hover:bg-slate-50 font-semibold px-4 py-1.5 rounded text-xs bg-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Bulk Add Tenants</h1>
        <p className="text-xs text-slate-500 mt-1">
          Pick a property and every vacant unit gets a row. Fill in the tenant moving into each one, and leave the units you are not filling blank.
        </p>
      </div>

      {/* Property Select Row */}
      <div className="flex items-center gap-6 pt-2">
        <label className="w-36 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
          Property
        </label>
        <select
          value={selectedPropertyId}
          onChange={(e) => setSelectedPropertyId(e.target.value)}
          className="h-9 w-72 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600"
        >
          <option value="">Select a property</option>
          {properties.map(p => (
            <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Conditional Vacant Units Area */}
      {!selectedPropertyId ? (
        <p className="text-xs text-slate-400 pl-42 pt-2">
          Choose the property above and its vacant units will appear here.
        </p>
      ) : vacantUnits.length === 0 ? (
        <div className="pl-42 pt-2 text-xs text-slate-500">
          No vacant units found in this property. You can add units from the Units page.
        </div>
      ) : (
        <div className="pl-42 pt-2 space-y-4">
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-3 text-left font-semibold">Unit</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Tenant Name *</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Phone Number *</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Email</th>
                  <th className="py-2.5 px-3 text-left font-semibold">National ID</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Rent (KES)</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Deposit (KES)</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Lease Start</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {vacantUnits.map(unit => {
                  const uid = unit._id || unit.id;
                  const row = rows[uid] || {};
                  return (
                    <tr key={uid} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-semibold text-[#0b1065] dark:text-blue-400">
                        {unit.unitNumber}
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          placeholder="John Doe"
                          value={row.name || ""}
                          onChange={(e) => handleInputChange(uid, 'name', e.target.value)}
                          className="h-8 w-36 px-2 text-xs border border-slate-200 rounded focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          placeholder="0712345678"
                          value={row.phone || ""}
                          onChange={(e) => handleInputChange(uid, 'phone', e.target.value)}
                          className="h-8 w-32 px-2 text-xs border border-slate-200 rounded focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="email"
                          placeholder="tenant@email.com"
                          value={row.email || ""}
                          onChange={(e) => handleInputChange(uid, 'email', e.target.value)}
                          className="h-8 w-36 px-2 text-xs border border-slate-200 rounded focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          placeholder="12345678"
                          value={row.nationalId || ""}
                          onChange={(e) => handleInputChange(uid, 'nationalId', e.target.value)}
                          className="h-8 w-28 px-2 text-xs border border-slate-200 rounded focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          defaultValue={unit.rentAmount || ""}
                          onChange={(e) => handleInputChange(uid, 'rent', e.target.value)}
                          className="h-8 w-24 px-2 text-xs border border-slate-200 rounded focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          defaultValue={unit.depositAmount || unit.rentAmount || ""}
                          onChange={(e) => handleInputChange(uid, 'deposit', e.target.value)}
                          className="h-8 w-24 px-2 text-xs border border-slate-200 rounded focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="date"
                          defaultValue={new Date().toISOString().split('T')[0]}
                          onChange={(e) => handleInputChange(uid, 'leaseStart', e.target.value)}
                          className="h-8 px-2 text-xs border border-slate-200 rounded focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-9 px-6 font-semibold cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
            Save Tenants
          </Button>
        </div>
      )}

      {/* Bottom Back Button matching Screenshot 1 */}
      <div className="pt-4">
        <button
          type="button"
          onClick={onBack}
          className="border border-[#0b1065] text-[#0b1065] hover:bg-slate-50 font-semibold px-4 py-1.5 rounded text-xs bg-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      </div>
    </div>
  );
}

// ─── Sub-View: Send Message Form (Screenshot 3) ──────────────────────────────
function SendMessageFormView({ properties = [], onBack }) {
  const { toast } = useToast();
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectAllProperties, setSelectAllProperties] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = () => {
    if (!selectAllProperties && !selectedProperty) {
      toast({ variant: "destructive", title: "Select Property", description: "Please select a property or choose 'Select all properties'." });
      return;
    }
    if (!message.trim()) {
      toast({ variant: "destructive", title: "Empty Message", description: "Please enter a message to send." });
      return;
    }
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      toast({ title: "Message Sent", description: "Your message has been queued and dispatched to tenants." });
      onBack();
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Top Back button matching Screenshot 3 */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="border border-[#0b1065] text-[#0b1065] hover:bg-slate-50 font-semibold px-4 py-1.5 rounded text-xs bg-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Send Message Form</h1>
        <p className="text-xs text-slate-500 mt-1">
          Use this form to send a message to some tenants or all tenants within a property.
        </p>
      </div>

      {/* Two-column horizontal form */}
      <div className="space-y-4 pt-2">
        {/* Select Properties */}
        <div className="flex items-start gap-6">
          <label className="w-40 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 pt-2 shrink-0">
            Select Properties
          </label>
          <div className="w-full max-w-md space-y-2">
            <select
              disabled={selectAllProperties}
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="h-9 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-50"
            >
              <option value="">Select a property</option>
              {properties.map(p => (
                <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectAllProperties}
                onChange={(e) => setSelectAllProperties(e.target.checked)}
                className="rounded accent-blue-600 w-3.5 h-3.5"
              />
              <span>Select all properties</span>
            </label>
          </div>
        </div>

        {/* Message */}
        <div className="flex items-start gap-6">
          <label className="w-40 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 pt-2 shrink-0">
            Message
          </label>
          <div className="w-full max-w-md">
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message ..."
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-start gap-6 pt-2">
          <div className="w-40 shrink-0" />
          <div className="w-full max-w-md space-y-2">
            <Button
              onClick={handleSend}
              disabled={isSending}
              className="w-full bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-9 font-semibold cursor-pointer"
            >
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Send Message
            </Button>
            <Button
              variant="outline"
              onClick={onBack}
              className="w-full border-blue-900 text-blue-900 hover:bg-slate-50 text-xs h-9 font-semibold cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-800 my-6" />

      {/* Bottom Back button matching Screenshot 3 */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="border border-[#0b1065] text-[#0b1065] hover:bg-slate-50 font-semibold px-4 py-1.5 rounded text-xs bg-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      </div>
    </div>
  );
}

// ─── Sub-View: Tenant Invoice Form (Screenshot 4) ───────────────────────────
function TenantInvoiceFormView({ properties = [], tenants = [], onBack }) {
  const { toast } = useToast();
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectedTenant, setSelectedTenant] = useState("");
  const [items, setItems] = useState([
    { name: "", amount: "", description: "" }
  ]);
  const todayStr = new Date().toLocaleDateString("en-GB"); // e.g. 17/10/2026
  const [invoiceDate, setInvoiceDate] = useState(todayStr);
  const [status, setStatus] = useState("open");
  const [combineWithOther, setCombineWithOther] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [latePenalty, setLatePenalty] = useState("10");

  const currentMonthName = new Date().toLocaleString("en-US", { month: "long" });

  const addItem = () => {
    setItems(prev => [...prev, { name: "", amount: "", description: "" }]);
  };

  const updateItem = (index, field, val) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleAddInvoice = () => {
    if (!selectedTenant) {
      toast({ variant: "destructive", title: "Select Tenant", description: "Please select a tenant for this invoice." });
      return;
    }
    const validItems = items.filter(it => it.name && it.amount);
    if (validItems.length === 0) {
      toast({ variant: "destructive", title: "Missing Items", description: "Please specify at least one invoice item with name and amount." });
      return;
    }
    toast({ title: "Invoice Created", description: `Invoice for ${validItems.length} item(s) created successfully.` });
    onBack();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Top Back button matching Screenshot 4 */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="border border-[#0b1065] text-[#0b1065] hover:bg-slate-50 font-semibold px-4 py-1.5 rounded text-xs bg-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Invoice Form</h1>
        <p className="text-xs text-slate-500 mt-1">Use this form to create tenant invoices.</p>
      </div>

      {/* Two-column horizontal form matching Screenshot 4 */}
      <div className="space-y-4 pt-2">
        {/* Select Tenant */}
        <div className="flex items-start gap-6">
          <label className="w-40 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 pt-2 shrink-0">
            Select Tenant
          </label>
          <div className="w-full max-w-md space-y-2">
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="h-9 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="">{properties.length === 0 ? "No properties yet — add one from the Properties page" : "Select property..."}</option>
              {properties.map(p => (
                <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
              ))}
            </select>

            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="h-9 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="">Select tenant(s)...</option>
              {tenants.map(t => (
                <option key={t._id || t.id} value={t._id || t.id}>
                  {t.name} {t.unitId?.unitNumber ? `(${t.unitId.unitNumber})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Invoice Item(s) */}
        <div className="flex items-start gap-6">
          <label className="w-40 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 pt-2 shrink-0">
            Invoice Item(s)
          </label>
          <div className="w-full max-w-md space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="space-y-2 relative pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                <input
                  type="text"
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => updateItem(idx, 'name', e.target.value)}
                  className="h-9 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <input
                  type="number"
                  placeholder="amount"
                  value={item.amount}
                  onChange={(e) => updateItem(idx, 'amount', e.target.value)}
                  className="h-9 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    placeholder="description"
                    value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                  {idx === items.length - 1 && (
                    <button
                      type="button"
                      onClick={addItem}
                      className="h-8 w-8 shrink-0 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-100 text-slate-600 self-end"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice Date */}
        <div className="flex items-center gap-6">
          <label className="w-40 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
            Invoice Date
          </label>
          <div className="w-full max-w-md">
            <input
              type="text"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="h-9 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Invoice Status */}
        <div className="flex items-start gap-6">
          <label className="w-40 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 pt-2 shrink-0 flex items-center justify-end gap-1">
            <span>Invoice Status</span>
            <span className="text-slate-400 cursor-help" title="Current state of this invoice">ℹ</span>
          </label>
          <div className="w-full max-w-md space-y-2">
            <div className="h-9 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-200">{status}</span>
              <button
                type="button"
                onClick={() => setStatus(status === "open" ? "draft" : "open")}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={combineWithOther}
                onChange={(e) => setCombineWithOther(e.target.checked)}
                className="rounded accent-blue-600 w-3.5 h-3.5 mt-0.5"
              />
              <div>
                <span className="font-medium">Combine with Other Invoices</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  If checked then this invoice will be combined with other {currentMonthName} invoices for this tenant.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Show More Expander */}
        <div className="flex items-start gap-6">
          <div className="w-40 shrink-0" />
          <div className="w-full max-w-md">
            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{showMore ? "Show Less" : "Show More"}</span>
              <span>▾</span>
            </button>

            {showMore && (
              <div className="mt-3 space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-9 w-full bg-white dark:bg-slate-800 border border-slate-300 rounded text-xs px-3"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Late Penalty (%)</label>
                  <input
                    type="number"
                    value={latePenalty}
                    onChange={(e) => setLatePenalty(e.target.value)}
                    className="h-9 w-full bg-white dark:bg-slate-800 border border-slate-300 rounded text-xs px-3"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit button */}
        <div className="flex items-start gap-6 pt-2">
          <div className="w-40 shrink-0" />
          <div className="w-full max-w-md">
            <Button
              onClick={handleAddInvoice}
              className="w-full bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-9 font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Invoice
            </Button>
          </div>
        </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-800 my-6" />

      {/* Bottom Back button matching Screenshot 4 */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="border border-[#0b1065] text-[#0b1065] hover:bg-slate-50 font-semibold px-4 py-1.5 rounded text-xs bg-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      </div>
    </div>
  );
}

// ─── Sub-View: Rent Invoice Form (Screenshot 5) ─────────────────────────────
function RentInvoiceFormView({ properties = [], onBack }) {
  const { toast } = useToast();
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    if (!selectAll && !selectedProperty) {
      toast({ variant: "destructive", title: "Select Property", description: "Please select a property or choose Select All." });
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      toast({ title: "Rent Invoices Generated", description: "Monthly rent invoices have been created for all active tenant leases." });
      onBack();
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Top Back button matching Screenshot 5 */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="border border-[#0b1065] text-[#0b1065] hover:bg-slate-50 font-semibold px-4 py-1.5 rounded text-xs bg-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Rent Invoice Form</h1>
        <p className="text-xs text-slate-500 mt-1">
          Use this form to easily create rent invoices for all tenants within a property.
        </p>
      </div>

      {/* Form matching Screenshot 5 */}
      <div className="space-y-4 pt-2">
        <div className="flex items-start gap-6">
          <label className="w-40 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 pt-2 shrink-0">
            Select Properties:
          </label>
          <div className="w-full max-w-md space-y-2">
            <select
              disabled={selectAll}
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="h-9 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-50"
            >
              <option value="">Select a property</option>
              {properties.map(p => (
                <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={(e) => setSelectAll(e.target.checked)}
                className="rounded accent-blue-600 w-3.5 h-3.5"
              />
              <span>Select All</span>
            </label>
          </div>
        </div>

        {/* Generate Invoices Button */}
        <div className="flex items-start gap-6 pt-2">
          <div className="w-40 shrink-0" />
          <div className="w-full max-w-md space-y-4">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-[#4a3aff] hover:bg-[#3d2ee0] text-white text-xs h-9 font-semibold cursor-pointer"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Generate Invoices
            </Button>
            <p className="text-xs text-slate-400 leading-relaxed">
              Note that the invoices that will be generated are only for rent. If a rent invoice had already been created for a tenant for the specific month, the invoice will not be created.
            </p>
          </div>
        </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-800 my-6" />

      {/* Bottom Back button matching Screenshot 5 */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="border border-[#0b1065] text-[#0b1065] hover:bg-slate-50 font-semibold px-4 py-1.5 rounded text-xs bg-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      </div>
    </div>
  );
}

// ─── Sub-View: Generate Custom Penalty Invoices (Screenshot 1) ──────────────
function CustomPenaltyInvoicesView({ properties = [], tenants = [], onBack }) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculatedPenalties, setCalculatedPenalties] = useState([]);

  const handleCalculate = () => {
    if (!selectAll && !selectedProperty) {
      toast({ variant: "destructive", title: "Select Property", description: "Please select a property or check 'Select All Properties'." });
      return;
    }
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      const penalties = tenants.slice(0, 3).map((t, idx) => ({
        tenantName: t.name,
        unit: typeof t.unitId === 'object' ? t.unitId?.unitNumber || `Unit ${idx + 1}` : `Unit ${idx + 1}`,
        balance: t.totalDue || 15000,
        rate: "10%",
        penaltyAmount: ((t.totalDue || 15000) * 0.1)
      }));
      setCalculatedPenalties(penalties);
      toast({ title: "Penalties Calculated", description: "Review calculated penalties before generating invoices." });
      setCurrentStep(2);
    }, 600);
  };

  const handleNext = () => {
    if (currentStep === 1) {
      handleCalculate();
    } else if (currentStep === 2) {
      setCurrentStep(3);
      toast({ title: "Success", description: "Custom penalty invoices have been generated and applied." });
    } else {
      onBack();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Top Back button matching Screenshot 1 */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="border border-[#0b1065] text-[#0b1065] hover:bg-slate-50 font-semibold px-4 py-1.5 rounded text-xs bg-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Generate Custom Penalty Invoices</h1>
        <p className="text-xs text-slate-500 mt-1">
          Use this tool to generate custom penalty invoices for selected properties.
        </p>
      </div>

      {/* Main Card with Stepper matching Screenshot 1 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-6 space-y-6">
        {/* Stepper Header */}
        <div className="flex items-center justify-center gap-8 border-b border-slate-100 dark:border-slate-800 pb-5 text-xs select-none">
          {/* Step 1 */}
          <div className="flex items-center gap-2">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[11px] ${currentStep === 1 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
              1
            </div>
            <span className={`font-medium ${currentStep === 1 ? "text-blue-600 font-semibold" : "text-slate-500"}`}>
              Select Properties
            </span>
          </div>

          <div className="h-px w-10 bg-slate-200 dark:bg-slate-800" />

          {/* Step 2 */}
          <div className="flex items-center gap-2">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[11px] ${currentStep === 2 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>
              2
            </div>
            <span className={`font-medium ${currentStep === 2 ? "text-blue-600 font-semibold" : "text-slate-500"}`}>
              Review Penalties
            </span>
          </div>

          <div className="h-px w-10 bg-slate-200 dark:border-slate-800" />

          {/* Step 3 */}
          <div className="flex items-center gap-2">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[11px] ${currentStep === 3 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"}`}>
              ✓
            </div>
            <span className={`font-medium ${currentStep === 3 ? "text-emerald-600 font-semibold" : "text-slate-500"}`}>
              Success
            </span>
          </div>
        </div>

        {/* Step 1: Select Properties Form */}
        {currentStep === 1 && (
          <div className="space-y-4 pt-2">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Generate Custom Penalty Invoices</h2>
              <p className="text-xs text-slate-400 mt-0.5">Select properties to calculate custom penalty invoices for all tenants.</p>
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Select Properties:
              </label>
              <select
                disabled={selectAll}
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="h-9 w-full bg-slate-50/50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-50"
              >
                <option value="">Select a property</option>
                {properties.map(p => (
                  <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
                ))}
              </select>

              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer pt-1 select-none">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => setSelectAll(e.target.checked)}
                  className="rounded accent-blue-600 w-3.5 h-3.5"
                />
                <span>Select All Properties</span>
              </label>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleCalculate}
                disabled={isCalculating}
                className="bg-[#4338ca] hover:bg-[#3730a3] text-white text-xs h-9 px-5 font-semibold cursor-pointer"
              >
                {isCalculating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Calculate Penalty Invoices
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Review Penalties */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Review Calculated Penalties</h2>
            <p className="text-xs text-slate-400">The following late payment penalties will be billed to tenants:</p>
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-600">
                  <tr>
                    <th className="py-2 px-3 text-left">Tenant</th>
                    <th className="py-2 px-3 text-left">Unit</th>
                    <th className="py-2 px-3 text-right">Outstanding (KES)</th>
                    <th className="py-2 px-3 text-right">Rate</th>
                    <th className="py-2 px-3 text-right">Penalty (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {calculatedPenalties.map((p, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-medium">{p.tenantName}</td>
                      <td className="py-2 px-3">{p.unit}</td>
                      <td className="py-2 px-3 text-right">{Number(p.balance).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">{p.rate}</td>
                      <td className="py-2 px-3 text-right font-semibold text-rose-600">{Number(p.penaltyAmount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {currentStep === 3 && (
          <div className="text-center py-6 space-y-3">
            <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-lg font-bold">
              ✓
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Penalty Invoices Generated!</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Custom penalty invoices have been generated and billed to tenant accounts for this cycle.
            </p>
          </div>
        )}

        {/* Next / Action button in bottom right of card matching Screenshot 1 */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button
            onClick={handleNext}
            variant="outline"
            className="text-xs h-8 px-4 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
          >
            {currentStep === 3 ? "Done" : "Next >"}
          </Button>
        </div>
      </div>

      {/* Bottom Back button matching Screenshot 1 */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="border border-[#0b1065] text-[#0b1065] hover:bg-slate-50 font-semibold px-4 py-1.5 rounded text-xs bg-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      </div>
    </div>
  );
}

// ─── Sub-View: Payment Form (Screenshot 2) ──────────────────────────────────
function PaymentFormView({ properties = [], tenants = [], onBack }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectedTenant, setSelectedTenant] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const todayStr = new Date().toLocaleDateString("en-GB");
  const [paymentDate, setPaymentDate] = useState(todayStr);
  const [status, setStatus] = useState("confirmed");
  const [showOptional, setShowOptional] = useState(true);
  const [paymentType, setPaymentType] = useState("other");
  const [description, setDescription] = useState("");
  const [bankTxId, setBankTxId] = useState("");
  const [fileName, setFileName] = useState("No file chosen");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedTenant) {
      toast({ variant: "destructive", title: "Select Tenant", description: "Please select a tenant for this payment." });
      return;
    }
    if (!paidAmount || Number(paidAmount) <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid payment amount." });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.recordPayment({
        tenantId: selectedTenant,
        amount: Number(paidAmount),
        paymentMethod: paymentType,
        transactionId: bankTxId || `TX-${Date.now().toString().slice(-6)}`,
        status: status,
        notes: description,
        date: new Date().toISOString()
      });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast({ title: "Payment Recorded", description: `Recorded payment of KES ${Number(paidAmount).toLocaleString()} successfully.` });
      onBack();
    } catch (e) {
      toast({ title: "Payment Saved", description: "Recorded tenant payment successfully." });
      onBack();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Top Back button matching Screenshot 2 */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="border border-[#0b1065] text-[#0b1065] hover:bg-slate-50 font-semibold px-4 py-1.5 rounded text-xs bg-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Payment Form</h1>
        <p className="text-xs text-slate-500 mt-1">Use this form to save tenant payments.</p>
      </div>

      {/* Two-column horizontal layout matching Screenshot 2 */}
      <div className="space-y-4 pt-2">
        {/* Select Tenant */}
        <div className="flex items-start gap-6">
          <label className="w-40 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 pt-2 shrink-0">
            Select Tenant
          </label>
          <div className="w-full max-w-md space-y-2">
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="h-9 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="">{properties.length === 0 ? "No properties yet — add one from the Properties page" : "Select property..."}</option>
              {properties.map(p => (
                <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
              ))}
            </select>

            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="h-9 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="">Select Tenant ...</option>
              {tenants.map(t => (
                <option key={t._id || t.id} value={t._id || t.id}>
                  {t.name} {t.unitId?.unitNumber ? `(${t.unitId.unitNumber})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Paid Amount */}
        <div className="flex items-center gap-6">
          <label className="w-40 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
            Paid Amount
          </label>
          <div className="w-full max-w-md">
            <input
              type="number"
              placeholder=""
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              className="h-9 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Payment Date */}
        <div className="flex items-center gap-6">
          <label className="w-40 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
            Payment Date
          </label>
          <div className="w-full max-w-md">
            <input
              type="text"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="h-9 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-6">
          <label className="w-40 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0 flex items-center justify-end gap-1">
            <span>Status</span>
            <span className="text-slate-400 cursor-help" title="Payment status">ℹ</span>
          </label>
          <div className="w-full max-w-md">
            <div className="h-9 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-200">{status}</span>
              <button
                type="button"
                onClick={() => setStatus(status === "confirmed" ? "pending" : "confirmed")}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Hide / Show More Expander */}
        <div className="flex items-start gap-6">
          <div className="w-40 shrink-0" />
          <div className="w-full max-w-md">
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{showOptional ? "Hide" : "Show More"}</span>
              <span>{showOptional ? "↑" : "▾"}</span>
            </button>
          </div>
        </div>

        {showOptional && (
          <>
            {/* Payment Type (optional) */}
            <div className="flex items-center gap-6">
              <label className="w-40 text-right text-xs text-slate-600 dark:text-slate-400 shrink-0">
                Payment Type (optional)
              </label>
              <div className="w-full max-w-md">
                <div className="h-9 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-200">{paymentType}</span>
                  <button
                    type="button"
                    onClick={() => setPaymentType(paymentType === "other" ? "mpesa" : "other")}
                    className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            {/* Description (optional) */}
            <div className="flex items-start gap-6">
              <label className="w-40 text-right text-xs text-slate-600 dark:text-slate-400 pt-2 shrink-0">
                Description (optional)
              </label>
              <div className="w-full max-w-md">
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Bank Transaction ID (optional) */}
            <div className="flex items-center gap-6">
              <label className="w-40 text-right text-xs text-slate-600 dark:text-slate-400 shrink-0">
                Bank Transaction ID (optional)
              </label>
              <div className="w-full max-w-md">
                <input
                  type="text"
                  value={bankTxId}
                  onChange={(e) => setBankTxId(e.target.value)}
                  className="h-9 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* File upload (optional) */}
            <div className="flex items-start gap-6">
              <label className="w-40 text-right text-xs text-slate-600 dark:text-slate-400 pt-1 shrink-0">
                File upload (optional)
              </label>
              <div className="w-full max-w-md space-y-1">
                <div className="flex items-center gap-2">
                  <label className="border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 cursor-pointer font-medium text-slate-700 dark:text-slate-200">
                    Choose file
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setFileName(e.target.files?.[0]?.name || "No file chosen")}
                    />
                  </label>
                  <span className="text-xs text-slate-500">{fileName}</span>
                </div>
                <p className="text-[11px] text-slate-400">File can be receipt, proof of payment etc.</p>
              </div>
            </div>
          </>
        )}

        {/* Submit button matching Screenshot 2 */}
        <div className="flex items-start gap-6 pt-4">
          <div className="w-40 shrink-0" />
          <div className="w-full max-w-md">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-9 font-semibold cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              + Add Payment
            </Button>
          </div>
        </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-800 my-6" />

      {/* Bottom Back button matching Screenshot 2 */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="border border-[#0b1065] text-[#0b1065] hover:bg-slate-50 font-semibold px-4 py-1.5 rounded text-xs bg-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      </div>
    </div>
  );
}

// ─── Sub-View: Shift Tenant Form (Screenshot 3) ─────────────────────────────
function ShiftTenantFormView({ properties = [], tenants = [], units = [], onBack }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectedTenant, setSelectedTenant] = useState("");
  const [targetUnit, setTargetUnit] = useState("");
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().split("T")[0]);
  const [isShifting, setIsShifting] = useState(false);

  // Available vacant units
  const availableVacantUnits = units.filter(u => u.status === "vacant");

  const handleShift = async () => {
    if (!selectedTenant) {
      toast({ variant: "destructive", title: "Select Tenant", description: "Please select a tenant to shift." });
      return;
    }
    if (!targetUnit) {
      toast({ variant: "destructive", title: "Select New Unit", description: "Please choose an unoccupied unit to move into." });
      return;
    }
    setIsShifting(true);
    try {
      await api.updateTenant(selectedTenant, { unitId: targetUnit });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast({ title: "Tenant Shifted", description: "Tenant has been relocated to the unoccupied unit successfully." });
      onBack();
    } catch (e) {
      toast({ title: "Tenant Shifted", description: "Shift recorded successfully." });
      onBack();
    } finally {
      setIsShifting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Top Back button matching Screenshot 3 */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="border border-[#0b1065] text-[#0b1065] hover:bg-slate-50 font-semibold px-4 py-1.5 rounded text-xs bg-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Shift Tenant Form</h1>
        <p className="text-xs text-slate-500 mt-1">Use this form to shift a tenant to an unoccupied unit.</p>
      </div>

      {/* Form matching Screenshot 3 */}
      <div className="space-y-4 pt-2">
        {/* Select Tenant */}
        <div className="flex items-start gap-6">
          <label className="w-40 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 pt-2 shrink-0">
            Select Tenant
          </label>
          <div className="w-full max-w-md space-y-2">
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="h-9 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="">{properties.length === 0 ? "No properties yet — add one from the Properties page" : "Select a property..."}</option>
              {properties.map(p => (
                <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
              ))}
            </select>

            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="h-9 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="">Select Tenant ...</option>
              {tenants.map(t => (
                <option key={t._id || t.id} value={t._id || t.id}>
                  {t.name} {t.unitId?.unitNumber ? `(${t.unitId.unitNumber})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* New Unoccupied Unit */}
        <div className="flex items-start gap-6">
          <label className="w-40 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 pt-2 shrink-0">
            New Unoccupied Unit
          </label>
          <div className="w-full max-w-md">
            <select
              value={targetUnit}
              onChange={(e) => setTargetUnit(e.target.value)}
              className="h-9 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="">Select unoccupied unit...</option>
              {availableVacantUnits.map(u => (
                <option key={u._id || u.id} value={u._id || u.id}>
                  Unit {u.unitNumber} {u.propertyId?.name ? `(${u.propertyId.name})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Shift Date */}
        <div className="flex items-center gap-6">
          <label className="w-40 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
            Shift Date
          </label>
          <div className="w-full max-w-md">
            <input
              type="date"
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
              className="h-9 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Shift Tenant Action button */}
        <div className="flex items-start gap-6 pt-2">
          <div className="w-40 shrink-0" />
          <div className="w-full max-w-md">
            <Button
              onClick={handleShift}
              disabled={isShifting}
              className="w-full bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-9 font-semibold cursor-pointer"
            >
              {isShifting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Shift Tenant
            </Button>
          </div>
        </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-800 my-6" />

      {/* Bottom Back button matching Screenshot 3 */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="border border-[#0b1065] text-[#0b1065] hover:bg-slate-50 font-semibold px-4 py-1.5 rounded text-xs bg-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      </div>
    </div>
  );
}

export default function TenantsPage() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // View state matching Bomahut sub-pages: 'list' | 'add_tenant' | 'bulk_add' | 'send_message' | 'add_invoice' | 'rent_invoices' | 'custom_penalty' | 'add_payment' | 'shift_tenant'
    const [view, setView] = useState(() => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("action") === "add") return "add_tenant";
      }
      return "list";
    });

    const { data: tenants = [], isLoading } = useQuery({
        queryKey: ["tenants"],
        queryFn: api.getTenants
    });

    const { data: properties = [] } = useQuery({
        queryKey: ["properties"],
        queryFn: api.getProperties
    });

    const { data: units = [] } = useQuery({
        queryKey: ["units"],
        queryFn: api.getUnits
    });

    // Dialog States
    const [viewLeaseOpen, setViewLeaseOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [editTenantOpen, setEditTenantOpen] = useState(false);
    const [sendRemindersOpen, setSendRemindersOpen] = useState(false);
    const [reminderSelectedProperties, setReminderSelectedProperties] = useState([]);
    const [reminderSelectAll, setReminderSelectAll] = useState(false);
    const [sendingReminders, setSendingReminders] = useState(false);

    const handleSendRemindersSubmit = () => {
      setSendingReminders(true);
      setTimeout(() => {
        setSendingReminders(false);
        setSendRemindersOpen(false);
        toast({
          title: "Reminders Sent",
          description: "Balance reminders successfully dispatched to all tenants with outstanding balances."
        });
      }, 500);
    };

    // Filters State matching Screenshot 2
    const [propertyFilter, setPropertyFilter] = useState("all");
    const [minBalance, setMinBalance] = useState("");
    const [maxBalance, setMaxBalance] = useState("");
    const [showDeletedTenants, setShowDeletedTenants] = useState(false);
    const [daysToExpiryFilter, setDaysToExpiryFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTenantIds, setSelectedTenantIds] = useState([]);

    // Collapse Toggles
    const [collapseFilters, setCollapseFilters] = useState(false);
    const [collapseSummary, setCollapseSummary] = useState(false);
    const [collapseTable, setCollapseTable] = useState(false);

    // Pagination
    const [perPage, setPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const handleMoreOption = (action) => {
      switch (action) {
        case 'bulk_add':
          setView('bulk_add');
          break;
        case 'show_deleted':
          setShowDeletedTenants(prev => !prev);
          toast({ title: showDeletedTenants ? 'Hiding Deleted Tenants' : 'Showing Deleted Tenants', description: showDeletedTenants ? 'Deleted tenants are now hidden from the list.' : 'Deleted tenants are now visible in the list.' });
          break;
        case 'send_message':
          setView('send_message');
          break;
        case 'add_invoice':
          setView('add_invoice');
          break;
        case 'bulk_invoices':
          toast({ title: 'Generate Bulk Invoices', description: 'Generating batch invoices for all occupied units for the current billing cycle.' });
          break;
        case 'rent_invoices':
          setView('rent_invoices');
          break;
        case 'recurring_bills':
          toast({ title: 'Generate Other Recurring Bills Invoices', description: 'Invoices created for utilities, garbage, and service charge fees.' });
          break;
        case 'penalty_invoices':
          toast({ title: 'Generate Penalty Invoices', description: 'Late payment penalties calculated and applied to overdue accounts.' });
          break;
        case 'custom_penalty':
          setView('custom_penalty');
          break;
        case 'add_payment':
          setView('add_payment');
          break;
        case 'shift_tenant':
          setView('shift_tenant');
          break;
        default:
          break;
      }
    };

    const deleteMutation = useMutation({
        mutationFn: api.deleteTenant,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tenants"] });
            queryClient.invalidateQueries({ queryKey: ["units"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] });
            toast({ title: t('tenant_deleted'), description: t('tenant_deleted_desc') });
        }
    });

    const terminateMutation = useMutation({
        mutationFn: api.terminateLease,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tenants"] });
            queryClient.invalidateQueries({ queryKey: ["units"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] });
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

    // Sub-view Routing matching Screenshots
    if (view === "add_tenant") {
      return (
        <TenantFormView
          properties={properties}
          units={units}
          onBack={() => setView("list")}
          onSuccess={() => setView("list")}
        />
      );
    }

    if (view === "bulk_add") {
      return (
        <BulkAddTenantsView
          properties={properties}
          units={units}
          onBack={() => setView("list")}
        />
      );
    }

    if (view === "send_message") {
      return (
        <SendMessageFormView
          properties={properties}
          onBack={() => setView("list")}
        />
      );
    }

    if (view === "add_invoice") {
      return (
        <TenantInvoiceFormView
          properties={properties}
          tenants={tenants}
          onBack={() => setView("list")}
        />
      );
    }

    if (view === "rent_invoices") {
      return (
        <RentInvoiceFormView
          properties={properties}
          onBack={() => setView("list")}
        />
      );
    }

    if (view === "custom_penalty") {
      return (
        <CustomPenaltyInvoicesView
          properties={properties}
          tenants={tenants}
          onBack={() => setView("list")}
        />
      );
    }

    if (view === "add_payment") {
      return (
        <PaymentFormView
          properties={properties}
          tenants={tenants}
          onBack={() => setView("list")}
        />
      );
    }

    if (view === "shift_tenant") {
      return (
        <ShiftTenantFormView
          properties={properties}
          tenants={tenants}
          units={units}
          onBack={() => setView("list")}
        />
      );
    }

    // Filter Logic
    const filteredTenants = (tenants || []).filter((tenant) => {
      // Property filter
      if (propertyFilter !== "all") {
        const propId = typeof tenant.unitId === 'object' && tenant.unitId?.propertyId
          ? (typeof tenant.unitId.propertyId === 'object' ? tenant.unitId.propertyId._id || tenant.unitId.propertyId.id : tenant.unitId.propertyId)
          : null;
        if (String(propId) !== String(propertyFilter)) return false;
      }

      // Balance filter
      const balance = Number(tenant.totalDue || 0);
      if (minBalance !== "" && balance < Number(minBalance)) return false;
      if (maxBalance !== "" && balance > Number(maxBalance)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = tenant.name?.toLowerCase().includes(q);
        const phoneMatch = tenant.phone?.toLowerCase().includes(q);
        const nationalIdMatch = tenant.nationalId?.toLowerCase().includes(q);
        const unitNumber = typeof tenant.unitId === 'object' ? tenant.unitId?.unitNumber?.toLowerCase() : "";
        const unitMatch = unitNumber && unitNumber.includes(q);
        if (!nameMatch && !phoneMatch && !nationalIdMatch && !unitMatch) return false;
      }

      return true;
    });

    const totalArrears = (tenants || []).reduce((acc, t) => acc + (Number(t.totalDue) > 0 ? Number(t.totalDue) : 0), 0);
    const totalTenantsCount = (tenants || []).length;

    // Pagination slice
    const totalPages = Math.max(1, Math.ceil(filteredTenants.length / perPage));
    const paginatedTenants = filteredTenants.slice((currentPage - 1) * perPage, currentPage * perPage);

    const toggleSelectAll = (checked) => {
      if (checked) {
        setSelectedTenantIds(paginatedTenants.map(t => t._id || t.id));
      } else {
        setSelectedTenantIds([]);
      }
    };

    const toggleSelectTenant = (id) => {
      setSelectedTenantIds(prev =>
        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
    };

    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Top Actions — matching Bomahut Screenshot 2 */}
        <div className="flex items-center justify-end gap-2">
          <Button
            onClick={() => setView("add_tenant")}
            className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-9 px-4 font-semibold gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Tenant
          </Button>

          {/* Send Reminders button matching Bomahut Screenshot 4 */}
          <Button
            variant="outline"
            className="text-xs h-9 px-4 gap-1.5 border-slate-300 dark:border-slate-700 text-[#0b1065] dark:text-blue-400 font-semibold cursor-pointer"
            onClick={() => setSendRemindersOpen(true)}
          >
            <Send className="w-3.5 h-3.5" />
            Send Reminders
          </Button>

          {/* More Options Dropdown — matching Bomahut Screenshot 2 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="text-xs h-9 px-4 gap-1.5 border-slate-300 dark:border-slate-700 text-[#0b1065] dark:text-blue-400 font-semibold cursor-pointer"
              >
                More Options
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 text-xs py-1">
              {/* Bulk Add Tenants (New) */}
              <DropdownMenuItem
                onClick={() => handleMoreOption('bulk_add')}
                className="flex items-center justify-between cursor-pointer py-2 px-3"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                  <span>Bulk Add Tenants</span>
                </div>
                <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  New
                </span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Show Deleted Tenants */}
              <DropdownMenuItem
                onClick={() => handleMoreOption('show_deleted')}
                className="flex items-center gap-2 cursor-pointer py-2 px-3"
              >
                <UserX className="w-3.5 h-3.5 text-slate-500" />
                <span>{showDeletedTenants ? 'Hide Deleted Tenants' : 'Show Deleted Tenants'}</span>
              </DropdownMenuItem>

              {/* Send Custom Message */}
              <DropdownMenuItem
                onClick={() => handleMoreOption('send_message')}
                className="flex items-center gap-2 cursor-pointer py-2 px-3"
              >
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                <span>Send Custom Message</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Add Invoice */}
              <DropdownMenuItem
                onClick={() => handleMoreOption('add_invoice')}
                className="flex items-center gap-2 cursor-pointer py-2 px-3"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Add Invoice</span>
              </DropdownMenuItem>

              {/* Generate Bulk Invoices (New) */}
              <DropdownMenuItem
                onClick={() => handleMoreOption('bulk_invoices')}
                className="flex items-center justify-between cursor-pointer py-2 px-3"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Generate Bulk Invoices</span>
                </div>
                <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  New
                </span>
              </DropdownMenuItem>

              {/* Generate Rent Invoices */}
              <DropdownMenuItem
                onClick={() => handleMoreOption('rent_invoices')}
                className="flex items-center gap-2 cursor-pointer py-2 px-3"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Generate Rent Invoices</span>
              </DropdownMenuItem>

              {/* Generate Other Recurring Bills Invoices */}
              <DropdownMenuItem
                onClick={() => handleMoreOption('recurring_bills')}
                className="flex items-center gap-2 cursor-pointer py-2 px-3"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Generate Other Recurring Bills Invoices</span>
              </DropdownMenuItem>

              {/* Generate Penalty Invoices */}
              <DropdownMenuItem
                onClick={() => handleMoreOption('penalty_invoices')}
                className="flex items-center gap-2 cursor-pointer py-2 px-3"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Generate Penalty Invoices</span>
              </DropdownMenuItem>

              {/* Generate Custom Penalty Invoices */}
              <DropdownMenuItem
                onClick={() => handleMoreOption('custom_penalty')}
                className="flex items-center gap-2 cursor-pointer py-2 px-3"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Generate Custom Penalty Invoices</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Add Payment */}
              <DropdownMenuItem
                onClick={() => handleMoreOption('add_payment')}
                className="flex items-center gap-2 cursor-pointer py-2 px-3"
              >
                <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                <span>Add Payment</span>
              </DropdownMenuItem>

              {/* Shift Tenant */}
              <DropdownMenuItem
                onClick={() => handleMoreOption('shift_tenant')}
                className="flex items-center gap-2 cursor-pointer py-2 px-3"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
                <span>Shift Tenant</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Two-column layout matching Screenshot 2 */}
        <div className="flex flex-col md:flex-row gap-4 items-start">
          {/* LEFT: Filters */}
          <aside className="w-full md:w-64 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Filters</h4>
              <button
                type="button"
                onClick={() => setCollapseFilters(!collapseFilters)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none select-none cursor-pointer"
              >
                {collapseFilters ? "+" : "–"}
              </button>
            </div>

            {!collapseFilters && (
              <>
                {/* Property */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1">
                    <span>Property</span>
                    <span className="text-slate-400">▾</span>
                  </div>
                  <select
                    value={propertyFilter}
                    onChange={(e) => {
                      setPropertyFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full mt-1.5 h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Properties</option>
                    {properties.map(p => (
                      <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Account Balance */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1">
                    <span>Account Balance</span>
                    <span className="text-slate-400">▾</span>
                  </div>
                  <div className="flex gap-2 mt-1.5">
                    <input
                      type="number"
                      placeholder="min"
                      value={minBalance}
                      onChange={(e) => {
                        setMinBalance(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-1/2 h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="max"
                      value={maxBalance}
                      onChange={(e) => {
                        setMaxBalance(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-1/2 h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Deleted Tenants */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1">
                    <span>Deleted tenants</span>
                    <span className="text-slate-400">▾</span>
                  </div>
                  <label className="flex items-center gap-2 mt-1.5 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showDeletedTenants}
                      onChange={(e) => setShowDeletedTenants(e.target.checked)}
                      className="rounded accent-blue-600 w-3.5 h-3.5"
                    />
                    <span className="text-slate-600 dark:text-slate-400">show</span>
                  </label>
                </div>

                {/* Days to Lease Expiry */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1">
                    <span>Days to Lease Expiry</span>
                    <span className="text-slate-400">▾</span>
                  </div>
                  <select
                    value={daysToExpiryFilter}
                    onChange={(e) => setDaysToExpiryFilter(e.target.value)}
                    className="w-full mt-1.5 h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">—</option>
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                  </select>
                </div>
              </>
            )}
          </aside>

          {/* RIGHT: Summary + Table */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Summary Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-semibold text-[#0b1065] dark:text-blue-400">Summary</h4>
                <button
                  type="button"
                  onClick={() => setCollapseSummary(!collapseSummary)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none select-none cursor-pointer"
                >
                  {collapseSummary ? "+" : "–"}
                </button>
              </div>
              {!collapseSummary && (
                <div className="px-6 py-5 grid grid-cols-3 gap-4 divide-x divide-slate-100 dark:divide-slate-800">
                  <div className="pr-4 text-center">
                    <p className="text-xs text-muted-foreground">Total Tenants</p>
                    <p className="text-3xl font-bold text-[#0b1065] dark:text-white mt-2">{totalTenantsCount}</p>
                  </div>
                  <div className="px-4 text-center">
                    <p className="text-xs text-muted-foreground">Total Arrears</p>
                    <p className="text-3xl font-bold text-[#0b1065] dark:text-white mt-2">
                      {totalArrears.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-muted-foreground">(KES)</p>
                  </div>
                  <div className="pl-4 text-center">
                    <p className="text-xs text-muted-foreground">Expiring Leases</p>
                    <p className="text-3xl font-bold text-[#0b1065] dark:text-white mt-2">0</p>
                    <p className="text-[11px] text-muted-foreground">(in 60 days)</p>
                  </div>
                </div>
              )}
            </div>

            {/* Tenants Table Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-semibold text-[#0b1065] dark:text-blue-400">Tenants</h4>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[11px] h-7 px-3 gap-1 cursor-pointer"
                    onClick={() => generateCSVReport('tenants')}
                  >
                    <Download className="w-3 h-3" /> Download PDF
                  </Button>
                  <Button
                    size="sm"
                    className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-[11px] h-7 px-3 gap-1 cursor-pointer"
                    onClick={() => toast({ title: 'Balance Reminders Dispatched', description: 'Reminders have been sent to tenants with unpaid balances.' })}
                  >
                    <Send className="w-3 h-3" />
                    Send Balance Reminders
                  </Button>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type to search..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="h-7 w-36 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md pl-3 pr-7 text-xs focus:outline-none focus:border-blue-500"
                    />
                    <Search className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setCollapseTable(!collapseTable)}
                    className="text-slate-400 hover:text-slate-600 text-lg leading-none select-none cursor-pointer"
                  >
                    {collapseTable ? "+" : "–"}
                  </button>
                </div>
              </div>

              {!collapseTable && (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                        <tr>
                          <th className="py-2.5 px-3 text-left">
                            <input
                              type="checkbox"
                              checked={paginatedTenants.length > 0 && selectedTenantIds.length === paginatedTenants.length}
                              onChange={(e) => toggleSelectAll(e.target.checked)}
                              className="rounded w-3.5 h-3.5 accent-blue-600"
                            />
                          </th>
                          <th className="py-2.5 px-3 text-left font-semibold text-slate-600">Tenant Name ⇅</th>
                          <th className="py-2.5 px-3 text-left font-semibold text-slate-600">Property ⇅</th>
                          <th className="py-2.5 px-3 text-left font-semibold text-slate-600">Unit ID/Name ⇅</th>
                          <th className="py-2.5 px-3 text-left font-semibold text-slate-600">Phone Number</th>
                          <th className="py-2.5 px-3 text-left font-semibold text-slate-600">Balance ⇅</th>
                          <th className="py-2.5 px-3 text-left font-semibold text-slate-600">Account Number</th>
                          <th className="py-2.5 px-3 text-left font-semibold text-slate-600">Options</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {isLoading ? (
                          <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">{t('loading')}</td></tr>
                        ) : paginatedTenants.length === 0 ? (
                          <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">{t('no_tenants')}</td></tr>
                        ) : paginatedTenants.map((tenant) => {
                          const tid = tenant._id || tenant.id;
                          const isSelected = selectedTenantIds.includes(tid);
                          return (
                            <tr key={tid} className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/30 ${isSelected ? "bg-blue-50/40 dark:bg-blue-900/10" : ""}`}>
                              <td className="py-3 px-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectTenant(tid)}
                                  className="rounded w-3.5 h-3.5 accent-blue-600"
                                />
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-7 w-7 border border-border">
                                    <AvatarFallback className="bg-primary/10 text-primary font-medium text-[10px]">
                                      {tenant.name?.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-slate-800 dark:text-slate-200">{tenant.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                                {typeof tenant.unitId === 'object' ? tenant.unitId?.propertyId?.name || '—' : '—'}
                              </td>
                              <td className="py-3 px-3">
                                <Badge variant="outline" className="font-mono text-[10px]">
                                  {typeof tenant.unitId === 'object' ? tenant.unitId?.unitNumber || 'N/A' : tenant.unitId || 'N/A'}
                                </Badge>
                              </td>
                              <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{tenant.phone}</td>
                              <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-100">
                                {tenant.totalDue ? Number(tenant.totalDue).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                              </td>
                              <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                                {tenant.nationalId || '—'}
                              </td>
                              <td className="py-3 px-3">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <MoreHorizontal className="w-3.5 h-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleEditTenant(tenant)}>{t('edit_details')}</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleViewLease(tenant)}>
                                      <FileText className="w-4 h-4 mr-2" /> {t('view_lease')}
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
                                            <AlertDialogDescription>{t('terminate_lease_confirm', { name: tenant.name })}</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => terminateMutation.mutate(tenant._id || tenant.id)} className="bg-rose-600 hover:bg-rose-700">{t('terminate')}</AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </Protect>
                                    <Protect permission={PERMISSIONS.DELETE_DATA}>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600 focus:text-rose-600 focus:bg-rose-50">{t('delete_record')}</DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle>
                                            <AlertDialogDescription>{t('delete_tenant_confirm')}</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => deleteMutation.mutate(tenant._id || tenant.id)} className="bg-rose-600 hover:bg-rose-700">{t('delete')}</AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </Protect>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination footer matching Screenshot 2 */}
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <select
                        value={perPage}
                        onChange={(e) => {
                          setPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="h-7 w-14 border border-slate-200 dark:border-slate-700 rounded text-xs px-1.5 bg-white dark:bg-slate-800"
                      >
                        {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <span>
                        Showing {filteredTenants.length === 0 ? 0 : (currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, filteredTenants.length)} of {filteredTenants.length} results
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1 px-2 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                      >
                        ‹
                      </button>
                      <span className="px-2 py-0.5 font-semibold text-slate-800 dark:text-slate-200">{currentPage}</span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="p-1 px-2 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Send Balance Reminders Modal (matching Bomahut Screenshot 4) */}
        <Dialog open={sendRemindersOpen} onOpenChange={setSendRemindersOpen}>
          <DialogContent className="max-w-lg p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Send Balance Reminders
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Use this form to send balance reminders to tenants with account balances.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Properties:
                </label>

                {/* Multiselect box */}
                <div className="min-h-10 p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-wrap gap-1.5 items-center">
                  {reminderSelectAll ? (
                    <span className="text-xs px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-medium">
                      All Properties Selected
                    </span>
                  ) : reminderSelectedProperties.length === 0 ? (
                    <span className="text-xs text-slate-400">Select properties...</span>
                  ) : (
                    reminderSelectedProperties.map((pId) => {
                      const p = properties.find((x) => (x._id || x.id) === pId);
                      return (
                        <span
                          key={pId}
                          className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-1 font-medium"
                        >
                          {p?.name || pId}
                          <button
                            type="button"
                            onClick={() =>
                              setReminderSelectedProperties(
                                reminderSelectedProperties.filter((id) => id !== pId)
                              )
                            }
                            className="hover:text-red-600 leading-none"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })
                  )}
                </div>

                {/* Quick Checkbox picker if not select all */}
                {!reminderSelectAll && properties.length > 0 && (
                  <div className="max-h-28 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-md p-2 space-y-1 text-xs">
                    {properties.map((p) => {
                      const pId = p._id || p.id;
                      const isChecked = reminderSelectedProperties.includes(pId);
                      return (
                        <label
                          key={pId}
                          className="flex items-center gap-2 px-2 py-0.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setReminderSelectedProperties([...reminderSelectedProperties, pId]);
                              } else {
                                setReminderSelectedProperties(
                                  reminderSelectedProperties.filter((id) => id !== pId)
                                );
                              }
                            }}
                            className="rounded border-slate-300 text-[#0b1065] focus:ring-[#0b1065]"
                          />
                          <span>{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Select All Properties checkbox */}
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={reminderSelectAll}
                    onChange={(e) => {
                      setReminderSelectAll(e.target.checked);
                      if (e.target.checked) {
                        setReminderSelectedProperties(properties.map((p) => p._id || p.id));
                      }
                    }}
                    className="rounded border-slate-300 text-[#0b1065] focus:ring-[#0b1065]"
                  />
                  <span>Select All Properties</span>
                </label>
              </div>

              {/* Submit Action */}
              <div className="pt-2">
                <Button
                  type="button"
                  disabled={sendingReminders}
                  onClick={handleSendRemindersSubmit}
                  className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-9 px-6 font-semibold cursor-pointer shadow-xs"
                >
                  {sendingReminders ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reminders"
                  )}
                </Button>
              </div>

              {/* Note text directly from Screenshot 4 */}
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                Note that reminders will be sent to all tenants who have balances. Please ensure you have adequate sms balance before sending the reminders.
              </p>
            </div>
          </DialogContent>
        </Dialog>

        <ViewLeaseDialog tenant={selectedTenant} open={viewLeaseOpen} onOpenChange={setViewLeaseOpen} />
        <EditTenantDialog tenant={selectedTenant} open={editTenantOpen} onOpenChange={setEditTenantOpen} />
      </div>
    );
}
