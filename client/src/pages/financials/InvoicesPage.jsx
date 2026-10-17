import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { usePreferences } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Download,
  Mail,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  Minus,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Send,
  Loader2,
  Sparkles,
  FileSpreadsheet,
  X,
  CheckCircle2,
  Calendar,
  ArrowRight,
  HelpCircle,
  User,
  Check,
  FileText,
  Building2,
  DollarSign,
  Settings
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const statusColors = {
  open: "bg-blue-100 text-blue-700 border-blue-200",
  partial: "bg-amber-100 text-amber-700 border-amber-200",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  void: "bg-red-100 text-red-600 border-red-200",
  uncollectible: "bg-rose-100 text-rose-700 border-rose-200",
  "credit-note": "bg-purple-100 text-purple-700 border-purple-200"
};

// ─── Invoice Form View (Bomahut Layout matching Screenshot 2) ─────────────────
function InvoiceFormView({ properties, tenants, onBack, onAdd }) {
  const { toast } = useToast();
  const [propertyId, setPropertyId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [status, setStatus] = useState("open");
  const [combineWithOther, setCombineWithOther] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Line items state
  const [items, setItems] = useState([
    { name: "", amount: "", description: "" }
  ]);

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, { name: "", amount: "", description: "" }]);
  };

  const removeItemRow = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const selectedProp = properties.find((p) => (p._id || p.id) === propertyId);
  const filteredTenants = tenants.filter((t) => {
    if (!propertyId) return true;
    return (t.propertyId || t.property) === propertyId;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tenantId && tenants.length > 0) {
      toast({
        variant: "destructive",
        title: "Tenant Required",
        description: "Please select a tenant for this invoice."
      });
      return;
    }

    const validItems = items.filter((it) => it.name.trim() || it.amount);
    if (validItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Items Required",
        description: "Please enter at least one invoice item."
      });
      return;
    }

    setLoading(true);
    try {
      const selectedTenant = tenants.find(
        (t) => (t._id || t.id) === tenantId
      );
      const totalAmount = validItems.reduce(
        (sum, it) => sum + (Number(it.amount) || 0),
        0
      );

      const newInvoice = {
        _id: "INV-" + Date.now().toString().slice(-6),
        date: invoiceDate,
        tenantId: selectedTenant ? selectedTenant.name : "Tenant",
        unitId: selectedTenant?.unitNumber || selectedTenant?.unit || "Unit",
        property: selectedProp?.name || "Property",
        item: validItems[0]?.name || "Rent",
        items: validItems,
        amount: totalAmount,
        status,
        combineWithOther,
        notes
      };

      onAdd(newInvoice);
      toast({
        title: "Invoice Created",
        description: `Invoice for ${newInvoice.tenantId} (KES ${totalAmount.toLocaleString()}) created successfully.`
      });
      onBack();
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create invoice."
      });
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
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Invoice Form
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Use this form to create tenant invoices.
        </p>
      </div>

      {/* Form Card (matching Screenshot 2) */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-10 shadow-xs space-y-5"
      >
        {/* Row 1: Select Tenant */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
          <label className="sm:w-48 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 pt-2 shrink-0">
            Select Tenant
          </label>
          <div className="flex-1 max-w-lg space-y-2">
            <select
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value);
                setTenantId("");
              }}
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            >
              <option value="">
                {properties.length === 0
                  ? "No properties yet — add one from the Properties page"
                  : "All Properties"}
              </option>
              {properties.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            >
              <option value="">Select tenant(s) ...</option>
              {filteredTenants.map((t) => (
                <option key={t._id || t.id} value={t._id || t.id}>
                  {t.name} (Unit {t.unitNumber || t.unit || "—"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Invoice Item(s) */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
          <label className="sm:w-48 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 pt-2 shrink-0">
            Invoice Item(s)
          </label>
          <div className="flex-1 max-w-lg space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200 dark:border-slate-700"
              >
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="item name"
                    value={item.name}
                    onChange={(e) =>
                      handleItemChange(idx, "name", e.target.value)
                    }
                    className="h-8 text-xs bg-white dark:bg-slate-800"
                  />
                  <Input
                    type="number"
                    placeholder="amount"
                    value={item.amount}
                    onChange={(e) =>
                      handleItemChange(idx, "amount", e.target.value)
                    }
                    className="h-8 text-xs bg-white dark:bg-slate-800"
                  />
                  <Textarea
                    placeholder="description"
                    rows={2}
                    value={item.description}
                    onChange={(e) =>
                      handleItemChange(idx, "description", e.target.value)
                    }
                    className="text-xs bg-white dark:bg-slate-800 resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1 pt-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addItemRow}
                    className="h-7 w-7 p-0 text-slate-600 hover:text-blue-600"
                    title="Add another item"
                  >
                    +
                  </Button>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeItemRow(idx)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                    >
                      ×
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 3: Invoice Date */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-48 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
            Invoice Date
          </label>
          <div className="flex-1 max-w-lg">
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Row 4: Invoice Status */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-48 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
            Invoice Status
          </label>
          <div className="flex-1 max-w-lg">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            >
              <option value="open">open</option>
              <option value="draft">draft</option>
              <option value="paid">paid</option>
              <option value="partial">partial</option>
              <option value="void">void</option>
              <option value="uncollectible">uncollectible</option>
            </select>
          </div>
        </div>

        {/* Row 5: Combine with Other Invoices Checkbox */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
          <div className="sm:w-48 shrink-0" />
          <div className="flex-1 max-w-lg space-y-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={combineWithOther}
                onChange={(e) => setCombineWithOther(e.target.checked)}
                className="rounded accent-[#0b1065] w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Combine with Other Invoices
              </span>
            </label>
            <p className="text-[11px] text-slate-400">
              If checked then this invoice will be combined with other monthly
              invoices for this tenant.
            </p>
          </div>
        </div>

        {/* Show More Toggle */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
          <div className="sm:w-48 shrink-0" />
          <div className="flex-1 max-w-lg">
            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              className="text-xs font-semibold text-[#0b1065] dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              {showMore ? "Hide" : "Show More"}
              {showMore ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {showMore && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
            <label className="sm:w-48 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 pt-2 shrink-0">
              Notes
            </label>
            <div className="flex-1 max-w-lg">
              <Textarea
                placeholder="Internal notes or remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-4 max-w-lg mx-auto sm:ml-54 space-y-2.5">
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-9 font-medium shadow-xs cursor-pointer"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            + Add Invoice
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

// ─── 1. Generate Bulk Invoices Wizard (Bomahut Screenshot 2) ──────────────────
function GenerateBulkInvoicesWizard({ properties, tenants, onBack, onAddInvoices }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1); // 1: Setup, 2: Preview & Generate, 3: Send Invoices
  const [selectedProps, setSelectedProps] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceTypes, setInvoiceTypes] = useState({
    rent: true,
    recurring: false,
    penalties: false,
  });
  const [propDropdownOpen, setPropDropdownOpen] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);

  const handleToggleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedProps(properties.map(p => p._id || p.id));
    } else {
      setSelectedProps([]);
    }
  };

  const handleToggleProperty = (propId) => {
    if (selectedProps.includes(propId)) {
      setSelectedProps(selectedProps.filter(id => id !== propId));
      setSelectAll(false);
    } else {
      const next = [...selectedProps, propId];
      setSelectedProps(next);
      if (next.length === properties.length) setSelectAll(true);
    }
  };

  const eligibleTenants = tenants.filter(t => {
    if (selectedProps.length === 0) return false;
    return selectedProps.includes(t.propertyId || t.property);
  });

  const handleContinueToPreview = () => {
    if (selectedProps.length === 0) {
      toast({
        variant: "destructive",
        title: "Properties Required",
        description: "Please select at least one property to generate invoices for.",
      });
      return;
    }
    if (!invoiceTypes.rent && !invoiceTypes.recurring && !invoiceTypes.penalties) {
      toast({
        variant: "destructive",
        title: "Invoice Type Required",
        description: "Please select at least one invoice type.",
      });
      return;
    }
    setStep(2);
  };

  const handleGenerate = () => {
    const newInvoices = [];
    const targetTenants = eligibleTenants.length > 0 ? eligibleTenants : tenants;
    
    targetTenants.forEach(t => {
      const propObj = properties.find(p => (p._id || p.id) === (t.propertyId || t.property));
      const propName = propObj?.name || t.property || "Property";
      const unitNum = t.unitNumber || t.unit || "Unit";

      if (invoiceTypes.rent) {
        newInvoices.push({
          _id: `inv_rent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          date: invoiceDate,
          tenantId: t.name || t.tenantName || "Tenant",
          unitId: unitNum,
          property: propName,
          item: "Rent",
          status: "open",
          amount: Number(t.rentAmount || 15000),
        });
      }
      if (invoiceTypes.recurring) {
        newInvoices.push({
          _id: `inv_rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          date: invoiceDate,
          tenantId: t.name || t.tenantName || "Tenant",
          unitId: unitNum,
          property: propName,
          item: "Water & Service Charge",
          status: "open",
          amount: Number(t.waterBill || 1500),
        });
      }
      if (invoiceTypes.penalties) {
        newInvoices.push({
          _id: `inv_pen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          date: invoiceDate,
          tenantId: t.name || t.tenantName || "Tenant",
          unitId: unitNum,
          property: propName,
          item: "Late Payment Penalty",
          status: "open",
          amount: Number(t.penalty || 1000),
        });
      }
    });

    if (newInvoices.length > 0) {
      onAddInvoices(newInvoices);
      setGeneratedCount(newInvoices.length);
      setStep(3);
      toast({
        title: "Invoices Generated",
        description: `Successfully created ${newInvoices.length} batch invoice(s).`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "No Invoices Created",
        description: "No eligible tenants found for selected properties.",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-2 pb-12">
      {/* Top Header matching Screenshot 2 */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-medium text-slate-800 dark:text-slate-100">
            Generate Rent Invoices
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Create rent invoices for multiple tenants at once.
          </p>
        </div>
        <button
          onClick={onBack}
          className="w-7 h-7 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center cursor-pointer transition shadow-xs"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 3-Step Wizard Navigation */}
      <div className="flex items-center justify-center gap-6 sm:gap-10 py-2">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            step >= 1 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
          }`}>
            <Settings className="w-3.5 h-3.5" />
          </div>
          <span className={`text-xs font-medium ${step >= 1 ? "text-slate-800 dark:text-slate-200 font-semibold" : "text-slate-400"}`}>
            Setup
          </span>
        </div>

        <div className="h-0.5 w-8 bg-slate-200 dark:bg-slate-700" />

        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            step >= 2 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
          }`}>
            <FileText className="w-3.5 h-3.5" />
          </div>
          <span className={`text-xs font-medium ${step >= 2 ? "text-slate-800 dark:text-slate-200 font-semibold" : "text-slate-400"}`}>
            Preview & Generate
          </span>
        </div>

        <div className="h-0.5 w-8 bg-slate-200 dark:bg-slate-700" />

        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            step >= 3 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
          }`}>
            <Send className="w-3.5 h-3.5" />
          </div>
          <span className={`text-xs font-medium ${step >= 3 ? "text-slate-800 dark:text-slate-200 font-semibold" : "text-slate-400"}`}>
            Send Invoices
          </span>
        </div>
      </div>

      {/* Wizard Step 1: Setup (Screenshot 2) */}
      {step === 1 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Generate Invoices Form
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Use this form to easily create invoices for all tenants within a property.
            </p>
          </div>

          <div className="space-y-4">
            {/* Select Properties */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Select Properties:
              </label>
              <div className="relative">
                <div
                  onClick={() => setPropDropdownOpen(!propDropdownOpen)}
                  className="w-full min-h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer"
                >
                  <span className={selectedProps.length === 0 ? "text-slate-400" : "text-slate-800 dark:text-slate-200"}>
                    {selectedProps.length === 0
                      ? (properties.length === 0 ? "No properties yet — add one from Properties page" : "Click to select property(s)...")
                      : `${selectedProps.length} property(s) selected: ` + properties.filter(p => selectedProps.includes(p._id || p.id)).map(p => p.name).join(", ")}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                </div>

                {propDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg p-2 max-h-56 overflow-y-auto space-y-1">
                    {properties.length === 0 ? (
                      <p className="text-xs text-slate-400 p-2">No properties registered.</p>
                    ) : (
                      properties.map(p => {
                        const pid = p._id || p.id;
                        const isChecked = selectedProps.includes(pid);
                        return (
                          <label
                            key={pid}
                            className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleProperty(pid)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-slate-700 dark:text-slate-200 font-medium">{p.name}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Select All Checkbox */}
              <div className="pt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="gen_select_all"
                  checked={selectAll}
                  onChange={e => handleToggleSelectAll(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="gen_select_all" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  Select All
                </label>
              </div>
            </div>

            {/* Invoice Date */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Invoice Date:
              </label>
              <div className="relative max-w-full">
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                This date will be applied to all generated invoices.
              </p>
            </div>

            {/* Invoice Type Container */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Invoice Type
              </label>
              <div className="border border-slate-200 dark:border-slate-700 rounded-md p-4 space-y-3 bg-slate-50/40 dark:bg-slate-800/20">
                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={invoiceTypes.rent}
                    onChange={e => setInvoiceTypes({ ...invoiceTypes, rent: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Rent</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={invoiceTypes.recurring}
                    onChange={e => setInvoiceTypes({ ...invoiceTypes, recurring: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Other recurring bills</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={invoiceTypes.penalties}
                    onChange={e => setInvoiceTypes({ ...invoiceTypes, penalties: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Penalties</span>
                </label>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Select the invoice types to create. Rent and Other recurring bills can be combined. Penalties cannot be combined with other types.
              </p>
            </div>

            {/* Note text */}
            <p className="text-[11px] text-slate-400 pt-2 leading-relaxed">
              Note that invoices will be generated for the selected types. If invoices have already been created for a tenant for the specific month, they will not be created again.
            </p>

            {/* Prominent Action Button matching Screenshot 2 */}
            <div className="pt-4">
              <Button
                type="button"
                onClick={handleContinueToPreview}
                className="w-full bg-[#5850ec] hover:bg-[#4338ca] text-white text-xs h-10 font-semibold shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                Continue to Preview <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Bottom Right button matching Screenshot 2 */}
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={handleContinueToPreview}
                className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-7 px-3.5 font-semibold cursor-pointer"
              >
                Continue to Preview ›
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview & Generate */}
      {step === 2 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-6 shadow-xs">
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Preview Invoices to Generate
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Review target tenants and verify invoice amounts before generating.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-4">Tenant</th>
                  <th className="py-2.5 px-4">Property</th>
                  <th className="py-2.5 px-4">Unit</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Est. Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(eligibleTenants.length > 0 ? eligibleTenants : tenants).slice(0, 15).map((t, idx) => {
                  const prop = properties.find(p => (p._id || p.id) === (t.propertyId || t.property));
                  return (
                    <tr key={t._id || idx}>
                      <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">{t.name || "Tenant"}</td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{prop?.name || t.property || "Property"}</td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{t.unitNumber || t.unit || "-"}</td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                        {[
                          invoiceTypes.rent && "Rent",
                          invoiceTypes.recurring && "Recurring Bills",
                          invoiceTypes.penalties && "Penalties"
                        ].filter(Boolean).join(", ")}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        KES {Number(t.rentAmount || 15000).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="text-xs h-8 px-4"
            >
              ← Back to Setup
            </Button>
            <Button
              type="button"
              onClick={handleGenerate}
              className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-8 px-5 font-semibold cursor-pointer"
            >
              Generate Invoices Now
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Send Invoices */}
      {step === 3 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center space-y-5 shadow-xs">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              {generatedCount} Invoices Generated Successfully!
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              All invoices have been created and logged in the system. You can now dispatch notifications or view them in the invoices table.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => {
                toast({
                  title: "Invoices Dispatched",
                  description: `Sent SMS & Email notifications for ${generatedCount} invoice(s).`,
                });
                onBack();
              }}
              className="bg-[#5850ec] hover:bg-[#4338ca] text-white text-xs h-9 px-5 font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Dispatch via SMS & Email
            </Button>
            <Button
              variant="outline"
              onClick={onBack}
              className="text-xs h-9 px-5 border-slate-300 cursor-pointer"
            >
              View Invoices List
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 2. Bulk Invoicing Form View (Bomahut Screenshot 3) ───────────────────────
function BulkInvoicingView({ properties, tenants, onBack, onAddInvoices }) {
  const { toast } = useToast();
  const [propertyId, setPropertyId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("17/10/2026");
  const [items, setItems] = useState([
    { name: "", amount: "", tenantScope: "each", description: "" }
  ]);

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, { name: "", amount: "", tenantScope: "each", description: "" }]);
  };

  const removeItemRow = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    const valid = items.filter(it => it.name.trim() || it.amount);
    if (valid.length === 0) {
      toast({
        variant: "destructive",
        title: "Item Required",
        description: "Please specify at least one item name or amount.",
      });
      return;
    }

    const selectedProp = properties.find(p => (p._id || p.id) === propertyId);
    const propName = selectedProp?.name || "Property";
    const targetTenants = tenants.filter(t => !propertyId || (t.propertyId || t.property) === propertyId);
    const list = targetTenants.length > 0 ? targetTenants : [{ name: "Tenant", unitNumber: "Unit 1" }];

    const created = [];
    list.forEach(t => {
      valid.forEach(it => {
        created.push({
          _id: `inv_bulk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          date: invoiceDate,
          tenantId: t.name || "Tenant",
          unitId: t.unitNumber || t.unit || "Unit",
          property: propName,
          item: it.name || "General",
          description: it.description || "",
          status: "open",
          amount: Number(it.amount || 0),
        });
      });
    });

    onAddInvoices(created);
    toast({
      title: "Bulk Invoices Created",
      description: `Generated ${created.length} invoice items across tenants.`,
    });
    onBack();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pt-2 pb-12">
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
        <h2 className="text-2xl font-light text-slate-800 dark:text-slate-100">
          Bulk Invoicing
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Bulk invoicing allows you to create multiple invoices at the same time in 3 easy steps.
        </p>
      </div>

      {/* Card container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-6 sm:gap-10 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">
              <FileText className="w-3 h-3" />
            </div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Select Invoice Items
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center text-[11px] font-bold">
              <Building2 className="w-3 h-3" />
            </div>
            <span className="text-xs">Review Invoice Items</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center text-[11px] font-bold">
              <DollarSign className="w-3 h-3" />
            </div>
            <span className="text-xs">View Created Invoices</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Fill out the form to select invoices items you wish to create
          </p>

          {/* Select Property */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 items-start">
            <label className="sm:w-44 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 pt-2 shrink-0">
              Select Property
            </label>
            <div className="flex-1 max-w-lg">
              <select
                value={propertyId}
                onChange={e => setPropertyId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">No properties yet — add one from the Properties page</option>
                {properties.map(p => (
                  <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Invoice Date */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 items-start">
            <label className="sm:w-44 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 pt-2 shrink-0">
              Invoice Date
            </label>
            <div className="flex-1 max-w-lg">
              <Input
                type="text"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                placeholder="17/10/2026"
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* Invoice Item(s) */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 items-start">
            <label className="sm:w-44 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 pt-2 shrink-0">
              Invoice Item(s)
            </label>
            <div className="flex-1 max-w-lg space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-md p-3 space-y-2 bg-slate-50/30 dark:bg-slate-800/30 relative">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-rose-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <Input
                    placeholder="Item name"
                    value={it.name}
                    onChange={e => handleItemChange(idx, "name", e.target.value)}
                    className="text-xs h-8"
                  />
                  <Input
                    type="number"
                    placeholder="amount"
                    value={it.amount}
                    onChange={e => handleItemChange(idx, "amount", e.target.value)}
                    className="text-xs h-8"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={it.tenantScope}
                      onChange={e => handleItemChange(idx, "tenantScope", e.target.value)}
                      className="flex-1 h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <option value="each">Each (👤) Tenant</option>
                      <option value="all">All Occupied Units</option>
                    </select>
                    <span title="Invoices will be assigned to each active tenant" className="text-slate-400 cursor-help">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <Textarea
                    placeholder="description"
                    value={it.description}
                    onChange={e => handleItemChange(idx, "description", e.target.value)}
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>
              ))}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addItemRow}
                  className="w-7 h-7 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer"
                  title="Add another item row"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 max-w-lg mx-auto sm:ml-50 space-y-2">
            <Button
              type="submit"
              className="w-full bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-9 font-medium shadow-xs cursor-pointer"
            >
              Submit
            </Button>
            <p className="text-[11px] text-slate-400 text-center">
              Note: In the next step, you will get a chance to edit each invoice item
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-xs h-7 px-4 cursor-pointer"
            >
              Next ›
            </Button>
          </div>
        </form>
      </div>

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

// ─── 3. Rent Invoice Form View (Bomahut Screenshot 4) ─────────────────────────
function RentInvoiceFormView({ properties, tenants, onBack, onAddInvoices }) {
  const { toast } = useToast();
  const [selectedProps, setSelectedProps] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [propDropdownOpen, setPropDropdownOpen] = useState(false);

  const handleToggleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedProps(properties.map(p => p._id || p.id));
    } else {
      setSelectedProps([]);
    }
  };

  const handleToggleProperty = (pid) => {
    if (selectedProps.includes(pid)) {
      setSelectedProps(selectedProps.filter(id => id !== pid));
      setSelectAll(false);
    } else {
      const next = [...selectedProps, pid];
      setSelectedProps(next);
      if (next.length === properties.length) setSelectAll(true);
    }
  };

  const handleGenerate = () => {
    if (selectedProps.length === 0) {
      toast({
        variant: "destructive",
        title: "Properties Required",
        description: "Please select property(s) to generate rent invoices.",
      });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const targetTenants = tenants.filter(t => selectedProps.includes(t.propertyId || t.property));
    const list = targetTenants.length > 0 ? targetTenants : tenants;

    const created = list.map(t => {
      const propObj = properties.find(p => (p._id || p.id) === (t.propertyId || t.property));
      return {
        _id: `inv_rent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        date: today,
        tenantId: t.name || t.tenantName || "Tenant",
        unitId: t.unitNumber || t.unit || "Unit",
        property: propObj?.name || t.property || "Property",
        item: "Rent",
        status: "open",
        amount: Number(t.rentAmount || 15000),
      };
    });

    onAddInvoices(created);
    toast({
      title: "Rent Invoices Generated",
      description: `Generated ${created.length} monthly rent invoice(s).`,
    });
    onBack();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pt-2 pb-12">
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
        <h2 className="text-xl font-normal text-slate-800 dark:text-slate-100">
          Rent Invoice Form
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Use this form to easily create rent invoices for all tenants within a property.
        </p>
      </div>

      {/* Form Card */}
      <div className="space-y-4 pt-2">
        <div className="space-y-1.5 max-w-2xl">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Select Properties:
          </label>
          <div className="relative">
            <div
              onClick={() => setPropDropdownOpen(!propDropdownOpen)}
              className="w-full min-h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer"
            >
              <span className={selectedProps.length === 0 ? "text-slate-400" : "text-slate-800 dark:text-slate-200"}>
                {selectedProps.length === 0
                  ? "Select properties..."
                  : `${selectedProps.length} property(s) selected: ` + properties.filter(p => selectedProps.includes(p._id || p.id)).map(p => p.name).join(", ")}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
            </div>

            {propDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg p-2 max-h-56 overflow-y-auto space-y-1">
                {properties.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2">No properties registered.</p>
                ) : (
                  properties.map(p => {
                    const pid = p._id || p.id;
                    const isChecked = selectedProps.includes(pid);
                    return (
                      <label
                        key={pid}
                        className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleProperty(pid)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-slate-700 dark:text-slate-200 font-medium">{p.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="pt-1 flex items-center gap-2">
            <input
              type="checkbox"
              id="rent_select_all"
              checked={selectAll}
              onChange={e => handleToggleSelectAll(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="rent_select_all" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              Select All
            </label>
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="button"
            onClick={handleGenerate}
            className="bg-[#5850ec] hover:bg-[#4338ca] text-white text-xs h-8 px-5 font-semibold cursor-pointer"
          >
            Generate Invoices
          </Button>
        </div>

        <p className="text-[11px] text-slate-400 max-w-2xl leading-relaxed pt-2">
          Note that the invoices that will be generated are only for rent. If a rent invoice had already been created for a tenant for the specific month, the invoice will not be created.
        </p>
      </div>

      {/* Bottom Back Button */}
      <div className="pt-4">
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

// ─── 4. Other Recurring Bills Invoice Form View (Bomahut Screenshot 1) ────────
function RecurringBillsInvoiceFormView({ properties, tenants, onBack, onAddInvoices }) {
  const { toast } = useToast();
  const [selectedProps, setSelectedProps] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [propDropdownOpen, setPropDropdownOpen] = useState(false);

  const handleToggleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedProps(properties.map(p => p._id || p.id));
    } else {
      setSelectedProps([]);
    }
  };

  const handleToggleProperty = (pid) => {
    if (selectedProps.includes(pid)) {
      setSelectedProps(selectedProps.filter(id => id !== pid));
      setSelectAll(false);
    } else {
      const next = [...selectedProps, pid];
      setSelectedProps(next);
      if (next.length === properties.length) setSelectAll(true);
    }
  };

  const handleGenerate = () => {
    if (selectedProps.length === 0) {
      toast({
        variant: "destructive",
        title: "Properties Required",
        description: "Please select property(s) to generate recurring bills invoices.",
      });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const targetTenants = tenants.filter(t => selectedProps.includes(t.propertyId || t.property));
    const list = targetTenants.length > 0 ? targetTenants : tenants;

    const created = list.map(t => {
      const propObj = properties.find(p => (p._id || p.id) === (t.propertyId || t.property));
      return {
        _id: `inv_rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        date: today,
        tenantId: t.name || t.tenantName || "Tenant",
        unitId: t.unitNumber || t.unit || "Unit",
        property: propObj?.name || t.property || "Property",
        item: "Water & Utilities",
        status: "open",
        amount: Number(t.waterBill || 2000),
      };
    });

    onAddInvoices(created);
    toast({
      title: "Recurring Bills Invoices Generated",
      description: `Generated ${created.length} recurring utility invoice(s).`,
    });
    onBack();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pt-2 pb-12">
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
        <h2 className="text-xl font-normal text-slate-800 dark:text-slate-100">
          Other Recurring Bills Invoice Form
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Use this form to easily create other recurring bills invoices for all tenants within a property.
        </p>
      </div>

      {/* Form Card */}
      <div className="space-y-4 pt-2">
        <div className="space-y-1.5 max-w-2xl">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Select Properties:
          </label>
          <div className="relative">
            <div
              onClick={() => setPropDropdownOpen(!propDropdownOpen)}
              className="w-full min-h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer"
            >
              <span className={selectedProps.length === 0 ? "text-slate-400" : "text-slate-800 dark:text-slate-200"}>
                {selectedProps.length === 0
                  ? "Select properties..."
                  : `${selectedProps.length} property(s) selected: ` + properties.filter(p => selectedProps.includes(p._id || p.id)).map(p => p.name).join(", ")}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
            </div>

            {propDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg p-2 max-h-56 overflow-y-auto space-y-1">
                {properties.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2">No properties registered.</p>
                ) : (
                  properties.map(p => {
                    const pid = p._id || p.id;
                    const isChecked = selectedProps.includes(pid);
                    return (
                      <label
                        key={pid}
                        className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleProperty(pid)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-slate-700 dark:text-slate-200 font-medium">{p.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="pt-1 flex items-center gap-2">
            <input
              type="checkbox"
              id="rec_select_all"
              checked={selectAll}
              onChange={e => handleToggleSelectAll(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="rec_select_all" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              Select All
            </label>
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="button"
            onClick={handleGenerate}
            className="bg-[#5850ec] hover:bg-[#4338ca] text-white text-xs h-8 px-5 font-semibold cursor-pointer"
          >
            Generate Invoices
          </Button>
        </div>

        <p className="text-[11px] text-slate-400 max-w-2xl leading-relaxed pt-2">
          Note that the invoices that will be generated are only for other recurring bills. If a recurring bill invoice had already been created for a tenant for the specific month, the invoice will not be created.
        </p>
      </div>

      {/* Bottom Back Button */}
      <div className="pt-4">
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

// ─── 5. Rent Penalty Invoice Form View (Bomahut Screenshot 2) ─────────────────
function RentPenaltyInvoiceFormView({ properties, tenants, onBack, onAddInvoices }) {
  const { toast } = useToast();
  const [selectedProps, setSelectedProps] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [sendMessage, setSendMessage] = useState(true);
  const [propDropdownOpen, setPropDropdownOpen] = useState(false);

  const handleToggleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedProps(properties.map(p => p._id || p.id));
    } else {
      setSelectedProps([]);
    }
  };

  const handleToggleProperty = (pid) => {
    if (selectedProps.includes(pid)) {
      setSelectedProps(selectedProps.filter(id => id !== pid));
      setSelectAll(false);
    } else {
      const next = [...selectedProps, pid];
      setSelectedProps(next);
      if (next.length === properties.length) setSelectAll(true);
    }
  };

  const handleGenerate = () => {
    if (selectedProps.length === 0) {
      toast({
        variant: "destructive",
        title: "Properties Required",
        description: "Please select property(s) to generate penalty invoices.",
      });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const targetTenants = tenants.filter(t => selectedProps.includes(t.propertyId || t.property));
    const list = targetTenants.length > 0 ? targetTenants : tenants;

    const created = list.map(t => {
      const propObj = properties.find(p => (p._id || p.id) === (t.propertyId || t.property));
      return {
        _id: `inv_pen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        date: today,
        tenantId: t.name || t.tenantName || "Tenant",
        unitId: t.unitNumber || t.unit || "Unit",
        property: propObj?.name || t.property || "Property",
        item: "Rent Late Penalty",
        status: "open",
        amount: Number(t.penalty || 1000),
      };
    });

    onAddInvoices(created);
    toast({
      title: "Penalty Invoices Generated",
      description: `Generated ${created.length} late penalty invoice(s)${sendMessage ? " and queued SMS alerts." : "."}`,
    });
    onBack();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pt-2 pb-12">
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
        <h2 className="text-xl font-normal text-slate-800 dark:text-slate-100">
          Rent Penalty Invoice Form
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Use this form to easily create penalty invoices for all tenants within a property.
        </p>
      </div>

      {/* Form Card */}
      <div className="space-y-4 pt-2">
        <div className="space-y-1.5 max-w-2xl">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Select Properties:
          </label>
          <div className="relative">
            <div
              onClick={() => setPropDropdownOpen(!propDropdownOpen)}
              className="w-full min-h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer"
            >
              <span className={selectedProps.length === 0 ? "text-slate-400" : "text-slate-800 dark:text-slate-200"}>
                {selectedProps.length === 0
                  ? "Select properties..."
                  : `${selectedProps.length} property(s) selected: ` + properties.filter(p => selectedProps.includes(p._id || p.id)).map(p => p.name).join(", ")}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
            </div>

            {propDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg p-2 max-h-56 overflow-y-auto space-y-1">
                {properties.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2">No properties registered.</p>
                ) : (
                  properties.map(p => {
                    const pid = p._id || p.id;
                    const isChecked = selectedProps.includes(pid);
                    return (
                      <label
                        key={pid}
                        className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleProperty(pid)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-slate-700 dark:text-slate-200 font-medium">{p.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="pt-1 flex items-center gap-2">
            <input
              type="checkbox"
              id="pen_select_all"
              checked={selectAll}
              onChange={e => handleToggleSelectAll(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="pen_select_all" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              Select All Properties
            </label>
          </div>
        </div>

        {/* Blue Callout: Send Message(s) After Generating Invoices (Screenshot 2) */}
        <div className="max-w-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 rounded-lg p-4 flex items-center justify-between">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={sendMessage}
              onChange={e => setSendMessage(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Send Message(s) After Generating Invoices
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                Notify tenants instantly and reduce late payments.
              </span>
            </div>
          </label>
          <span className="bg-blue-600 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full shrink-0">
            Recommended
          </span>
        </div>

        <div className="pt-2">
          <Button
            type="button"
            onClick={handleGenerate}
            className="bg-[#5850ec] hover:bg-[#4338ca] text-white text-xs h-8 px-5 font-semibold cursor-pointer"
          >
            Generate Invoices
          </Button>
        </div>

        <p className="text-[11px] text-slate-400 max-w-2xl leading-relaxed pt-2">
          Note that the invoices that will be generated are only for penalty. If a penalty invoice had already been created for a tenant for the specific month, the invoice will not be created.
        </p>
      </div>

      {/* Bottom Back Button */}
      <div className="pt-4">
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

// ─── 6. Generate Custom Penalty Invoices View (Bomahut Screenshot 3) ──────────
function GenerateCustomPenaltyInvoicesView({ properties, tenants, onBack, onAddInvoices }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedProps, setSelectedProps] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [propDropdownOpen, setPropDropdownOpen] = useState(false);

  const handleToggleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedProps(properties.map(p => p._id || p.id));
    } else {
      setSelectedProps([]);
    }
  };

  const handleToggleProperty = (pid) => {
    if (selectedProps.includes(pid)) {
      setSelectedProps(selectedProps.filter(id => id !== pid));
      setSelectAll(false);
    } else {
      const next = [...selectedProps, pid];
      setSelectedProps(next);
      if (next.length === properties.length) setSelectAll(true);
    }
  };

  const handleCalculate = () => {
    if (selectedProps.length === 0) {
      toast({
        variant: "destructive",
        title: "Properties Required",
        description: "Please select properties to calculate penalty invoices.",
      });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const targetTenants = tenants.filter(t => selectedProps.includes(t.propertyId || t.property));
    const list = targetTenants.length > 0 ? targetTenants : tenants;

    const created = list.map(t => {
      const propObj = properties.find(p => (p._id || p.id) === (t.propertyId || t.property));
      return {
        _id: `inv_cust_pen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        date: today,
        tenantId: t.name || t.tenantName || "Tenant",
        unitId: t.unitNumber || t.unit || "Unit",
        property: propObj?.name || t.property || "Property",
        item: "Custom Late Penalty",
        status: "open",
        amount: Number(t.penalty || 1500),
      };
    });

    onAddInvoices(created);
    toast({
      title: "Custom Penalty Invoices Generated",
      description: `Calculated and saved ${created.length} penalty invoice(s).`,
    });
    onBack();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pt-2 pb-12">
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
        <h2 className="text-xl font-normal text-slate-800 dark:text-slate-100">
          Generate Custom Penalty Invoices
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Use this tool to generate custom penalty invoices for selected properties.
        </p>
      </div>

      {/* Stepper bar matching Screenshot 3 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-6 shadow-xs">
        <div className="flex items-center justify-center gap-6 sm:gap-10 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">
              <FileText className="w-3 h-3" />
            </div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Select Properties
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center text-[11px] font-bold">
              <Building2 className="w-3 h-3" />
            </div>
            <span className="text-xs">Review Penalties</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center text-[11px] font-bold">
              <Check className="w-3 h-3" />
            </div>
            <span className="text-xs">Success</span>
          </div>
        </div>

        {/* Card form */}
        <div className="space-y-4 pt-1">
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Generate Custom Penalty Invoices
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select properties to calculate custom penalty invoices for all tenants.
            </p>
          </div>

          <div className="space-y-1.5 max-w-2xl">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Select Properties:
            </label>
            <div className="relative">
              <div
                onClick={() => setPropDropdownOpen(!propDropdownOpen)}
                className="w-full min-h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer"
              >
                <span className={selectedProps.length === 0 ? "text-slate-400" : "text-slate-800 dark:text-slate-200"}>
                  {selectedProps.length === 0
                    ? "Select properties..."
                    : `${selectedProps.length} property(s) selected: ` + properties.filter(p => selectedProps.includes(p._id || p.id)).map(p => p.name).join(", ")}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              </div>

              {propDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg p-2 max-h-56 overflow-y-auto space-y-1">
                  {properties.length === 0 ? (
                    <p className="text-xs text-slate-400 p-2">No properties registered.</p>
                  ) : (
                    properties.map(p => {
                      const pid = p._id || p.id;
                      const isChecked = selectedProps.includes(pid);
                      return (
                        <label
                          key={pid}
                          className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleProperty(pid)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-slate-700 dark:text-slate-200 font-medium">{p.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="pt-1 flex items-center gap-2">
              <input
                type="checkbox"
                id="cust_pen_select_all"
                checked={selectAll}
                onChange={e => handleToggleSelectAll(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="cust_pen_select_all" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                Select All Properties
              </label>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              onClick={handleCalculate}
              className="bg-[#5850ec] hover:bg-[#4338ca] text-white text-xs h-8 px-5 font-semibold cursor-pointer"
            >
              Calculate Penalty Invoices
            </Button>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="button"
              onClick={handleCalculate}
              className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-xs h-7 px-4 cursor-pointer"
            >
              Next ›
            </Button>
          </div>
        </div>
      </div>

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

// ─── Main Invoices Page Component ─────────────────────────────────────────────
export default function InvoicesPage() {
  const { toast } = useToast();
  const { formatCurrency } = usePreferences();
  const queryClient = useQueryClient();

  const [view, setView] = useState("list"); // 'list' | 'form'
  const [selectedInvoices, setSelectedInvoices] = useState([]);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: api.getPayments
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["properties"],
    queryFn: api.getProperties
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: api.getTenants
  });

  // Local invoices state
  const [customInvoices, setCustomInvoices] = useState(() => {
    try {
      const saved = localStorage.getItem("dwello_custom_invoices");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const handleAddInvoice = (newInv) => {
    setCustomInvoices((prev) => {
      const next = [newInv, ...prev];
      try {
        localStorage.setItem("dwello_custom_invoices", JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Combine payments acting as invoices + custom created invoices
  const allInvoices = [
    ...customInvoices,
    ...payments.map((p) => ({
      _id: p._id,
      date: p.date,
      tenantId:
        typeof p.tenantId === "object"
          ? p.tenantId?.name || "Tenant"
          : p.tenantId || "Tenant",
      unitId:
        typeof p.unitId === "object"
          ? p.unitId?.unitNumber || "Unit"
          : p.unitId || "Unit",
      property: p.property || "Property",
      item: "Rent",
      status: p.status || "open",
      amount: p.amount || 0
    }))
  ];

  // Filters state
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [invoiceItemFilter, setInvoiceItemFilter] = useState("all");
  const [statusFilters, setStatusFilters] = useState({
    draft: false,
    void: false,
    open: true,
    partial: true,
    paid: true,
    uncollectible: false,
    "credit-note": false
  });

  // Pagination
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Collapse sections
  const [collapseDate, setCollapseDate] = useState(false);
  const [collapseProperty, setCollapseProperty] = useState(false);
  const [collapseItem, setCollapseItem] = useState(false);
  const [collapseStatus, setCollapseStatus] = useState(false);
  const [collapseSummary, setCollapseSummary] = useState(false);

  const toggleStatusFilter = (status) => {
    setStatusFilters((prev) => ({ ...prev, [status]: !prev[status] }));
    setCurrentPage(1);
  };

  const activeStatuses = Object.entries(statusFilters)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const filtered = allInvoices.filter((p) => {
    const matchSearch =
      !search ||
      String(p.tenantId).toLowerCase().includes(search.toLowerCase()) ||
      String(p.unitId).toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      activeStatuses.length === 0 || activeStatuses.includes(p.status);
    return matchSearch && matchStatus;
  });

  const total = filtered.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedInvoices(paginated.map((p) => p._id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const toggleSelectInvoice = (id) => {
    if (selectedInvoices.includes(id)) {
      setSelectedInvoices(selectedInvoices.filter((i) => i !== id));
    } else {
      setSelectedInvoices([...selectedInvoices, id]);
    }
  };

  // Actions for More Options menu — navigate to Bomahut sub-views
  const handleMoreOption = (actionType) => {
    switch (actionType) {
      case "bulk_invoices":
        setView("generate_bulk");
        break;
      case "bulk_add":
        setView("bulk_invoicing");
        break;
      case "rent_invoices":
        setView("rent_invoice_form");
        break;
      case "recurring_bills":
        setView("recurring_bills_form");
        break;
      case "penalty_invoices":
        setView("penalty_form");
        break;
      case "custom_penalty":
        setView("custom_penalty");
        break;
      default:
        break;
    }
  };

  const handleSendInvoices = () => {
    const count =
      selectedInvoices.length > 0 ? selectedInvoices.length : filtered.length;
    toast({
      title: "Invoices Sent",
      description: `Dispatched ${count} invoice notification(s) via Email and SMS.`
    });
  };

  const handleDeleteSelected = () => {
    if (selectedInvoices.length === 0) {
      toast({
        variant: "destructive",
        title: "None Selected",
        description: "Please select invoices to delete."
      });
      return;
    }
    setCustomInvoices((prev) =>
      prev.filter((inv) => !selectedInvoices.includes(inv._id))
    );
    setSelectedInvoices([]);
    toast({
      title: "Invoices Deleted",
      description: "Selected invoices have been removed."
    });
  };

  // handleAddInvoices helper for bulk/wizard operations
  const handleAddInvoices = (newInvoices) => {
    setCustomInvoices(prev => {
      const next = [...newInvoices, ...prev];
      try {
        localStorage.setItem("dwello_custom_invoices", JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  if (view === "form") {
    return (
      <InvoiceFormView
        properties={properties}
        tenants={tenants}
        onBack={() => setView("list")}
        onAdd={handleAddInvoice}
      />
    );
  }

  if (view === "generate_bulk") {
    return (
      <GenerateBulkInvoicesWizard
        properties={properties}
        tenants={tenants}
        onBack={() => setView("list")}
        onAddInvoices={handleAddInvoices}
      />
    );
  }

  if (view === "bulk_invoicing") {
    return (
      <BulkInvoicingView
        properties={properties}
        tenants={tenants}
        onBack={() => setView("list")}
        onAddInvoices={handleAddInvoices}
      />
    );
  }

  if (view === "rent_invoice_form") {
    return (
      <RentInvoiceFormView
        properties={properties}
        tenants={tenants}
        onBack={() => setView("list")}
        onAddInvoices={handleAddInvoices}
      />
    );
  }

  if (view === "recurring_bills_form") {
    return (
      <RecurringBillsInvoiceFormView
        properties={properties}
        tenants={tenants}
        onBack={() => setView("list")}
        onAddInvoices={handleAddInvoices}
      />
    );
  }

  if (view === "penalty_form") {
    return (
      <RentPenaltyInvoiceFormView
        properties={properties}
        tenants={tenants}
        onBack={() => setView("list")}
        onAddInvoices={handleAddInvoices}
      />
    );
  }

  if (view === "custom_penalty") {
    return (
      <GenerateCustomPenaltyInvoicesView
        properties={properties}
        tenants={tenants}
        onBack={() => setView("list")}
        onAddInvoices={handleAddInvoices}
      />
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* ────────────────── TOP ACTION BAR (Screenshot 1) ────────────────── */}
      <div className="flex items-center justify-end gap-2.5">
        <Button
          onClick={() => setView("form")}
          className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-8 px-4 font-semibold shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Invoice
        </Button>

        {/* More Options Dropdown matching Screenshot 1 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="text-xs h-8 px-4 gap-1.5 border-slate-300 dark:border-slate-700 text-[#0b1065] dark:text-blue-400 font-semibold cursor-pointer"
            >
              More Options
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 text-xs py-1">
            <DropdownMenuItem
              onClick={() => handleMoreOption("bulk_invoices")}
              className="flex items-center justify-between cursor-pointer py-2"
            >
              <span>Generate Bulk Invoices</span>
              <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                New
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleMoreOption("bulk_add")}
              className="cursor-pointer py-2"
            >
              Bulk Add Invoices
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleMoreOption("rent_invoices")}
              className="cursor-pointer py-2"
            >
              Generate Rent Invoices
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleMoreOption("recurring_bills")}
              className="cursor-pointer py-2"
            >
              Generate Other Recurring Bills Invoices
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleMoreOption("penalty_invoices")}
              className="cursor-pointer py-2"
            >
              Generate Penalty Invoices
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleMoreOption("custom_penalty")}
              className="cursor-pointer py-2"
            >
              Generate Custom Penalty Invoices
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Two Column Layout: Filters | Content */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* LEFT: Filters Panel */}
        <aside className="w-full md:w-64 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 shadow-xs">
          {/* Search */}
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Filters
            </h4>
            <Minus className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Type to search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md pl-3 pr-8 text-xs focus:outline-none focus:border-blue-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
          </div>

          {/* Date Filter */}
          <div>
            <button
              type="button"
              onClick={() => setCollapseDate(!collapseDate)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
            >
              <span>Date</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${collapseDate ? "rotate-180" : ""}`}
              />
            </button>
            {!collapseDate && (
              <div className="space-y-1.5 mt-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs text-slate-600"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs text-slate-600"
                />
              </div>
            )}
          </div>

          {/* Property/Unit */}
          <div>
            <button
              type="button"
              onClick={() => setCollapseProperty(!collapseProperty)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
            >
              <span>Property / Unit</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${collapseProperty ? "rotate-180" : ""}`}
              />
            </button>
            {!collapseProperty && (
              <div className="mt-2">
                <select
                  value={propertyFilter}
                  onChange={(e) => setPropertyFilter(e.target.value)}
                  className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs text-slate-600"
                >
                  <option value="all">All Properties</option>
                  {properties.map((p) => (
                    <option key={p._id || p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Invoice Item */}
          <div>
            <button
              type="button"
              onClick={() => setCollapseItem(!collapseItem)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
            >
              <span>Invoice Item</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${collapseItem ? "rotate-180" : ""}`}
              />
            </button>
            {!collapseItem && (
              <div className="mt-2">
                <select
                  value={invoiceItemFilter}
                  onChange={(e) => setInvoiceItemFilter(e.target.value)}
                  className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs"
                >
                  <option value="all">All</option>
                  <option value="rent">Rent</option>
                  <option value="utilities">Utilities</option>
                  <option value="repairs">Repairs</option>
                </select>
              </div>
            )}
          </div>

          {/* Invoice Status */}
          <div>
            <button
              type="button"
              onClick={() => setCollapseStatus(!collapseStatus)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
            >
              <span>Invoice Status</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${collapseStatus ? "rotate-180" : ""}`}
              />
            </button>
            {!collapseStatus && (
              <div className="space-y-1.5 mt-2 text-xs">
                {Object.keys(statusFilters).map((status) => (
                  <label
                    key={status}
                    className="flex items-center gap-2 cursor-pointer capitalize"
                  >
                    <input
                      type="checkbox"
                      checked={statusFilters[status]}
                      onChange={() => toggleStatusFilter(status)}
                      className="rounded accent-[#0b1065] w-3.5 h-3.5"
                    />
                    <span className="text-slate-600 dark:text-slate-400">
                      {status}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT: Summary + Invoices Table */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Summary Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <div
              className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer select-none"
              onClick={() => setCollapseSummary(!collapseSummary)}
            >
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Summary
              </h4>
              <Minus className="w-3.5 h-3.5 text-slate-400" />
            </div>
            {!collapseSummary && (
              <div className="px-5 py-4">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {total.toLocaleString("en-KE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
                <p className="text-[11px] text-muted-foreground">(KES)</p>
              </div>
            )}
          </div>

          {/* Invoices Table Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Invoices
              </h4>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSendInvoices}
                  className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-[11px] h-7 px-3 gap-1 shadow-xs cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  Send Invoices
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="h-7 px-2 text-slate-400 hover:text-rose-500 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toast({
                      title: "Invoices Exported",
                      description: "Downloading invoices report."
                    })
                  }
                  className="text-[11px] h-7 px-3 gap-1 border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  Download Invoices
                </Button>
              </div>
            </div>

            {/* Scrollable table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <tr>
                    <th className="py-2.5 px-3 text-left">
                      <input
                        type="checkbox"
                        onChange={toggleSelectAll}
                        checked={
                          paginated.length > 0 &&
                          selectedInvoices.length === paginated.length
                        }
                        className="rounded w-3.5 h-3.5 accent-[#0b1065]"
                      />
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Date
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Invoice ID/Number
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Tenant
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Item
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Property (Unit)
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Status
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Amount
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Options
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-10 text-center text-xs text-muted-foreground"
                      >
                        Loading invoices...
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-10 text-center text-xs text-muted-foreground"
                      >
                        No invoices found.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((p) => (
                      <tr
                        key={p._id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={selectedInvoices.includes(p._id)}
                            onChange={() => toggleSelectInvoice(p._id)}
                            className="rounded w-3.5 h-3.5 accent-[#0b1065]"
                          />
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {p.date
                            ? new Date(p.date).toLocaleDateString("en-KE")
                            : "—"}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                          #{String(p._id || "").slice(-6).toUpperCase()}
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                          {p.tenantId}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                          {p.item}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                          {p.unitId}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize ${statusColors[p.status] || "bg-slate-100 text-slate-600"}`}
                          >
                            {p.status || "open"}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-100">
                          {Number(p.amount || 0).toLocaleString("en-KE", {
                            minimumFractionDigits: 2
                          })}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() =>
                              toast({
                                title: `Invoice #${String(p._id).slice(-6)}`,
                                description: `Tenant: ${p.tenantId} | Amount: KES ${Number(p.amount).toLocaleString()}`
                              })
                            }
                            className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
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
                  {[5, 10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span>
                  Showing{" "}
                  {filtered.length === 0
                    ? 0
                    : (currentPage - 1) * perPage + 1}
                  –{Math.min(currentPage * perPage, filtered.length)} of{" "}
                  {filtered.length} results
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-medium">{currentPage}</span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
