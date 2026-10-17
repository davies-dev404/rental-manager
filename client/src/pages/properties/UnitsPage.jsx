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

function AddUnitDialog({ properties, open, onOpenChange }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [propertyId, setPropertyId] = useState('');
  const form = useForm({ resolver: zodResolver(unitSchema), defaultValues: { unitNumber: '', type: 'Apartment', rentAmount: '' } });
  const mutation = useMutation({
    mutationFn: api.addUnit,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['properties'] }); queryClient.invalidateQueries({ queryKey: ['stats'] }); onOpenChange(false); form.reset(); toast({ title: 'Unit Added' }); },
    onError: () => toast({ variant: 'destructive', title: 'Error', description: 'Failed to add unit.' }),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Unit</DialogTitle><DialogDescription>Add a new unit to a property.</DialogDescription></DialogHeader>
        <div className="mb-3">
          <Label className="text-xs mb-1.5 block">Property</Label>
          <Select value={propertyId} onValueChange={setPropertyId}>
            <SelectTrigger><SelectValue placeholder="Select a property" /></SelectTrigger>
            <SelectContent>{properties.map(p => <SelectItem key={p._id || p.id} value={p._id || p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(v => mutation.mutate({ ...v, propertyId, status: 'vacant', bedrooms: '1', bathrooms: '1' }))} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="unitNumber" render={({ field }) => (<FormItem><FormLabel className="text-xs">Unit No.</FormLabel><FormControl><Input placeholder="A1" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem><FormLabel className="text-xs">Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="Apartment">Apartment</SelectItem><SelectItem value="Bedsitter">Bedsitter</SelectItem><SelectItem value="Studio">Studio</SelectItem><SelectItem value="Shop">Shop</SelectItem><SelectItem value="Office">Office</SelectItem></SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="rentAmount" render={({ field }) => (<FormItem><FormLabel className="text-xs">Rent (KES)</FormLabel><FormControl><Input type="number" placeholder="25000" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <DialogFooter><Button type="submit" disabled={mutation.isPending || !propertyId}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Unit</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
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
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [showVacantOnly, setShowVacantOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [collapsePropertyFilter, setCollapsePropertyFilter] = useState(false);
  const [collapseSummary, setCollapseSummary] = useState(false);
  const [collapseUnits, setCollapseUnits] = useState(false);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadPropId, setDownloadPropId] = useState('all');
  const { data: properties = [], isLoading } = useQuery({ queryKey: ['properties'], queryFn: api.getProperties });
  const allUnits = properties.flatMap(prop => (prop.units || []).map((u, idx) => ({
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
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <AddUnitDialog properties={properties} open={addUnitOpen} onOpenChange={setAddUnitOpen} />
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
        <Button onClick={() => setAddUnitOpen(true)} className="bg-[#0b1065] hover:bg-[#0c0e52] text-white text-xs h-8 px-4 font-semibold shadow-sm"><Plus className="w-3.5 h-3.5 mr-1.5" />Add Unit</Button>
        <Button onClick={() => setBulkAddOpen(true)} variant="outline" className="border-[#0b1065] text-[#0b1065] hover:bg-[#0b1065]/5 text-xs h-8 px-4 font-semibold bg-white dark:bg-slate-900">Bulk Add Units</Button>
        <Button onClick={() => setDownloadOpen(true)} variant="outline" className="border-[#0b1065] text-[#0b1065] hover:bg-[#0b1065]/5 text-xs h-8 px-4 font-semibold bg-white dark:bg-slate-900"><Download className="w-3.5 h-3.5 mr-1.5" />Rent Schedule</Button>
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
