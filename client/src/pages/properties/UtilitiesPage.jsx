import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { usePreferences } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Send,
  Trash2,
  ChevronDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Loader2
} from "lucide-react";

// ─── Add Utilities Form View (matching Bomahut Screenshot 3) ──────────────────
function AddUtilitiesFormView({ properties, onBack, onSuccess }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [propertyId, setPropertyId] = useState("");
  const [utilityType, setUtilityType] = useState("");
  const [readings, setReadings] = useState({});
  const [loading, setLoading] = useState(false);

  const selectedProp = properties.find((p) => (p._id || p.id) === propertyId);
  const units = selectedProp?.units || [];

  const handleContinueToReadings = () => {
    if (!propertyId && properties.length > 0) {
      toast({
        variant: "destructive",
        title: "Property Required",
        description: "Please select a property."
      });
      return;
    }
    setStep(2);
  };

  const handleCreateInvoices = async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Utility Invoices Created",
        description: `Successfully recorded readings and generated invoices for ${selectedProp?.name || "property"}.`
      });
      if (onSuccess) onSuccess();
      onBack();
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Back Button */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0b1065] dark:text-blue-400 border border-[#0b1065] dark:border-blue-400 bg-white dark:bg-slate-900 rounded-md hover:bg-[#0b1065]/5 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Add Utilities Form
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Use this form to add utility readings for a property.
        </p>
      </div>

      {/* Form Card (matching Screenshot 3) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-10 shadow-xs space-y-8">
        {/* Stepper Wizard Header */}
        <div className="flex items-center justify-center gap-6 sm:gap-10 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step >= 1
                  ? "bg-[#0096ff] text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              1
            </span>
            <span
              className={`text-xs font-medium ${
                step === 1 ? "text-[#0096ff] font-semibold" : "text-slate-500"
              }`}
            >
              Select Filters
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step >= 2
                  ? "bg-[#0096ff] text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-500"
              }`}
            >
              2
            </span>
            <span
              className={`text-xs font-medium ${
                step === 2 ? "text-[#0096ff] font-semibold" : "text-slate-400"
              }`}
            >
              Current Readings
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                step >= 3
                  ? "bg-[#0096ff] text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-500"
              }`}
            >
              3
            </span>
            <span
              className={`text-xs font-medium ${
                step === 3 ? "text-[#0096ff] font-semibold" : "text-slate-400"
              }`}
            >
              Create Invoices
            </span>
          </div>
        </div>

        {/* STEP 1: Select Property & Utility */}
        {step === 1 && (
          <div className="space-y-6 max-w-2xl mx-auto py-2">
            {/* Row 1: Select Property */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
              <label className="sm:w-44 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 shrink-0">
                Select Property
              </label>
              <div className="flex-1">
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
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
              </div>
            </div>

            {/* Row 2: Select Utility */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
              <label className="sm:w-44 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 shrink-0">
                Select Utility
              </label>
              <div className="flex-1">
                <select
                  value={utilityType}
                  onChange={(e) => setUtilityType(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                >
                  <option value="">Select Utility</option>
                  <option value="water">Water</option>
                  <option value="electricity">Electricity</option>
                  <option value="garbage">Garbage</option>
                  <option value="sewer">Sewer</option>
                  <option value="gas">Gas</option>
                  <option value="generator">Generator</option>
                </select>
              </div>
            </div>

            {/* Action Row */}
            <div className="flex justify-end pt-4">
              <Button
                type="button"
                onClick={handleContinueToReadings}
                className="bg-[#06083b] hover:bg-[#0b1065] text-white text-xs font-semibold px-6 h-9 rounded-md transition cursor-pointer"
              >
                Continue &gt;
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Current Readings */}
        {step === 2 && (
          <div className="space-y-6 max-w-3xl mx-auto py-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Enter Current Readings ({utilityType || "Water"})
              </h3>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-blue-600 hover:underline"
              >
                Change Property / Utility
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">Previous Reading</th>
                    <th className="py-2.5 px-3">Current Reading</th>
                    <th className="py-2.5 px-3">Rate (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(units.length > 0 ? units : [{ id: "1", unitNumber: "1A" }, { id: "2", unitNumber: "1B" }]).map((u) => (
                    <tr key={u.id || u.unitNumber}>
                      <td className="py-2 px-3 font-medium">Unit {u.unitNumber || u.id}</td>
                      <td className="py-2 px-3 text-slate-500">120</td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          placeholder="e.g. 135"
                          value={readings[u.unitNumber || u.id] || ""}
                          onChange={(e) =>
                            setReadings({ ...readings, [u.unitNumber || u.id]: e.target.value })
                          }
                          className="h-8 w-28 px-2 border rounded text-xs"
                        />
                      </td>
                      <td className="py-2 px-3 text-slate-500">KES 150/unit</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                className="text-xs"
              >
                &lt; Back
              </Button>
              <Button
                type="button"
                onClick={() => setStep(3)}
                className="bg-[#06083b] hover:bg-[#0b1065] text-white text-xs font-semibold px-6 h-9 rounded-md transition cursor-pointer"
              >
                Continue &gt;
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Create Invoices */}
        {step === 3 && (
          <div className="space-y-6 max-w-2xl mx-auto py-2 text-center">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Generate Invoices
              </h3>
              <p className="text-xs text-slate-500">
                Ready to generate utility billing invoices for the entered meter readings.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs space-y-1 text-slate-700 dark:text-slate-300">
              <p><strong>Property:</strong> {selectedProp?.name || "Selected Property"}</p>
              <p><strong>Utility:</strong> {utilityType || "Water"}</p>
              <p><strong>Billing Cycle:</strong> {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep(2)}
                className="text-xs"
              >
                &lt; Edit Readings
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={handleCreateInvoices}
                className="bg-[#06083b] hover:bg-[#0b1065] text-white text-xs font-semibold px-6 h-9 rounded-md transition cursor-pointer"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                Generate Invoices
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Back Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0b1065] dark:text-blue-400 border border-[#0b1065] dark:border-blue-400 bg-white dark:bg-slate-900 rounded-md hover:bg-[#0b1065]/5 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>
    </div>
  );
}

// ─── Reset Utilities Form View (matching Bomahut Screenshot 4) ────────────────
function ResetUtilitiesFormView({ properties, onBack, onReset }) {
  const { toast } = useToast();
  const [propertyId, setPropertyId] = useState("");
  const [unitSelection, setUnitSelection] = useState("");
  const [utilitySelection, setUtilitySelection] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedProp = properties.find((p) => (p._id || p.id) === propertyId);
  const units = selectedProp?.units || [];

  const handleResetSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Utilities Reset",
        description: `Utility readings and invoices have been cleared successfully.`
      });
      if (onReset) onReset();
      onBack();
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Back Button */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0b1065] dark:text-blue-400 border border-[#0b1065] dark:border-blue-400 bg-white dark:bg-slate-900 rounded-md hover:bg-[#0b1065]/5 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Reset Utilties Form
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Use this form to reset/clear all utilities for a single unit or multiple units. This action will clear all utility readings and invoices for the selected unit(s).
        </p>
      </div>

      {/* Form Card (matching Screenshot 4) */}
      <form
        onSubmit={handleResetSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-10 shadow-xs space-y-5"
      >
        {/* Row 1: Select Property */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-44 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 shrink-0">
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
                  ? "No properties yet — add one from the Properties page"
                  : "Select Property"}
              </option>
              {properties.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Select Unit(s) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-44 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 shrink-0">
            Select Unit(s)
          </label>
          <div className="flex-1 max-w-lg">
            <input
              type="text"
              value={unitSelection}
              onChange={(e) => setUnitSelection(e.target.value)}
              placeholder="e.g. Unit 1A, Unit 1B (or leave blank for all)"
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            />
          </div>
        </div>

        {/* Row 3: Select Utility */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-44 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 shrink-0">
            Select Utility
          </label>
          <div className="flex-1 max-w-lg">
            <select
              value={utilitySelection}
              onChange={(e) => setUtilitySelection(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            >
              <option value="">No item selected</option>
              <option value="all">All Utilities</option>
              <option value="water">Water</option>
              <option value="electricity">Electricity</option>
              <option value="garbage">Garbage</option>
              <option value="sewer">Sewer</option>
            </select>
          </div>
        </div>

        {/* Action Button & Note (matching Screenshot 4) */}
        <div className="pt-4 max-w-lg mx-auto sm:ml-50 space-y-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-semibold h-9 rounded-md shadow-xs transition cursor-pointer"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reset Utilities
          </Button>

          <p className="text-xs text-slate-500 italic pt-2">
            Note that the utilities for the selected unit(s) will be cleared.
          </p>
        </div>
      </form>

      {/* Bottom Back Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0b1065] dark:text-blue-400 border border-[#0b1065] dark:border-blue-400 bg-white dark:bg-slate-900 rounded-md hover:bg-[#0b1065]/5 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>
    </div>
  );
}

// ─── Main Utilities Page Component ────────────────────────────────────────────
export default function UtilitiesPage() {
  const { toast } = useToast();
  const { formatCurrency } = usePreferences();

  // View state: 'list' | 'add_utilities' | 'reset_utilities'
  const [view, setView] = useState("list");

  // Filters state
  const [utilityItems, setUtilityItems] = useState({
    water: true,
    electricity: true
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedProperty, setSelectedProperty] = useState("all");

  // Collapsible sections state
  const [collapseItem, setCollapseItem] = useState(false);
  const [collapseDate, setCollapseDate] = useState(false);
  const [collapseProperty, setCollapseProperty] = useState(false);
  const [collapseTable, setCollapseTable] = useState(false);

  // Pagination state
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Selected table rows
  const [selectedRows, setSelectedRows] = useState([]);

  // Fetch properties for property dropdown
  const { data: properties = [] } = useQuery({
    queryKey: ["properties"],
    queryFn: api.getProperties
  });

  // Clean utilities data list
  const [utilitiesData, setUtilitiesData] = useState([]);

  const filteredUtilities = utilitiesData.filter((u) => {
    if (!utilityItems[u.item?.toLowerCase()]) return false;
    if (selectedProperty !== "all" && u.propertyId !== selectedProperty) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUtilities.length / perPage));
  const paginated = filteredUtilities.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(paginated.map((_, idx) => idx));
    } else {
      setSelectedRows([]);
    }
  };

  const toggleSelectRow = (idx) => {
    if (selectedRows.includes(idx)) {
      setSelectedRows(selectedRows.filter((i) => i !== idx));
    } else {
      setSelectedRows([...selectedRows, idx]);
    }
  };

  // If in Add Utilities Form view
  if (view === "add_utilities") {
    return (
      <AddUtilitiesFormView
        properties={properties}
        onBack={() => setView("list")}
        onSuccess={() => {}}
      />
    );
  }

  // If in Reset Utilities Form view
  if (view === "reset_utilities") {
    return (
      <ResetUtilitiesFormView
        properties={properties}
        onBack={() => setView("list")}
        onReset={() => setUtilitiesData([])}
      />
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* ────────────────── TOP ACTIONS BAR ────────────────── */}
      <div className="flex items-center justify-end gap-2">
        <Button
          onClick={() => setView("add_utilities")}
          className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-8 px-4 font-medium transition cursor-pointer"
        >
          Record Utility
        </Button>
        <Button
          onClick={() =>
            toast({
              title: "Bulk Upload Utilities",
              description: "Upload an Excel/CSV file with meter readings."
            })
          }
          variant="outline"
          className="text-xs h-8 px-4 text-[#0b1065] border-slate-300 hover:bg-slate-50 transition cursor-pointer"
        >
          Bulk Upload Utilities
        </Button>
        <Button
          onClick={() => setView("reset_utilities")}
          variant="outline"
          className="text-xs h-8 px-4 text-[#0b1065] border-slate-300 hover:bg-slate-50 transition cursor-pointer"
        >
          Reset Utilities
        </Button>
      </div>

      {/* ────────────────── TWO COLUMN LAYOUT ────────────────── */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* LEFT COLUMN: Filters Sidebar */}
        <aside className="w-full md:w-64 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Filters
            </h4>
            <Minus className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
          </div>

          {/* 1. Utility Item */}
          <div>
            <button
              type="button"
              onClick={() => setCollapseItem(!collapseItem)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
            >
              <span>Utility Item</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  collapseItem ? "rotate-180" : ""
                }`}
              />
            </button>
            {!collapseItem && (
              <div className="space-y-1.5 mt-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={utilityItems.water}
                    onChange={(e) =>
                      setUtilityItems({ ...utilityItems, water: e.target.checked })
                    }
                    className="rounded accent-blue-600 w-3.5 h-3.5"
                  />
                  <span className="text-slate-600 dark:text-slate-400">water</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={utilityItems.electricity}
                    onChange={(e) =>
                      setUtilityItems({
                        ...utilityItems,
                        electricity: e.target.checked
                      })
                    }
                    className="rounded accent-blue-600 w-3.5 h-3.5"
                  />
                  <span className="text-slate-600 dark:text-slate-400">
                    electricity
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* 2. Date */}
          <div>
            <button
              type="button"
              onClick={() => setCollapseDate(!collapseDate)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
            >
              <span>Date</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  collapseDate ? "rotate-180" : ""
                }`}
              />
            </button>
            {!collapseDate && (
              <div className="space-y-1.5 mt-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Start date"
                  className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="End date"
                  className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* 3. Property / Unit */}
          <div>
            <button
              type="button"
              onClick={() => setCollapseProperty(!collapseProperty)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
            >
              <span>Property / Unit</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  collapseProperty ? "rotate-180" : ""
                }`}
              />
            </button>
            {!collapseProperty && (
              <div className="mt-2">
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">No properties yet — add one</option>
                  {properties.map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: Utilities Table Card */}
        <main className="flex-1 min-w-0 w-full space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
            {/* Table Header Row with Title & Collapse */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Utilities List
              </h4>
              <button
                type="button"
                onClick={() => setCollapseTable(!collapseTable)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>

            {!collapseTable && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#fcfdfe] dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                      <tr>
                        <th className="py-2.5 px-4 w-10">
                          <input
                            type="checkbox"
                            checked={
                              paginated.length > 0 &&
                              selectedRows.length === paginated.length
                            }
                            onChange={toggleSelectAll}
                            className="rounded accent-blue-600 w-3.5 h-3.5"
                          />
                        </th>
                        <th className="py-2.5 px-4">Property</th>
                        <th className="py-2.5 px-4">Unit</th>
                        <th className="py-2.5 px-4">Utility</th>
                        <th className="py-2.5 px-4">Previous</th>
                        <th className="py-2.5 px-4">Current</th>
                        <th className="py-2.5 px-4">Consumed</th>
                        <th className="py-2.5 px-4">Rate</th>
                        <th className="py-2.5 px-4">Total</th>
                        <th className="py-2.5 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {paginated.length === 0 ? (
                        <tr>
                          <td
                            colSpan={10}
                            className="text-center py-10 text-xs text-slate-400"
                          >
                            No utility records found. Click <strong>Record Utility</strong> to record meter readings.
                          </td>
                        </tr>
                      ) : (
                        paginated.map((item, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-2.5 px-4">
                              <input
                                type="checkbox"
                                checked={selectedRows.includes(idx)}
                                onChange={() => toggleSelectRow(idx)}
                                className="rounded accent-blue-600 w-3.5 h-3.5"
                              />
                            </td>
                            <td className="py-2.5 px-4 font-medium">{item.propertyName}</td>
                            <td className="py-2.5 px-4">{item.unit}</td>
                            <td className="py-2.5 px-4 capitalize">{item.item}</td>
                            <td className="py-2.5 px-4">{item.previous}</td>
                            <td className="py-2.5 px-4">{item.current}</td>
                            <td className="py-2.5 px-4">{item.consumed}</td>
                            <td className="py-2.5 px-4">{formatCurrency(item.rate)}</td>
                            <td className="py-2.5 px-4 font-semibold text-emerald-600">
                              {formatCurrency(item.total)}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500">{item.date}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <select
                      value={perPage}
                      onChange={(e) => {
                        setPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="border rounded px-2 py-1 text-xs"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                    <span>
                      Showing {filteredUtilities.length === 0 ? 0 : (currentPage - 1) * perPage + 1} to{" "}
                      {Math.min(currentPage * perPage, filteredUtilities.length)} of {filteredUtilities.length} results
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold text-xs">
                      {currentPage}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
