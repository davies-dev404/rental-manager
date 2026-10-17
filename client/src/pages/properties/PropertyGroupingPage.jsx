import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Plus, ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Trash2,
  ArrowLeft, ChevronDown, ChevronUp, Building2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// ─── Property Grouping Form View (matching Bomahut Screenshot 2) ───────────────
function PropertyGroupingFormView({ properties, onBack, onAdd }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [selectedProps, setSelectedProps] = useState([]);
  const [manager, setManager] = useState("");
  const [hideOptional, setHideOptional] = useState(false);
  const [propDropdownOpen, setPropDropdownOpen] = useState(false);

  const handleClear = () => {
    setName("");
    setSelectedProps([]);
    setManager("");
  };

  const toggleProperty = (propName) => {
    if (selectedProps.includes(propName)) {
      setSelectedProps(selectedProps.filter(p => p !== propName));
    } else {
      setSelectedProps([...selectedProps, propName]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Name Required",
        description: "Please enter a grouping name."
      });
      return;
    }

    const newGroup = {
      id: Date.now().toString(),
      name: name.trim(),
      properties: selectedProps.length > 0 ? selectedProps.join(", ") : "None assigned",
      managers: manager.trim() || "Unassigned",
      propertyCount: selectedProps.length,
      createdAt: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    };

    onAdd(newGroup);
    toast({
      title: "Grouping Created",
      description: `Property grouping "${name}" added successfully.`
    });
    onBack();
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
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Property Grouping Form</h2>
        <p className="text-xs text-slate-500 mt-0.5">Use this form to add property groupings</p>
      </div>

      {/* Form Card (matching Bomahut Screenshot 2) */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-10 shadow-xs space-y-5">
        {/* Row 1: Name */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-48 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
            Name
          </label>
          <div className="flex-1 max-w-lg">
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="grouping name"
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Row 2: Properties */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
          <label className="sm:w-48 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 pt-2 shrink-0">
            Properties
          </label>
          <div className="flex-1 max-w-lg space-y-2">
            <div
              onClick={() => setPropDropdownOpen(!propDropdownOpen)}
              className="w-full min-h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between cursor-pointer"
            >
              <span className={selectedProps.length === 0 ? "text-slate-400" : "text-slate-800 dark:text-slate-200"}>
                {selectedProps.length === 0
                  ? "Please select property(s)"
                  : selectedProps.join(", ")}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
            </div>

            {propDropdownOpen && (
              <div className="border border-slate-200 dark:border-slate-700 rounded-md p-3 bg-slate-50 dark:bg-slate-800/80 max-h-48 overflow-y-auto space-y-2 shadow-xs">
                {properties.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No properties found. Add properties first.</p>
                ) : (
                  properties.map(p => (
                    <label key={p._id || p.id} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedProps.includes(p.name)}
                        onChange={() => toggleProperty(p.name)}
                        className="rounded accent-[#0b1065] w-3.5 h-3.5"
                      />
                      <span>{p.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Hide / Show Toggle */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
          <div className="sm:w-48 shrink-0" />
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

        {/* Row 3: Managers (Optional) */}
        {!hideOptional && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <label className="sm:w-48 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
              Managers (Optional)
            </label>
            <div className="flex-1 max-w-lg">
              <Input
                value={manager}
                onChange={e => setManager(e.target.value)}
                placeholder="Please select manager(s)"
                className="h-9 text-xs"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 max-w-lg mx-auto sm:ml-54 space-y-2.5">
          <Button
            type="submit"
            className="w-full bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-9 font-medium shadow-xs cursor-pointer"
          >
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

// ─── Main Property Grouping Page Component ─────────────────────────────────────
export default function PropertyGroupingPage() {
  const { toast } = useToast();
  const [view, setView] = useState("list"); // 'list' | 'form'
  const [collapseSummary, setCollapseSummary] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Clean state persisted in localStorage (starts EMPTY - NO hardcoded data)
  const [groupings, setGroupings] = useState(() => {
    try {
      const saved = localStorage.getItem("dwello_property_groupings");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem("dwello_property_groupings", JSON.stringify(groupings));
    } catch (e) {
      console.error(e);
    }
  }, [groupings]);

  const { data: properties = [] } = useQuery({
    queryKey: ["properties"],
    queryFn: api.getProperties
  });

  const handleAddGrouping = (newGroup) => {
    setGroupings(prev => [newGroup, ...prev]);
  };

  const handleDeleteGrouping = (id) => {
    setGroupings(prev => prev.filter(g => g.id !== id));
    toast({
      title: "Grouping Removed",
      description: "Property grouping has been deleted."
    });
  };

  if (view === "form") {
    return (
      <PropertyGroupingFormView
        properties={properties}
        onBack={() => setView("list")}
        onAdd={handleAddGrouping}
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(groupings.length / perPage));
  const paginated = groupings.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* ────────────────── TOP ACTIONS BAR ────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0b1065] dark:text-blue-400">Property Grouping</h2>
          <p className="text-xs text-slate-500">Organize and manage property clusters, zones, and portfolios.</p>
        </div>
        <Button
          onClick={() => setView("form")}
          className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-8 px-4 font-semibold shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Grouping
        </Button>
      </div>

      {/* ────────────────── SUMMARY CARD ────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer select-none"
          onClick={() => setCollapseSummary(!collapseSummary)}
        >
          <h4 className="text-sm font-semibold text-[#0b1065] dark:text-blue-400">Summary</h4>
          {collapseSummary ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </div>

        {!collapseSummary && (
          <div className="p-6 text-center">
            <p className="text-xs text-slate-500 font-medium">Total Groupings</p>
            <h3 className="text-3xl font-bold text-[#0b1065] dark:text-blue-400 mt-2">
              {groupings.length}
            </h3>
          </div>
        )}
      </div>

      {/* ────────────────── TABLE CARD ────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-[#0b1065] dark:text-blue-400">Property Groups</h4>
            <span className="text-xs text-slate-400 font-normal">({groupings.length} groups)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <tr>
                <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Name</th>
                <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Properties</th>
                <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Managers</th>
                <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">Date Added</th>
                <th className="py-2.5 px-4 text-right font-semibold text-slate-600 dark:text-slate-400">Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-400 text-xs italic">
                    {groupings.length === 0
                      ? 'No property groupings yet. Click "Add Grouping" to create one.'
                      : "No groupings found."}
                  </td>
                </tr>
              ) : (
                paginated.map(g => (
                  <tr key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200 font-semibold">{g.name}</td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 max-w-60 truncate">{g.properties}</td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{g.managers}</td>
                    <td className="py-2.5 px-4 text-slate-400">{g.createdAt || "-"}</td>
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
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => handleDeleteGrouping(g.id)}
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

        {/* Pagination */}
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
              Showing {groupings.length === 0 ? 0 : (currentPage - 1) * perPage + 1}-
              {Math.min(currentPage * perPage, groupings.length)} of {groupings.length}
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
      </div>
    </div>
  );
}
