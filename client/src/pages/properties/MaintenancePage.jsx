import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Plus, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Wrench,
  Trash2, MoreHorizontal, Pencil, Loader2, Search, CheckCircle2,
  Clock, AlertCircle, Filter, ArrowLeft, Upload, Check
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUS_COLORS = {
  open: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
  'in progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  closed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
};

// ─── Maintenance Form View (Bomahut Layout matching Screenshot 1) ─────────────
function MaintenanceFormView({ properties, onBack, onAdd }) {
  const { toast } = useToast();
  const [propertyId, setPropertyId] = useState('');
  const [unit, setUnit] = useState('');
  const [status, setStatus] = useState('open');
  const [category, setCategory] = useState('General');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [imageName, setImageName] = useState('');
  const [createExpense, setCreateExpense] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedProp = properties.find(p => (p._id || p.id) === propertyId);
  const propUnits = selectedProp?.units || [];

  const handleClear = () => {
    setPropertyId('');
    setUnit('');
    setStatus('open');
    setCategory('General');
    setSummary('');
    setDescription('');
    setImageName('');
    setCreateExpense(false);
    setExpenseAmount('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageName(file.name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!propertyId && properties.length > 0) {
      toast({ variant: 'destructive', title: 'Property Required', description: 'Please select a property.' });
      return;
    }
    if (!summary.trim()) {
      toast({ variant: 'destructive', title: 'Summary Required', description: 'Please enter a short summary of the issue.' });
      return;
    }

    setLoading(true);
    try {
      const newRequest = {
        id: Date.now(),
        propertyId,
        propertyName: selectedProp?.name || 'General Property',
        unit: unit || 'All Units',
        status,
        category,
        summary: summary.trim(),
        description: description.trim(),
        image: imageName,
        expense: createExpense && expenseAmount ? Number(expenseAmount) : 0,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      };

      // If createExpense is checked, also log an expense via API if supported
      if (createExpense && expenseAmount && Number(expenseAmount) > 0) {
        try {
          await api.addExpense({
            category: 'maintenance',
            amount: Number(expenseAmount),
            description: `Maintenance: ${summary.trim()} (${selectedProp?.name || ''} - ${unit || 'General'})`,
            date: new Date().toISOString(),
            propertyId: propertyId || undefined
          });
        } catch {
          // If offline or endpoint varies, expense is still saved on the maintenance ticket
        }
      }

      onAdd(newRequest);
      toast({ title: 'Maintenance Created', description: 'New maintenance record saved successfully.' });
      onBack();
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not create maintenance record.' });
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
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Maintenance Form</h2>
        <p className="text-xs text-slate-500 mt-0.5">Use this form to record repairs and maintenance on the properties.</p>
      </div>

      {/* Form Card (matching Bomahut Screenshot 1) */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-10 shadow-xs space-y-5">
        {/* Row 1: Select Property */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-48 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
            Select Property
          </label>
          <div className="flex-1 max-w-lg">
            <select
              value={propertyId}
              onChange={e => {
                setPropertyId(e.target.value);
                setUnit('');
              }}
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            >
              <option value="">
                {properties.length === 0
                  ? 'No properties yet — add one from the Properties page'
                  : 'Select Property'}
              </option>
              {properties.map(p => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Select Unit (optional) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-48 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
            Select Unit (optional)
          </label>
          <div className="flex-1 max-w-lg">
            <select
              value={unit}
              onChange={e => setUnit(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            >
              <option value="">Select Unit</option>
              {propUnits.map(u => (
                <option key={u._id || u.id} value={u.unitNumber || u.id}>
                  Unit {u.unitNumber || u.id}
                </option>
              ))}
              {propUnits.length === 0 && propertyId && (
                <option value="Common Area">Common Area</option>
              )}
            </select>
          </div>
        </div>

        {/* Row 3: Status */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-48 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
            Status
          </label>
          <div className="flex-1 max-w-lg">
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            >
              <option value="open">open</option>
              <option value="in progress">in progress</option>
              <option value="closed">closed</option>
            </select>
          </div>
        </div>

        {/* Row 4: Category */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-48 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
            Category
          </label>
          <div className="flex-1 max-w-lg">
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            >
              <option value="General">General</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Electrical">Electrical</option>
              <option value="Carpentry">Carpentry</option>
              <option value="Painting">Painting</option>
              <option value="Roofing">Roofing</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Security">Security</option>
              <option value="Masonry">Masonry</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Row 5: Short Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-48 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
            Short Summary
          </label>
          <div className="flex-1 max-w-lg">
            <Input
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Short summary of the problem"
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Row 6: Description (optional) */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
          <label className="sm:w-48 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 pt-2 shrink-0">
            Description (optional)
          </label>
          <div className="flex-1 max-w-lg">
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detailed description of the problem"
              rows={3}
              className="text-xs resize-y"
            />
          </div>
        </div>

        {/* Row 7: Image upload (optional) */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
          <label className="sm:w-48 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 pt-1.5 shrink-0">
            Image upload (optional)
          </label>
          <div className="flex-1 max-w-lg">
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-medium bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 cursor-pointer text-slate-700 dark:text-slate-200">
                Choose file
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-slate-500 truncate max-w-xs">
                {imageName || 'No file chosen'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Upload picture of maintenance problem</p>
          </div>
        </div>

        {/* Row 8: Create Expense Record Checkbox */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
          <div className="sm:w-48 shrink-0" />
          <div className="flex-1 max-w-lg space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createExpense}
                onChange={e => setCreateExpense(e.target.checked)}
                className="rounded accent-[#0b1065] w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Create Expense Record
              </span>
            </label>
            <p className="text-[11px] text-slate-400">
              If checked then an expense record will be created for this maintenance record.
            </p>

            {createExpense && (
              <div className="pt-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Expense Amount (KES)
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 3500"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value)}
                  className="h-8 text-xs max-w-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* Buttons (matching Screenshot 1) */}
        <div className="pt-4 max-w-lg mx-auto sm:ml-54 space-y-2.5">
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-9 font-medium shadow-xs cursor-pointer"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add
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

// ─── Edit Maintenance Dialog ──────────────────────────────────────────────────
function EditMaintenanceDialog({ request, open, onOpenChange, onSave }) {
  const { toast } = useToast();
  const [form, setForm] = useState(request || {});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (request) setForm(request);
  }, [request]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    onSave({
      ...form,
      expense: form.expense ? Number(form.expense) : 0
    });
    toast({ title: 'Request Updated', description: 'Maintenance ticket updated successfully.' });
    setLoading(false);
    onOpenChange(false);
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#0b1065] dark:text-blue-400 flex items-center gap-2">
            <Pencil className="w-4 h-4 text-blue-600" />
            Edit Maintenance Request
          </DialogTitle>
          <DialogDescription>
            Update ticket details, status, cost, or assigned technician.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
            <Label className="text-xs mb-1.5 block font-medium">Short Summary</Label>
            <Input
              value={form.summary || ''}
              onChange={e => set('summary', e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <Label className="text-xs mb-1.5 block font-medium">Description</Label>
            <Textarea
              value={form.description || ''}
              onChange={e => set('description', e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1.5 block font-medium">Status</Label>
              <Select value={form.status || 'open'} onValueChange={v => set('status', v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open" className="text-xs">open</SelectItem>
                  <SelectItem value="in progress" className="text-xs">in progress</SelectItem>
                  <SelectItem value="closed" className="text-xs">closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-1.5 block font-medium">Expense (KES)</Label>
              <Input
                type="number"
                value={form.expense ?? ''}
                onChange={e => set('expense', e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="text-xs h-9">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-9 font-medium"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Maintenance Page Component ──────────────────────────────────────────
export default function MaintenancePage() {
  const { toast } = useToast();
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [statusFilters, setStatusFilters] = useState({ open: true, 'in progress': true, closed: true });
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [collapseStatus, setCollapseStatus] = useState(false);
  const [collapseCategory, setCollapseCategory] = useState(false);
  const [collapseSummary, setCollapseSummary] = useState(false);
  const [collapseTable, setCollapseTable] = useState(false);

  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [editingRequest, setEditingRequest] = useState(null);

  // Clean user state backed by localStorage (starts EMPTY - NO hardcoded/mock data)
  const [maintenanceRequests, setMaintenanceRequests] = useState(() => {
    try {
      // Purge any legacy mock data
      localStorage.removeItem('dwello_maintenance_requests');
      const saved = localStorage.getItem('dwello_maintenance_records_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure no leftover mock tickets with Sunset Heights Apartments or Water pipe leakage
        return parsed.filter(r => !r.summary?.includes('Water pipe') && !r.propertyName?.includes('Sunset Heights'));
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('dwello_maintenance_records_v1', JSON.stringify(maintenanceRequests));
    } catch (e) {
      console.error(e);
    }
  }, [maintenanceRequests]);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: api.getProperties
  });

  // If user is in 'form' view, render MaintenanceFormView
  if (view === 'form') {
    return (
      <MaintenanceFormView
        properties={properties}
        onBack={() => setView('list')}
        onAdd={r => setMaintenanceRequests(rs => [r, ...rs])}
      />
    );
  }

  const openCount = maintenanceRequests.filter(r => r.status === 'open').length;
  const inProgressCount = maintenanceRequests.filter(r => r.status === 'in progress' || r.status === 'pending').length;
  const closedCount = maintenanceRequests.filter(r => r.status === 'closed').length;
  const totalExpense = maintenanceRequests.reduce((acc, curr) => acc + (Number(curr.expense) || 0), 0);

  const filteredRequests = maintenanceRequests.filter(r => {
    if (selectedProperty !== 'all' && r.propertyId !== selectedProperty) return false;
    const st = r.status?.toLowerCase();
    if (!statusFilters[st]) return false;
    if (categoryFilter !== 'all' && r.category?.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        r.summary?.toLowerCase().includes(q) ||
        r.propertyName?.toLowerCase().includes(q) ||
        r.unit?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / perPage));
  const paginated = filteredRequests.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleDelete = (id) => {
    setMaintenanceRequests(rs => rs.filter(r => r.id !== id));
    toast({ title: 'Request Deleted', description: 'Maintenance ticket removed.' });
  };

  const handleUpdateStatus = (id, newStatus) => {
    setMaintenanceRequests(rs =>
      rs.map(r => r.id === id ? { ...r, status: newStatus } : r)
    );
    toast({ title: 'Status Updated', description: `Ticket marked as ${newStatus}.` });
  };

  const handleSaveEdit = (updated) => {
    setMaintenanceRequests(rs =>
      rs.map(r => r.id === updated.id ? updated : r)
    );
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <EditMaintenanceDialog
        request={editingRequest}
        open={Boolean(editingRequest)}
        onOpenChange={open => !open && setEditingRequest(null)}
        onSave={handleSaveEdit}
      />

      {/* ────────────────── TOP ACTIONS BAR ────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0b1065] dark:text-blue-400">Maintenance</h2>
          <p className="text-xs text-slate-500">Track and manage repair tickets, contractor assignments, and costs.</p>
        </div>
        <Button
          onClick={() => setView('form')}
          className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-8 px-4 font-semibold shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Maintenance
        </Button>
      </div>

      {/* ────────────────── MAIN TWO-COLUMN LAYOUT (BOMAHUT STYLE) ────────────────── */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* ──────── LEFT SIDEBAR: FILTERS ──────── */}
        <aside className="w-full md:w-64 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-[#0b1065] dark:text-blue-400 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Filters
            </h4>
            <span className="w-5 h-0.5 bg-[#0b1065] rounded" />
          </div>

          {/* Search */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Search</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                placeholder="Search ticket, unit, category..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-8 text-xs h-8 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Property Filter */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Property</label>
            <select
              value={selectedProperty}
              onChange={e => { setSelectedProperty(e.target.value); setCurrentPage(1); }}
              className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Properties</option>
              {properties.map(p => (
                <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <button
              type="button"
              onClick={() => setCollapseStatus(!collapseStatus)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
            >
              <span>Status</span>
              <ChevronDown className={'w-3.5 h-3.5 transition-transform ' + (collapseStatus ? 'rotate-180' : '')} />
            </button>
            {!collapseStatus && (
              <div className="space-y-1.5 mt-2 text-xs">
                {['open', 'in progress', 'closed'].map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={statusFilters[s]}
                      onChange={e => {
                        setStatusFilters({ ...statusFilters, [s]: e.target.checked });
                        setCurrentPage(1);
                      }}
                      className="rounded accent-[#0b1065] w-3.5 h-3.5"
                    />
                    <span className="text-slate-600 dark:text-slate-400 capitalize">{s}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Category Filter */}
          <div>
            <button
              type="button"
              onClick={() => setCollapseCategory(!collapseCategory)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
            >
              <span>Category</span>
              <ChevronDown className={'w-3.5 h-3.5 transition-transform ' + (collapseCategory ? 'rotate-180' : '')} />
            </button>
            {!collapseCategory && (
              <div className="mt-2 text-xs">
                <select
                  value={categoryFilter}
                  onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs"
                >
                  <option value="all">All Categories</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Carpentry">Carpentry</option>
                  <option value="Painting">Painting</option>
                  <option value="Roofing">Roofing</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Security">Security</option>
                  <option value="Masonry">Masonry</option>
                  <option value="General">General</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}
          </div>
        </aside>

        {/* ──────── RIGHT CONTENT: SUMMARY & TABLE ──────── */}
        <main className="flex-1 min-w-0 space-y-4">
          {/* Summary Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer select-none"
              onClick={() => setCollapseSummary(v => !v)}
            >
              <h4 className="text-sm font-semibold text-[#0b1065] dark:text-blue-400">Summary</h4>
              {collapseSummary ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
            </div>

            {!collapseSummary && (
              <div className="p-6 grid grid-cols-2 sm:grid-cols-4 text-center divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800 gap-4 sm:gap-0">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Open</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400 mt-2">{openCount}</h3>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">In Progress</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-amber-500 dark:text-amber-400 mt-2">{inProgressCount}</h3>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Closed</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{closedCount}</h3>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Total Cost</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-[#0b1065] dark:text-blue-400 mt-2">
                    KES {totalExpense.toLocaleString()}
                  </h3>
                </div>
              </div>
            )}
          </div>

          {/* Maintenance Table Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer select-none"
              onClick={() => setCollapseTable(v => !v)}
            >
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-[#0b1065] dark:text-blue-400">Maintenance Requests</h4>
                <span className="text-xs text-slate-400 font-normal">({filteredRequests.length} tickets)</span>
              </div>
              {collapseTable ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
            </div>

            {!collapseTable && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                      <tr>
                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Summary</th>
                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Property</th>
                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Unit</th>
                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Category</th>
                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Status</th>
                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Expense</th>
                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Date</th>
                        <th className="py-2.5 px-4 text-right font-semibold text-slate-600 dark:text-slate-400">Options</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {paginated.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-14 text-center text-slate-400 text-xs italic">
                            {maintenanceRequests.length === 0
                              ? 'No maintenance requests yet. Click "Add Maintenance" above to record one.'
                              : 'No requests match your current filters.'}
                          </td>
                        </tr>
                      ) : (
                        paginated.map(req => (
                          <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200 font-medium max-w-50">
                              <div className="truncate font-medium">{req.summary || '-'}</div>
                              {req.description && (
                                <div className="text-[11px] text-slate-400 truncate max-w-45">{req.description}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                              {req.propertyName || '-'}
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                              {req.unit || 'All Units'}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 capitalize">
                              {req.category || 'General'}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className={'px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ' + (STATUS_COLORS[req.status?.toLowerCase()] || 'bg-slate-100 text-slate-600')}>
                                {req.status || 'open'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                              {req.expense ? 'KES ' + Number(req.expense).toLocaleString() : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                              {req.date || '-'}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="text-xs">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setEditingRequest(req)}>
                                    <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Details
                                  </DropdownMenuItem>
                                  {req.status !== 'in progress' && (
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(req.id, 'in progress')}>
                                      <Clock className="w-3.5 h-3.5 mr-2 text-amber-500" /> Mark In Progress
                                    </DropdownMenuItem>
                                  )}
                                  {req.status !== 'closed' && (
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(req.id, 'closed')}>
                                      <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Mark Closed
                                    </DropdownMenuItem>
                                  )}
                                  {req.status !== 'open' && (
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(req.id, 'open')}>
                                      <AlertCircle className="w-3.5 h-3.5 mr-2 text-rose-500" /> Re-open Ticket
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => handleDelete(req.id)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Bar */}
                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <select
                      value={perPage}
                      onChange={e => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="h-7 w-14 border border-slate-200 dark:border-slate-700 rounded text-xs px-1.5 bg-white dark:bg-slate-800"
                    >
                      {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <span>
                      Showing {filteredRequests.length === 0 ? 0 : (currentPage - 1) * perPage + 1}-
                      {Math.min(currentPage * perPage, filteredRequests.length)} of {filteredRequests.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-semibold">
                      {currentPage}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
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
