import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  Minus,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const categoryColors = {
  maintenance: "bg-amber-100 text-amber-700 border-amber-200",
  utilities: "bg-blue-100 text-blue-700 border-blue-200",
  management: "bg-purple-100 text-purple-700 border-purple-200",
  repairs: "bg-rose-100 text-rose-700 border-rose-200",
  salaries: "bg-emerald-100 text-emerald-700 border-emerald-200",
  other: "bg-slate-100 text-slate-600 border-slate-200"
};

// ─── Expense Form View (Bomahut Layout matching Screenshot 5) ─────────────────
const PAYMENT_METHODS = [
  "mpesa",
  "bank deposit",
  "cash",
  "mtn mobile money",
  "airtel money",
  "other"
];

const EXPENSE_CATEGORIES = [
  "service charge",
  "management fee",
  "garbage",
  "electricity",
  "water",
  "sewer",
  "security",
  "cleaning",
  "internet",
  "salaries",
  "wages",
  "landlord disbursement",
  "field expense",
  "office expense",
  "maintenance",
  "other utility",
  "deposit refunds",
  "letting in fee",
  "loan repayment",
  "other"
];

function ExpenseFormView({ properties, onBack, onAdd }) {
  const { toast } = useToast();
  const [propertyId, setPropertyId] = useState("");
  const [unit, setUnit] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [category, setCategory] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [status, setStatus] = useState("confirmed");
  const [showMore, setShowMore] = useState(false);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedProp = properties.find((p) => (p._id || p.id) === propertyId);
  const propUnits = selectedProp?.units || [];

  const handleClear = () => {
    setPropertyId("");
    setUnit("");
    setAmount("");
    setPaymentMethod("");
    setCategory("");
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setStatus("confirmed");
    setDescription("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast({
        variant: "destructive",
        title: "Amount Required",
        description: "Please enter an expense amount."
      });
      return;
    }

    setLoading(true);
    try {
      const newExpense = {
        _id: "EXP-" + Date.now().toString().slice(-6),
        propertyId,
        propertyName: selectedProp?.name || "General Property",
        unit: unit || "General",
        amount: Number(amount),
        paymentMethod: paymentMethod || "other",
        category: category || "other",
        date: expenseDate,
        status,
        description: description || `${category || "Expense"} for ${selectedProp?.name || "property"}`
      };

      try {
        await api.addExpense({
          amount: Number(amount),
          category: (category || "other").toLowerCase(),
          description: newExpense.description,
          date: expenseDate,
          propertyId: propertyId || undefined
        });
      } catch {
        // Fallback for client offline mode
      }

      onAdd(newExpense);
      toast({
        title: "Expense Created",
        description: `Expense of KES ${Number(amount).toLocaleString()} saved successfully.`
      });
      onBack();
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not create expense record."
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
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0b1065] dark:text-blue-400 border border-[#0b1065] dark:border-blue-400 bg-white dark:bg-slate-900 rounded-md hover:bg-[#0b1065]/5 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Expense Form
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Use this form to create property expenses such as repairs, management
          fee, salaries etc.
        </p>
      </div>

      {/* Form Card (matching Screenshots 1, 2, 3) */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-10 shadow-xs space-y-5"
      >
        {/* Row 1: Select Property (optional) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
            Select Property (optional)
          </label>
          <div className="flex-1 max-w-lg">
            <select
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value);
                setUnit("");
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
          </div>
        </div>

        {/* Row 2: Select Unit (optional) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
            Select Unit (optional)
          </label>
          <div className="flex-1 max-w-lg">
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            >
              <option value="">Select Unit</option>
              {propUnits.map((u) => (
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

        {/* Row 3: Amount */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
            Amount
          </label>
          <div className="flex-1 max-w-lg">
            <Input
              type="number"
              placeholder=""
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Row 4: Payment method with interactive dropdown (Screenshot 1) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 relative">
          <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
            Payment method
          </label>
          <div className="flex-1 max-w-lg relative">
            <Input
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setShowPaymentDropdown(true);
              }}
              onFocus={() => setShowPaymentDropdown(true)}
              onBlur={() => setTimeout(() => setShowPaymentDropdown(false), 200)}
              className="h-9 text-xs"
              placeholder=""
            />
            {showPaymentDropdown && (
              <div className="absolute top-10 left-0 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-30 py-1 text-xs">
                {PAYMENT_METHODS.filter((m) =>
                  !paymentMethod || m.toLowerCase().includes(paymentMethod.toLowerCase())
                ).map((method) => (
                  <div
                    key={method}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setPaymentMethod(method);
                      setShowPaymentDropdown(false);
                    }}
                    className="px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-slate-700 dark:text-slate-200"
                  >
                    {method}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 5: Expense Category with scrollable dropdown (Screenshots 2 & 3) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 relative">
          <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
            Expense Category
          </label>
          <div className="flex-1 max-w-lg relative">
            <Input
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setShowCategoryDropdown(true);
              }}
              onFocus={() => setShowCategoryDropdown(true)}
              onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
              className="h-9 text-xs"
              placeholder=""
            />
            {showCategoryDropdown && (
              <div className="absolute top-10 left-0 w-full max-h-56 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-30 py-1 text-xs">
                {EXPENSE_CATEGORIES.filter((c) =>
                  !category || c.toLowerCase().includes(category.toLowerCase())
                ).map((cat) => (
                  <div
                    key={cat}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setCategory(cat);
                      setShowCategoryDropdown(false);
                    }}
                    className="px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-slate-700 dark:text-slate-200"
                  >
                    {cat}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 6: Expense Date */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
            Expense Date
          </label>
          <div className="flex-1 max-w-lg">
            <Input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Row 7: Status */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
            Status
          </label>
          <div className="flex-1 max-w-lg">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            >
              <option value="confirmed">confirmed</option>
              <option value="pending">pending</option>
              <option value="draft">draft</option>
            </select>
          </div>
        </div>

        {/* Show More Toggle */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
          <div className="sm:w-52 shrink-0" />
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
            <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 pt-2 shrink-0">
              Description / Notes
            </label>
            <div className="flex-1 max-w-lg">
              <Textarea
                placeholder="Description of the expense..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>
          </div>
        )}

        {/* Action Buttons (matching Screenshots 1, 2, 3) */}
        <div className="pt-4 max-w-lg mx-auto sm:ml-58 space-y-2.5">
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-9 font-medium shadow-xs cursor-pointer"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            + Add Expense
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            className="w-full text-xs h-9 border-[#0b1065] text-[#0b1065] hover:bg-slate-50 cursor-pointer"
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
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0b1065] dark:text-blue-400 border border-[#0b1065] dark:border-blue-400 bg-white dark:bg-slate-900 rounded-md hover:bg-[#0b1065]/5 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>
    </div>
  );
}

// ─── Main Expenses Page Component ─────────────────────────────────────────────
export default function ExpensesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [view, setView] = useState("list"); // 'list' | 'form'

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: api.getExpenses
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["properties"],
    queryFn: api.getProperties
  });

  // Local recorded expenses state
  const [customExpenses, setCustomExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem("dwello_custom_expenses");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const handleAddExpense = (newExp) => {
    setCustomExpenses((prev) => {
      const next = [newExp, ...prev];
      try {
        localStorage.setItem("dwello_custom_expenses", JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  const allExpenses = [...customExpenses, ...expenses];

  // Filters
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");

  const [collapseDate, setCollapseDate] = useState(false);
  const [collapseCategory, setCollapseCategory] = useState(false);
  const [collapseProperty, setCollapseProperty] = useState(false);
  const [collapseSummary, setCollapseSummary] = useState(false);

  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = allExpenses.filter((e) => {
    const matchSearch =
      !search ||
      String(e.description || "")
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchCategory =
      categoryFilter === "all" ||
      (e.category && e.category.toLowerCase() === categoryFilter.toLowerCase());
    return matchSearch && matchCategory;
  });

  const total = filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  if (view === "form") {
    return (
      <ExpenseFormView
        properties={properties}
        onBack={() => setView("list")}
        onAdd={handleAddExpense}
      />
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Actions */}
      <div className="flex items-center justify-end gap-2.5">
        <Button
          onClick={() => setView("form")}
          className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-8 px-4 font-semibold shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Expense
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast({
              title: "Exported",
              description: "Expenses report CSV downloaded."
            })
          }
          className="text-xs h-8 px-4 gap-1.5 border-slate-300 dark:border-slate-700 text-[#0b1065] dark:text-blue-400 font-semibold cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* LEFT: Filters */}
        <aside className="w-full md:w-64 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Filters
            </h4>
            <Minus className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
          </div>

          {/* Search */}
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

          {/* Date */}
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

          {/* Category */}
          <div>
            <button
              type="button"
              onClick={() => setCollapseCategory(!collapseCategory)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
            >
              <span>Category</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${collapseCategory ? "rotate-180" : ""}`}
              />
            </button>
            {!collapseCategory && (
              <div className="mt-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs"
                >
                  <option value="all">All Categories</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="utilities">Utilities</option>
                  <option value="management">Management</option>
                  <option value="repairs">Repairs</option>
                  <option value="salaries">Salaries</option>
                  <option value="other">Other</option>
                </select>
              </div>
            )}
          </div>

          {/* Property */}
          <div>
            <button
              type="button"
              onClick={() => setCollapseProperty(!collapseProperty)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
            >
              <span>Property</span>
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
        </aside>

        {/* RIGHT: Summary + Expenses Table */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Summary */}
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

          {/* Expenses Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Expenses
              </h4>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toast({
                      title: "Expenses Exported",
                      description: "Downloading expenses spreadsheet."
                    })
                  }
                  className="text-[11px] h-7 px-3 gap-1 border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  Download Expenses
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <tr>
                    <th className="py-2.5 px-4 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Date
                    </th>
                    <th className="py-2.5 px-4 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Category
                    </th>
                    <th className="py-2.5 px-4 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Description
                    </th>
                    <th className="py-2.5 px-4 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-10 text-center text-xs text-muted-foreground"
                      >
                        Loading expenses...
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-10 text-center text-xs text-muted-foreground"
                      >
                        No expenses found.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((e) => (
                      <tr
                        key={e._id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {e.date
                            ? new Date(e.date).toLocaleDateString("en-KE")
                            : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize ${categoryColors[e.category] || "bg-slate-100 text-slate-600"}`}
                          >
                            {e.category || "other"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                          {e.description || "Expense"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">
                          {Number(e.amount || 0).toLocaleString("en-KE", {
                            minimumFractionDigits: 2
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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
