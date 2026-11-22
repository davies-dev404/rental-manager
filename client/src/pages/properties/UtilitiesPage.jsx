import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { usePreferences } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { ActionModals } from "@/components/dashboard/Modals";
import {
  ChevronDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Trash2
} from "lucide-react";

const UTILITY_TYPE_OPTIONS = [
  { id: "water", label: "Water", defaultRate: 150 },
  { id: "electricity", label: "Electricity", defaultRate: 28 },
  { id: "garbage", label: "Garbage", defaultRate: 500 },
  { id: "sewer", label: "Sewer", defaultRate: 300 },
  { id: "gas", label: "Gas", defaultRate: 250 },
  { id: "generator", label: "Generator", defaultRate: 100 }
];

// ─── Add Utilities Form View (MakaziFlow Layout) ──────────────────────────────
function AddUtilitiesFormView({ properties, existingReadings = [], onBack, onSuccess }) {
  const { toast } = useToast();
  const { formatCurrency } = usePreferences();
  const [step, setStep] = useState(1);
  const [propertyId, setPropertyId] = useState("");
  const [utilityType, setUtilityType] = useState("water");
  const [readingDate, setReadingDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [unitRows, setUnitRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const selectedProp = properties.find((p) => (p._id || p.id) === propertyId);

  const handleContinueToReadings = () => {
    if (!propertyId) {
      toast({
        variant: "destructive",
        title: "Property Required",
        description: "Please select a property first."
      });
      return;
    }
    if (!utilityType) {
      toast({
        variant: "destructive",
        title: "Utility Required",
        description: "Please select a utility item."
      });
      return;
    }

    const propUnits = Array.isArray(selectedProp?.units) ? selectedProp.units : [];
    if (propUnits.length === 0) {
      toast({
        variant: "destructive",
        title: "No Units Found",
        description: `${selectedProp?.name || "This property"} does not have units configured yet.`
      });
      return;
    }

    const opt = UTILITY_TYPE_OPTIONS.find((u) => u.id === utilityType);
    const defaultRate = opt ? opt.defaultRate : 150;

    const prepared = propUnits.map((u) => {
      const unitNum = u.unitNumber || u.name || "";
      const latest = existingReadings.find(
        (r) =>
          (r.propertyIdStr === propertyId || String(r.propertyId?._id || r.propertyId || "") === propertyId) &&
          String(r.unit || r.unitNumber || "").toLowerCase() === String(unitNum).toLowerCase() &&
          String(r.item || "").toLowerCase() === utilityType.toLowerCase()
      );
      return {
        unitId: u._id || u.id,
        unitNumber: unitNum,
        previous: latest ? String(latest.current ?? 0) : "0",
        current: "",
        rate: latest && Number(latest.rate) > 0 ? String(latest.rate) : String(defaultRate)
      };
    });

    setUnitRows(prepared);
    setStep(2);
  };

  const updateRow = (idx, field, value) => {
    setUnitRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const preparedEntries = useMemo(() => {
    return unitRows
      .filter((r) => r.current !== "" && Number(r.current) >= Number(r.previous || 0))
      .map((r) => {
        const prev = Number(r.previous || 0);
        const curr = Number(r.current || 0);
        const rate = Number(r.rate || 0);
        const consumed = Math.max(0, curr - prev);
        return {
          unitId: r.unitId,
          unitNumber: r.unitNumber,
          item: utilityType,
          previous: prev,
          current: curr,
          consumed,
          rate,
          total: Number((consumed * rate).toFixed(2)),
          date: readingDate
        };
      });
  }, [unitRows, utilityType, readingDate]);

  const handleCreateInvoices = async () => {
    if (preparedEntries.length === 0) {
      toast({
        variant: "destructive",
        title: "No Valid Readings",
        description: "Enter current readings (>= previous reading) for at least one unit."
      });
      return;
    }

    setLoading(true);
    try {
      const res = await api.recordUtilitiesBatch({
        propertyId,
        item: utilityType,
        date: readingDate,
        source: "manual",
        generateInvoices: true,
        entries: preparedEntries
      });

      toast({
        title: "Utility Readings Recorded",
        description: `Saved ${res.count} ${utilityType} reading(s) for ${selectedProp?.name || "property"} (${res.invoicesCreated || 0} invoice(s) generated).`
      });
      if (onSuccess) onSuccess();
      onBack();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to Save Utilities",
        description: err.message || "Could not record utility readings."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0b1065] dark:text-blue-400 border border-[#0b1065] dark:border-blue-400 bg-white dark:bg-slate-900 rounded-md hover:bg-[#0b1065]/5 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Add Utilities Form
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Record meter readings or consumption for a property&apos;s units and sync invoices automatically.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-10 shadow-xs space-y-8">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-6 sm:gap-10 pb-4 border-b border-slate-100 dark:border-slate-800">
          {[
            { num: 1, label: "Select Filters" },
            { num: 2, label: "Current Readings" },
            { num: 3, label: "Save & Invoice" }
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  step >= s.num ? "bg-[#0096ff] text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                }`}
              >
                {s.num}
              </span>
              <span className={`text-xs font-medium ${step === s.num ? "text-[#0096ff] font-semibold" : "text-slate-500"}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-5 max-w-2xl mx-auto py-2">
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
                      ? "No properties yet — add one from Properties page"
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
                  {UTILITY_TYPE_OPTIONS.map((u) => (
                    <option key={u.id} value={u.id}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
              <label className="sm:w-44 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 shrink-0">
                Reading Date
              </label>
              <div className="flex-1">
                <input
                  type="date"
                  value={readingDate}
                  onChange={(e) => setReadingDate(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                />
              </div>
            </div>

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

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-6 max-w-3xl mx-auto py-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize">
                Enter {utilityType} Readings — {selectedProp?.name}
              </h3>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-blue-600 hover:underline cursor-pointer"
              >
                Change Property / Utility
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">Previous</th>
                    <th className="py-2.5 px-3">Current</th>
                    <th className="py-2.5 px-3">Consumed</th>
                    <th className="py-2.5 px-3">Rate (KES)</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {unitRows.map((u, idx) => {
                    const prev = Number(u.previous || 0);
                    const curr = u.current === "" ? null : Number(u.current);
                    const rate = Number(u.rate || 0);
                    const consumed = curr !== null && curr >= prev ? curr - prev : 0;
                    const rowTotal = consumed * rate;
                    return (
                      <tr key={u.unitId || u.unitNumber}>
                        <td className="py-2 px-3 font-medium">Unit {u.unitNumber}</td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            value={u.previous}
                            onChange={(e) => updateRow(idx, "previous", e.target.value)}
                            className="h-8 w-24 px-2 border rounded text-xs bg-background"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            placeholder="e.g. 135"
                            value={u.current}
                            onChange={(e) => updateRow(idx, "current", e.target.value)}
                            className="h-8 w-24 px-2 border rounded text-xs bg-background"
                          />
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                          {curr !== null ? consumed : "—"}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            value={u.rate}
                            onChange={(e) => updateRow(idx, "rate", e.target.value)}
                            className="h-8 w-24 px-2 border rounded text-xs bg-background"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-600">
                          {curr !== null ? formatCurrency(rowTotal) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => setStep(1)} className="text-xs">
                &lt; Back
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (preparedEntries.length === 0) {
                    toast({
                      variant: "destructive",
                      title: "Enter Readings",
                      description: "Enter a current reading (>= previous) for at least one unit to continue."
                    });
                    return;
                  }
                  setStep(3);
                }}
                className="bg-[#06083b] hover:bg-[#0b1065] text-white text-xs font-semibold px-6 h-9 rounded-md transition cursor-pointer"
              >
                Continue &gt;
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-6 max-w-2xl mx-auto py-2 text-center">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Confirm &amp; Record Utilities
              </h3>
              <p className="text-xs text-slate-500">
                Save {preparedEntries.length} unit reading(s) and generate corresponding utility invoices.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
              <p><strong>Property:</strong> {selectedProp?.name}</p>
              <p className="capitalize"><strong>Utility:</strong> {utilityType}</p>
              <p><strong>Units Recorded:</strong> {preparedEntries.length}</p>
              <p><strong>Total Billed:</strong> {formatCurrency(preparedEntries.reduce((s, r) => s + r.total, 0))}</p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setStep(2)} className="text-xs">
                &lt; Edit Readings
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={handleCreateInvoices}
                className="bg-[#06083b] hover:bg-[#0b1065] text-white text-xs font-semibold px-6 h-9 rounded-md transition cursor-pointer"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                Save &amp; Generate Invoices
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reset Utilities Form View ────────────────────────────────────────────────
function ResetUtilitiesFormView({ properties, onBack, onReset }) {
  const { toast } = useToast();
  const [propertyId, setPropertyId] = useState("");
  const [unitSelection, setUnitSelection] = useState("");
  const [utilitySelection, setUtilitySelection] = useState("all");
  const [loading, setLoading] = useState(false);

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.resetUtilities({
        propertyId: propertyId || "all",
        unitSelection,
        item: utilitySelection || "all"
      });
      toast({
        title: "Utilities Reset",
        description: res.message || "Utility readings cleared successfully."
      });
      if (onReset) onReset();
      onBack();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: err.message || "Could not clear utility readings."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0b1065] dark:text-blue-400 border border-[#0b1065] dark:border-blue-400 bg-white dark:bg-slate-900 rounded-md hover:bg-[#0b1065]/5 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Reset Utilities Form
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Clear utility readings and open utility invoices for selected unit(s) or property.
        </p>
      </div>

      <form
        onSubmit={handleResetSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-10 shadow-xs space-y-5"
      >
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
                {properties.length === 0 ? "No properties yet" : "All Properties"}
              </option>
              {properties.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-44 sm:text-right text-xs font-normal text-slate-700 dark:text-slate-300 shrink-0">
            Select Unit(s)
          </label>
          <div className="flex-1 max-w-lg">
            <input
              type="text"
              value={unitSelection}
              onChange={(e) => setUnitSelection(e.target.value)}
              placeholder="e.g. 1A, 1B (or leave blank for all)"
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            />
          </div>
        </div>

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
              <option value="all">All Utilities</option>
              {UTILITY_TYPE_OPTIONS.map((u) => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>

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
            Note that the matching utility readings will be cleared permanently.
          </p>
        </div>
      </form>
    </div>
  );
}

// ─── Main Utilities Page Component ────────────────────────────────────────────
export default function UtilitiesPage() {
  const { toast } = useToast();
  const { formatCurrency } = usePreferences();
  const queryClient = useQueryClient();

  const [view, setView] = useState("list");
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const [utilityItems, setUtilityItems] = useState({
    water: true,
    electricity: true,
    garbage: true,
    sewer: true,
    gas: true,
    generator: true
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedProperty, setSelectedProperty] = useState("all");

  const [collapseItem, setCollapseItem] = useState(false);
  const [collapseDate, setCollapseDate] = useState(false);
  const [collapseProperty, setCollapseProperty] = useState(false);
  const [collapseTable, setCollapseTable] = useState(false);

  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);

  const { data: properties = [] } = useQuery({
    queryKey: ["properties"],
    queryFn: api.getProperties
  });

  const { data: utilitiesData = [] } = useQuery({
    queryKey: ["utilities"],
    queryFn: () => api.getUtilities()
  });

  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["utilities"] });
    window.addEventListener("dwello_utility_added", refresh);
    return () => window.removeEventListener("dwello_utility_added", refresh);
  }, [queryClient]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedRows([]);
  }, [utilityItems, startDate, endDate, selectedProperty]);

  const filteredUtilities = useMemo(() => {
    return (Array.isArray(utilitiesData) ? utilitiesData : []).filter((u) => {
      const itemKey = String(u.item || "").toLowerCase();
      if (Object.prototype.hasOwnProperty.call(utilityItems, itemKey) && !utilityItems[itemKey]) {
        return false;
      }
      const propId = u.propertyIdStr || (u.propertyId?._id ? String(u.propertyId._id) : String(u.propertyId || ""));
      if (selectedProperty !== "all" && propId !== selectedProperty) return false;

      if (startDate || endDate) {
        const d = u.date ? new Date(u.date) : null;
        const iso = d && !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "";
        if (startDate && iso && iso < startDate) return false;
        if (endDate && iso && iso > endDate) return false;
      }
      return true;
    });
  }, [utilitiesData, utilityItems, selectedProperty, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredUtilities.length / perPage));
  const paginated = filteredUtilities.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const toggleSelectAll = (e) => {
    if (e.target.checked) setSelectedRows(paginated.map((_, idx) => idx));
    else setSelectedRows([]);
  };

  const toggleSelectRow = (idx) => {
    setSelectedRows((prev) => (prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]));
  };

  const handleDeleteRow = async (id) => {
    try {
      await api.deleteUtility(id);
      queryClient.invalidateQueries({ queryKey: ["utilities"] });
      toast({ title: "Deleted", description: "Utility reading removed." });
    } catch (err) {
      toast({ variant: "destructive", title: "Delete Failed", description: err.message });
    }
  };

  if (view === "add_utilities") {
    return (
      <AddUtilitiesFormView
        properties={properties}
        existingReadings={utilitiesData}
        onBack={() => setView("list")}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["utilities"] });
          queryClient.invalidateQueries({ queryKey: ["invoices"] });
        }}
      />
    );
  }

  if (view === "reset_utilities") {
    return (
      <ResetUtilitiesFormView
        properties={properties}
        onBack={() => setView("list")}
        onReset={() => queryClient.invalidateQueries({ queryKey: ["utilities"] })}
      />
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Actions */}
      <div className="flex items-center justify-end gap-2">
        <Button
          onClick={() => setView("add_utilities")}
          className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-8 px-4 font-medium transition cursor-pointer"
        >
          Record Utility
        </Button>
        <Button
          onClick={() => setBulkModalOpen(true)}
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

      {/* Main Layout */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Filters</h4>
            <button
              type="button"
              onClick={() => {
                setUtilityItems({
                  water: true,
                  electricity: true,
                  garbage: true,
                  sewer: true,
                  gas: true,
                  generator: true
                });
                setStartDate("");
                setEndDate("");
                setSelectedProperty("all");
              }}
              className="text-[11px] font-medium text-blue-600 hover:underline cursor-pointer"
            >
              Reset
            </button>
          </div>

          {/* 1. Utility Item */}
          <div>
            <button
              type="button"
              onClick={() => setCollapseItem(!collapseItem)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
            >
              <span>Utility Item</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapseItem ? "rotate-180" : ""}`} />
            </button>
            {!collapseItem && (
              <div className="space-y-1.5 mt-2 text-xs">
                {UTILITY_TYPE_OPTIONS.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(utilityItems[opt.id])}
                      onChange={(e) => setUtilityItems({ ...utilityItems, [opt.id]: e.target.checked })}
                      className="rounded accent-blue-600 w-3.5 h-3.5"
                    />
                    <span className="text-slate-600 dark:text-slate-400">{opt.label}</span>
                  </label>
                ))}
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
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapseDate ? "rotate-180" : ""}`} />
            </button>
            {!collapseDate && (
              <div className="space-y-1.5 mt-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
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
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapseProperty ? "rotate-180" : ""}`} />
            </button>
            {!collapseProperty && (
              <div className="mt-2">
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">
                    {properties.length === 0 ? "No properties yet — add one" : "All Properties"}
                  </option>
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

        {/* Utilities Table Card */}
        <main className="flex-1 min-w-0 w-full space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
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
                            checked={paginated.length > 0 && selectedRows.length === paginated.length}
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
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {paginated.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="text-center py-10 text-xs text-slate-400">
                            No utility records found. Click <strong>Record Utility</strong> or <strong>Bulk Upload Utilities</strong> to add readings.
                          </td>
                        </tr>
                      ) : (
                        paginated.map((item, idx) => (
                          <tr key={item._id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-4">
                              <input
                                type="checkbox"
                                checked={selectedRows.includes(idx)}
                                onChange={() => toggleSelectRow(idx)}
                                className="rounded accent-blue-600 w-3.5 h-3.5"
                              />
                            </td>
                            <td className="py-2.5 px-4 font-medium">{item.propertyName}</td>
                            <td className="py-2.5 px-4">{item.unit || item.unitNumber}</td>
                            <td className="py-2.5 px-4 capitalize">{item.item}</td>
                            <td className="py-2.5 px-4">{item.previous ?? 0}</td>
                            <td className="py-2.5 px-4">{item.current ?? 0}</td>
                            <td className="py-2.5 px-4">{item.consumed ?? 0}</td>
                            <td className="py-2.5 px-4">{formatCurrency(item.rate || 0)}</td>
                            <td className="py-2.5 px-4 font-semibold text-emerald-600">
                              {formatCurrency(item.total || 0)}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                              {item.date ? new Date(item.date).toLocaleDateString("en-KE") : "—"}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {item._id && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(item._id)}
                                  title="Delete reading"
                                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
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

      <ActionModals
        modalType={bulkModalOpen ? "bulk_upload_utilities" : null}
        onClose={() => setBulkModalOpen(false)}
      />
    </div>
  );
}
