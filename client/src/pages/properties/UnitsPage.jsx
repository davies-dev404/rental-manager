import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { usePreferences } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Trash2, UserCheck, Download, Plus, Loader2, Building2, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const unitSchema = z.object({
  unitNumber: z.string().min(1, 'Unit Number is required'),
  type: z.string().min(1, 'Type is required'),
  rentAmount: z.string().min(1, 'Rent is required'),
});

// ─── Unit Form View (MakaziFlow Layout) ───────────────────────────────────────
function UnitFormView({ properties, onBack, onSuccess }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Form states
  const [propertyId, setPropertyId] = useState('');
  const [unitName, setUnitName] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [recurringBills, setRecurringBills] = useState([]);
  const [newBillType, setNewBillType] = useState('');
  const [newBillAmount, setNewBillAmount] = useState('');
  const [notes, setNotes] = useState('');

  const handleAddRecurringBill = () => {
    if (!newBillType || !newBillAmount) return;
    setRecurringBills([...recurringBills, { type: newBillType, amount: newBillAmount }]);
    setNewBillType('');
    setNewBillAmount('');
  };

  const handleRemoveRecurringBill = (index) => {
    setRecurringBills(recurringBills.filter((_, i) => i !== index));
  };

  const handleClear = () => {
    setPropertyId('');
    setUnitName('');
    setRentAmount('');
    setTaxRate('');
    setRecurringBills([]);
    setNewBillType('');
    setNewBillAmount('');
    setNotes('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!propertyId && properties.length > 0) {
      toast({ variant: 'destructive', title: 'Property Required', description: 'Please select a property.' });
      return;
    }
    if (!unitName.trim()) {
      toast({ variant: 'destructive', title: 'Unit ID / Name Required', description: 'Please enter a unit name or number.' });
      return;
    }
    if (!rentAmount) {
      toast({ variant: 'destructive', title: 'Rent Amount Required', description: 'Please enter monthly rent.' });
      return;
    }

    setLoading(true);
    try {
      await api.addUnit({
        propertyId,
        unitNumber: unitName,
        rentAmount,
        type: 'Apartment',
        status: 'vacant',
        bedrooms: '1',
        bathrooms: '1',
        taxRate: taxRate || '7.5',
        notes,
        recurringBills
      });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast({ title: 'Unit Added', description: `Unit ${unitName} added successfully.` });
      if (onSuccess) onSuccess();
      onBack();
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add unit.' });
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
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Unit Form</h2>
      </div>

      {/* Form Card (matching Screenshot 1) */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-10 shadow-xs space-y-5 text-xs"
      >
        {/* Row 1: Select Property */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 shrink-0">
            Select Property
          </label>
          <div className="flex-1 max-w-lg">
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            >
              <option value="">
                {properties.length === 0
                  ? 'No properties yet \u2014 add one from the Properties page'
                  : 'Select Property'}
              </option>
              {properties.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Unit ID/Name */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 shrink-0">
            Unit ID/Name
          </label>
          <div className="flex-1 max-w-lg">
            <input
              type="text"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              placeholder="Unit ID/Name ..."
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            />
          </div>
        </div>

        {/* Row 3: Rent Amount */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 shrink-0">
            Rent Amount
          </label>
          <div className="flex-1 max-w-lg">
            <input
              type="number"
              value={rentAmount}
              onChange={(e) => setRentAmount(e.target.value)}
              placeholder="rent amount ..."
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            />
          </div>
        </div>

        {/* Row 4: Tax Rate % (optional) */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
          <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 pt-2 shrink-0">
            Tax Rate % (optional)
          </label>
          <div className="flex-1 max-w-lg">
            <input
              type="number"
              step="0.1"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              placeholder="tax rate ..."
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Residential units tax rate is usually 7.5%. Commercial units tax rate is usually 16%.
            </p>
          </div>
        </div>

        {/* Row 5: Other Recurring Bills (optional) */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
          <label className="sm:w-52 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 pt-2 shrink-0 flex items-center justify-end gap-1">
            <span>Other Recurring Bills</span>
            <span className="w-3.5 h-3.5 rounded-full border border-slate-400 text-[10px] flex items-center justify-center font-bold text-slate-500">i</span>
            <span className="text-slate-500">(optional)</span>
          </label>
          <div className="flex-1 max-w-lg space-y-2">
            <div className="space-y-2">
              <select
                value={newBillType}
                onChange={(e) => setNewBillType(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
              >
                <option value="">Select bill type</option>
                <option value="Garbage">Garbage Collection</option>
                <option value="Security">Security / Watchman</option>
                <option value="Service Charge">Service Charge</option>
                <option value="Water Fixed">Water (Fixed Fee)</option>
                <option value="WiFi">Internet / WiFi</option>
                <option value="Parking">Parking Fee</option>
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={newBillAmount}
                  onChange={(e) => setNewBillAmount(e.target.value)}
                  placeholder="amount"
                  className="flex-1 h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                />
                <button
                  type="button"
                  onClick={handleAddRecurringBill}
                  className="h-9 w-9 flex items-center justify-center border border-slate-300 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-base font-medium cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {recurringBills.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {recurringBills.map((b, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 text-xs">
                    <span>{b.type}: <strong>KES {Number(b.amount).toLocaleString()}</strong></span>
                    <button type="button" onClick={() => handleRemoveRecurringBill(idx)} className="text-rose-500 hover:underline">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 6: Notes (optional) */}
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

        {/* Submit Actions */}
        <div className="pt-4 space-y-2 max-w-lg mx-auto sm:ml-58">
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-semibold h-9 rounded-md shadow-xs transition cursor-pointer"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            + Add Unit
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

function BulkAddUnitsDialog({ properties, open, onOpenChange }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [propertyId, setPropertyId] = useState('');
  const [prefix, setPrefix] = useState('');
  const [startNumber, setStartNumber] = useState('1');
  const [count, setCount] = useState('10');
  const [type, setType] = useState('Apartment');
  const [rentAmount, setRentAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const n = Math.min(parseInt(count) || 0, 100);
  const start = parseInt(startNumber) || 1;
  const preview = Array.from({ length: n }, (_, i) => prefix + (start + i));
  const handleBulkAdd = async () => {
    if (!propertyId) { toast({ variant: 'destructive', title: 'Select a property first' }); return; }
    if (!rentAmount) { toast({ variant: 'destructive', title: 'Enter rent amount' }); return; }
    if (preview.length === 0) { toast({ variant: 'destructive', title: 'Set unit count > 0' }); return; }
    setLoading(true);
    try {
      for (const unitNumber of preview) {
        await api.addUnit({ unitNumber, type, rentAmount, propertyId, status: 'vacant', bedrooms: '1', bathrooms: '1' });
      }
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast({ title: 'Bulk Units Added', description: preview.length + ' units added successfully.' });
      onOpenChange(false);
    } catch { toast({ variant: 'destructive', title: 'Error', description: 'Failed to add some units.' }); }
    setLoading(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Bulk Add Units</DialogTitle><DialogDescription>Generate multiple units at once for a property.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div><Label className="text-xs mb-1.5 block">Property</Label>
            <Select value={propertyId} onValueChange={setPropertyId}><SelectTrigger><SelectValue placeholder="Select a property" /></SelectTrigger>
              <SelectContent>{properties.map(p => <SelectItem key={p._id || p.id} value={p._id || p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs mb-1.5 block">Unit Prefix</Label><Input placeholder="A, B, F..." value={prefix} onChange={e => setPrefix(e.target.value)} /></div>
            <div><Label className="text-xs mb-1.5 block">Start Number</Label><Input type="number" min="1" value={startNumber} onChange={e => setStartNumber(e.target.value)} /></div>
            <div><Label className="text-xs mb-1.5 block">Count (max 100)</Label><Input type="number" min="1" max="100" value={count} onChange={e => setCount(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs mb-1.5 block">Type</Label>
              <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Apartment">Apartment</SelectItem><SelectItem value="Bedsitter">Bedsitter</SelectItem><SelectItem value="Studio">Studio</SelectItem><SelectItem value="Shop">Shop</SelectItem><SelectItem value="Office">Office</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs mb-1.5 block">Rent (KES)</Label><Input type="number" placeholder="25000" value={rentAmount} onChange={e => setRentAmount(e.target.value)} /></div>
          </div>
          {preview.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Preview ({preview.length} units):</p>
              <div className="flex flex-wrap gap-1.5">
                {preview.slice(0, 30).map(u => <span key={u} className="px-2 py-0.5 bg-[#0b1065]/10 text-[#0b1065] dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs font-medium">{u}</span>)}
                {preview.length > 30 && <span className="text-xs text-slate-400">+{preview.length - 30} more...</span>}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleBulkAdd} disabled={loading} className="bg-[#0b1065] hover:bg-[#0c0e52] text-white">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</> : 'Add ' + preview.length + ' Units'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UnitsPage() {
  const { toast } = useToast();
  const [view, setView] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("action") === "add") return "add_unit";
    }
    return "list";
  }); // 'list' | 'add_unit'
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [showVacantOnly, setShowVacantOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [collapsePropertyFilter, setCollapsePropertyFilter] = useState(false);
  const [collapseSummary, setCollapseSummary] = useState(false);
  const [collapseUnits, setCollapseUnits] = useState(false);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadPropId, setDownloadPropId] = useState('all');
  const { data: properties = [], isLoading: isPropsLoading } = useQuery({ queryKey: ['properties'], queryFn: api.getProperties });
  const { data: rawUnits = [], isLoading: isUnitsLoading } = useQuery({ queryKey: ['units'], queryFn: () => api.getUnits() });
  const isLoading = isPropsLoading || isUnitsLoading;

  const allUnits = rawUnits.length > 0
    ? rawUnits.map((u, idx) => {
        const propObj = typeof u.propertyId === 'object' ? u.propertyId : properties.find(p => String(p._id || p.id) === String(u.propertyId));
        return {
          id: u._id || u.id || 'unit-' + idx,
          propertyName: propObj?.name || 'Unknown Property',
          propertyId: propObj?._id || propObj?.id || u.propertyId,
          unitName: u.unitNumber || u.name || 'Unit ' + (idx + 1),
          type: u.type || 'Apartment',
          status: u.status || 'vacant',
          occupied: u.status === 'occupied',
          rent: u.rentAmount || u.rent || 0,
        };
      })
    : properties.flatMap(prop => (prop.units || []).map((u, idx) => ({
        id: u._id || u.id || (prop._id || prop.id) + '-' + idx,
        propertyName: prop.name || 'Unknown',
        propertyId: prop._id || prop.id,
        unitName: u.unitNumber || u.name || 'Unit ' + (idx + 1),
        type: u.type || 'Apartment',
        status: u.status || 'vacant',
        occupied: u.status === 'occupied',
        rent: u.rentAmount || u.rent || 0,
      })));
  const totalUnits = allUnits.length;
  const totalVacancies = allUnits.filter(u => !u.occupied).length;
  const totalOccupied = totalUnits - totalVacancies;
  const filteredUnits = allUnits.filter(u => {
    if (selectedProperty !== 'all' && u.propertyId !== selectedProperty) return false;
    if (showVacantOnly && u.occupied) return false;
    if (search && !u.unitName.toLowerCase().includes(search.toLowerCase()) && !u.propertyName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredUnits.length / perPage));
  const paginated = filteredUnits.slice((currentPage - 1) * perPage, currentPage * perPage);
  const handleDownload = () => {
    const rows = downloadPropId === 'all' ? allUnits : allUnits.filter(u => u.propertyId === downloadPropId);
    if (!rows.length) { toast({ title: 'No units to export' }); return; }
    const csv = 'data:text/csv;charset=utf-8,' + ['Property,Unit,Type,Status,Rent (KES)'].concat(rows.map(u => '"' + u.propertyName + '","' + u.unitName + '","' + u.type + '","' + u.status + '",' + u.rent)).join('\n');
    const a = document.createElement('a'); a.href = encodeURI(csv); a.download = 'rent_schedule.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast({ title: 'Downloaded', description: rows.length + ' units exported.' }); setDownloadOpen(false);
  };

  if (view === 'add_unit') {
    return (
      <UnitFormView
        properties={properties}
        onBack={() => setView('list')}
        onSuccess={() => setView('list')}
      />
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <BulkAddUnitsDialog properties={properties} open={bulkAddOpen} onOpenChange={setBulkAddOpen} />
      <Dialog open={downloadOpen} onOpenChange={setDownloadOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Download Rent Schedule</DialogTitle><DialogDescription>Select property or download all.</DialogDescription></DialogHeader>
          <div className="py-3"><Label className="text-xs mb-1.5 block">Property</Label>
            <Select value={downloadPropId} onValueChange={setDownloadPropId}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Properties</SelectItem>{properties.map(p => <SelectItem key={p._id || p.id} value={p._id || p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDownloadOpen(false)}>Cancel</Button><Button onClick={handleDownload} className="bg-[#0b1065] hover:bg-[#0c0e52] text-white">Download CSV</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex items-center justify-end gap-2.5">
        <Button onClick={() => setView('add_unit')} className="bg-[#0b1065] hover:bg-[#0c0e52] text-white text-xs h-8 px-4 font-semibold shadow-sm"><Plus className="w-3.5 h-3.5 mr-1.5" />Add Unit</Button>
        <Button onClick={() => setBulkAddOpen(true)} className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-8 px-4 font-semibold shadow-sm">Bulk Add Units</Button>
        <Button onClick={() => setDownloadOpen(true)} className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-8 px-4 font-semibold shadow-sm"><Download className="w-3.5 h-3.5 mr-1.5" />Rent Schedule</Button>
      </div>
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <aside className="w-full md:w-64 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-[#0b1065] dark:text-blue-400">Filters</h4>
            <span className="w-5 h-0.5 bg-[#0b1065] rounded" />
          </div>
          <div>
            <button type="button" onClick={() => setCollapsePropertyFilter(!collapsePropertyFilter)} className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer">
              <span>Property / Unit</span>
              <ChevronDown className={'w-3.5 h-3.5 text-slate-400 transition-transform ' + (collapsePropertyFilter ? 'rotate-180' : '')} />
            </button>
            {!collapsePropertyFilter && (
              <div className="mt-2">
                <select value={selectedProperty} onChange={e => { setSelectedProperty(e.target.value); setCurrentPage(1); }} className="w-full h-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 text-xs focus:outline-none focus:border-blue-500">
                  <option value="all">{properties.length === 0 ? 'No properties yet' : 'All Properties'}</option>
                  {properties.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={showVacantOnly} onChange={e => setShowVacantOnly(e.target.checked)} className="rounded accent-blue-600 w-3.5 h-3.5" />
              <span>Show Vacant Units Only</span>
            </label>
          </div>
        </aside>
        <main className="flex-1 min-w-0 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer select-none" onClick={() => setCollapseSummary(v => !v)}>
              <h4 className="text-sm font-semibold text-[#0b1065] dark:text-blue-400">Summary</h4>
              {collapseSummary ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
            </div>
            {!collapseSummary && (
              <div className="p-6 grid grid-cols-3 text-center divide-x divide-slate-100 dark:divide-slate-800">
                <div><p className="text-xs text-slate-500">Total Units</p><h3 className="text-3xl font-bold text-[#0b1065] dark:text-white mt-2">{totalUnits}</h3></div>
                <div><p className="text-xs text-slate-500">Occupied</p><h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{totalOccupied}</h3></div>
                <div><p className="text-xs text-slate-500">Vacancies</p><h3 className="text-3xl font-bold text-amber-500 dark:text-amber-400 mt-2">{totalVacancies}</h3></div>
              </div>
            )}
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-[#0b1065] dark:text-blue-400">Units</h4>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input type="text" placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} className="h-7 w-40 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md pl-3 pr-7 text-xs focus:outline-none focus:border-blue-500" />
                  <Search className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                </div>
                <button onClick={() => setCollapseUnits(v => !v)} className="text-slate-400 hover:text-slate-600 p-0.5">{collapseUnits ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}</button>
              </div>
            </div>
            {!collapseUnits && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                      <tr>
                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Property</th>
                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Unit Name/ID</th>
                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Type</th>
                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Status</th>
                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Rent</th>
                        <th className="py-2.5 px-4 text-right font-semibold text-slate-600 dark:text-slate-400">Options</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {isLoading ? Array.from({ length: 4 }).map((_, i) => (<tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="py-3 px-4"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" /></td>)}</tr>))
                      : paginated.length === 0 ? (<tr><td colSpan={6} className="py-12 text-center text-muted-foreground italic text-xs">{search ? 'No units match your search.' : allUnits.length === 0 ? 'No units yet. Add a property and create units.' : 'No units match your filters.'}</td></tr>)
                      : paginated.map(unit => (
                        <tr key={unit.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">{unit.propertyName}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{unit.unitName}</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{unit.type}</td>
                          <td className="py-3 px-4">
                            <span className={'px-2 py-0.5 rounded-full text-[10px] font-medium ' + (unit.status === 'occupied' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : unit.status === 'maintenance' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>{unit.status}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">KES {Number(unit.rent || 0).toLocaleString()}</td>
                          <td className="py-3 px-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-6 w-6 p-0"><MoreHorizontal className="w-3.5 h-3.5" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem><Pencil className="w-3.5 h-3.5 mr-2" /> Edit Unit</DropdownMenuItem>
                                <DropdownMenuItem><UserCheck className="w-3.5 h-3.5 mr-2" /> Assign Tenant</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600"><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setCurrentPage(1); }} className="h-7 w-14 border border-slate-200 dark:border-slate-700 rounded text-xs px-1.5 bg-white dark:bg-slate-800">{[10,20,50].map(n => <option key={n} value={n}>{n}</option>)}</select>
                    <span>Showing {filteredUnits.length === 0 ? 0 : (currentPage-1)*perPage+1}-{Math.min(currentPage*perPage, filteredUnits.length)} of {filteredUnits.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-semibold">{currentPage}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
