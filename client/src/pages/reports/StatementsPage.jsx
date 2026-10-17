import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { usePreferences } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Minus, ChevronDown, Check } from "lucide-react";
import { exportToPDF, generateCSVReport } from "@/lib/reports";

export default function StatementsPage() {
  const { toast } = useToast();
  const { formatCurrency } = usePreferences();

  // Active statement type on the left
  const [activeReport, setActiveReport] = useState("tenant_statement");

  // Filters State
  const [selectedProperty, setSelectedProperty] = useState("all");
  const [selectedPropertiesInput, setSelectedPropertiesInput] = useState("");
  const [selectAllProperties, setSelectAllProperties] = useState(false);
  const [selectedGrouping, setSelectedGrouping] = useState("");
  const [searchDeletedTenants, setSearchDeletedTenants] = useState("");
  const [selectedTenant, setSelectedTenant] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startMonthYear, setStartMonthYear] = useState("");
  const [startYear, setStartYear] = useState("");

  // Checkboxes
  const [showDeletedTenants, setShowDeletedTenants] = useState(false);
  const [showExpensesNotLinked, setShowExpensesNotLinked] = useState(false);
  const [selectAllColumns, setSelectAllColumns] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [selectedGraphs, setSelectedGraphs] = useState([]);

  // Collapsible cards
  const [collapseFilters, setCollapseFilters] = useState(false);
  const [collapseReport, setCollapseReport] = useState(false);
  const [collapseGraphs, setCollapseGraphs] = useState(false);

  // Queries
  const { data: properties = [] } = useQuery({
    queryKey: ["properties"],
    queryFn: api.getProperties
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: api.getTenants
  });

  const reportItems = [
    { id: "tenant_statement", label: "Tenant Statement" },
    { id: "property_statements", label: "Property Statements", badge: "Multi / single" },
    { id: "arrears_report", label: "Arrears Report" },
    { id: "expenses_report", label: "Expenses Report" },
    { id: "month_on_month", label: "Month on Month Report" },
    { id: "year_on_year", label: "Year on Year Report" },
    { id: "property_grouping", label: "Property Grouping Report" },
    { id: "deleted_tenants", label: "Deleted Tenants Report" },
    { id: "deposits_report", label: "Deposits Report" },
    { id: "payment_statement", label: "Payment Statement" }
  ];

  const currentReportObj = reportItems.find((r) => r.id === activeReport) || reportItems[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    toast({
      title: "Generating Statement",
      description: `Loading statement data for ${currentReportObj.label}...`
    });
  };

  const handleDownloadPDF = () => {
    toast({
      title: "Downloading PDF",
      description: `Exporting ${currentReportObj.label} to PDF.`
    });
    exportToPDF();
  };

  const handleDownloadExcel = () => {
    toast({
      title: "Downloading Excel",
      description: `Exporting ${currentReportObj.label} to CSV.`
    });
    generateCSVReport("payments");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* 2-Column Layout: Left statement types + Right Filters & Table */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* LEFT COLUMN: Vertical Reports Nav */}
        <aside className="w-full md:w-60 shrink-0 space-y-1">
          {reportItems.map((item) => {
            const isActive = activeReport === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveReport(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left ${
                  isActive
                    ? "bg-[#e8ebf7] dark:bg-slate-800 text-[#0b1065] dark:text-blue-400 font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-600 text-white font-normal">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* RIGHT COLUMN: Filters Card + Report Display Card(s) */}
        <main className="flex-1 min-w-0 w-full space-y-4">
          {/* Filters Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer"
              onClick={() => setCollapseFilters(!collapseFilters)}
            >
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Filters
              </h4>
              <Minus className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {!collapseFilters && (
              <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
                {/* ──────────────── 1. TENANT STATEMENT ──────────────── */}
                {activeReport === "tenant_statement" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Select Property
                        </label>
                        <select
                          value={selectedProperty}
                          onChange={(e) => setSelectedProperty(e.target.value)}
                          className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        >
                          <option value="all">No properties yet — add one</option>
                          {properties.map((p) => (
                            <option key={p._id || p.id} value={p._id || p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Select Tenant
                        </label>
                        <input
                          type="text"
                          placeholder=""
                          value={selectedTenant}
                          onChange={(e) => setSelectedTenant(e.target.value)}
                          className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-600 dark:text-slate-400 font-medium">
                        Select Date
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    </div>
                  </div>
                )}

                {/* ──────────────── 2. PROPERTY STATEMENTS (MULTI / SINGLE) ──────────────── */}
                {activeReport === "property_statements" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Select Properties
                        </label>
                        <input
                          type="text"
                          value={selectedPropertiesInput}
                          onChange={(e) => setSelectedPropertiesInput(e.target.value)}
                          className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs focus:outline-none focus:border-blue-500"
                        />
                        <label className="flex items-center gap-2 cursor-pointer mt-1">
                          <input
                            type="checkbox"
                            checked={selectAllProperties}
                            onChange={(e) => setSelectAllProperties(e.target.checked)}
                            className="rounded accent-blue-600 w-3.5 h-3.5"
                          />
                          <span className="text-slate-600 dark:text-slate-400 text-xs">
                            Select all properties
                          </span>
                        </label>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Select Date:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            placeholder="Start date"
                            className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs focus:outline-none"
                          />
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            placeholder="End date"
                            className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showDeletedTenants}
                          onChange={(e) => setShowDeletedTenants(e.target.checked)}
                          className="rounded accent-blue-600 w-3.5 h-3.5"
                        />
                        <span className="text-slate-600 dark:text-slate-400 text-xs">
                          Show Deleted Tenants
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showExpensesNotLinked}
                          onChange={(e) => setShowExpensesNotLinked(e.target.checked)}
                          className="rounded accent-blue-600 w-3.5 h-3.5"
                        />
                        <span className="text-slate-600 dark:text-slate-400 text-xs">
                          Show Expenses not linked to any property
                        </span>
                      </label>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="text-slate-500 text-xs">
                        Select Columns (optional):
                      </label>
                      <div className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md flex items-center justify-between px-3 cursor-pointer">
                        <span className="text-slate-400 text-xs">Choose columns...</span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-slate-600 dark:text-slate-400 text-xs">
                          Select All Columns
                        </span>
                        <input
                          type="checkbox"
                          checked={selectAllColumns}
                          onChange={(e) => setSelectAllColumns(e.target.checked)}
                          className="rounded accent-blue-600 w-3.5 h-3.5"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ──────────────── 3. ARREARS REPORT ──────────────── */}
                {activeReport === "arrears_report" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Select Property
                        </label>
                        <select
                          value={selectedProperty}
                          onChange={(e) => setSelectedProperty(e.target.value)}
                          className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs focus:outline-none"
                        >
                          <option value="all">No properties yet — add one</option>
                          {properties.map((p) => (
                            <option key={p._id || p.id} value={p._id || p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Select Date:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            placeholder="Start date"
                            className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs focus:outline-none"
                          />
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            placeholder="End date"
                            className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 dark:text-slate-400 text-xs">
                        Show Deleted Tenants
                      </span>
                      <input
                        type="checkbox"
                        checked={showDeletedTenants}
                        onChange={(e) => setShowDeletedTenants(e.target.checked)}
                        className="rounded accent-blue-600 w-3.5 h-3.5"
                      />
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="text-slate-500 text-xs">
                        Select Columns (optional):
                      </label>
                      <div className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md flex items-center justify-between px-3 cursor-pointer">
                        <span className="text-slate-400 text-xs">Choose columns...</span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-slate-600 dark:text-slate-400 text-xs">
                          Select All Columns
                        </span>
                        <input
                          type="checkbox"
                          checked={selectAllColumns}
                          onChange={(e) => setSelectAllColumns(e.target.checked)}
                          className="rounded accent-blue-600 w-3.5 h-3.5"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ──────────────── 4. EXPENSES REPORT ──────────────── */}
                {activeReport === "expenses_report" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Select Property
                        </label>
                        <select
                          value={selectedProperty}
                          onChange={(e) => setSelectedProperty(e.target.value)}
                          className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs focus:outline-none"
                        >
                          <option value="all">No properties yet — add one</option>
                          {properties.map((p) => (
                            <option key={p._id || p.id} value={p._id || p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Select Date:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            placeholder="Start date"
                            className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs focus:outline-none"
                          />
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            placeholder="End date"
                            className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ──────────────── 5. MONTH ON MONTH REPORT ──────────────── */}
                {activeReport === "month_on_month" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Select Property
                        </label>
                        <select
                          value={selectedProperty}
                          onChange={(e) => setSelectedProperty(e.target.value)}
                          className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs focus:outline-none"
                        >
                          <option value="all">No properties yet — add one</option>
                          {properties.map((p) => (
                            <option key={p._id || p.id} value={p._id || p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Select Date:
                        </label>
                        <div>
                          <input
                            type="month"
                            value={startMonthYear}
                            onChange={(e) => setStartMonthYear(e.target.value)}
                            placeholder="Select Start Month/Year"
                            className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="text-slate-500 text-xs">
                        Select Graphs to be added in the pdf (optional):
                      </label>
                      <div className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md flex items-center justify-between px-3 cursor-pointer">
                        <span className="text-slate-400 text-xs">
                          Select graphs to be included in report
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ──────────────── 6. YEAR ON YEAR REPORT ──────────────── */}
                {activeReport === "year_on_year" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Select Property
                        </label>
                        <select
                          value={selectedProperty}
                          onChange={(e) => setSelectedProperty(e.target.value)}
                          className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs focus:outline-none"
                        >
                          <option value="all">No properties yet — add one</option>
                          {properties.map((p) => (
                            <option key={p._id || p.id} value={p._id || p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Select Date:
                        </label>
                        <div>
                          <input
                            type="number"
                            min="2000"
                            max="2099"
                            placeholder="Select Start Year"
                            value={startYear}
                            onChange={(e) => setStartYear(e.target.value)}
                            className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="text-slate-500 text-xs">
                        Select Graphs to be added in the pdf (optional):
                      </label>
                      <div className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md flex items-center justify-between px-3 cursor-pointer">
                        <span className="text-slate-400 text-xs">
                          Select graphs to be included in report
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ──────────────── 7. PROPERTY GROUPING REPORT ──────────────── */}
                {activeReport === "property_grouping" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Select Grouping(s)
                        </label>
                        <input
                          type="text"
                          value={selectedGrouping}
                          onChange={(e) => setSelectedGrouping(e.target.value)}
                          className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Select Date:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            placeholder="Start date"
                            className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs focus:outline-none"
                          />
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            placeholder="End date"
                            className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="text-slate-500 text-xs">
                        Select Graphs to be added in the pdf (optional):
                      </label>
                      <div className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md flex items-center justify-between px-3 cursor-pointer">
                        <span className="text-slate-400 text-xs">
                          Select graphs to be included in report
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ──────────────── 8. DELETED TENANTS REPORT ──────────────── */}
                {activeReport === "deleted_tenants" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Select Property
                        </label>
                        <select
                          value={selectedProperty}
                          onChange={(e) => setSelectedProperty(e.target.value)}
                          className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs focus:outline-none"
                        >
                          <option value="all">No properties yet — add one</option>
                          {properties.map((p) => (
                            <option key={p._id || p.id} value={p._id || p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Search Deleted Tenants (optional)
                        </label>
                        <input
                          type="text"
                          value={searchDeletedTenants}
                          onChange={(e) => setSearchDeletedTenants(e.target.value)}
                          className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ──────────────── 9. DEPOSITS REPORT ──────────────── */}
                {activeReport === "deposits_report" && (
                  <div className="space-y-4">
                    <div className="space-y-1 max-w-sm">
                      <label className="text-slate-600 dark:text-slate-400 font-medium">
                        Select Property
                      </label>
                      <select
                        value={selectedProperty}
                        onChange={(e) => setSelectedProperty(e.target.value)}
                        className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs focus:outline-none"
                      >
                        <option value="all">No properties yet — add one from</option>
                        {properties.map((p) => (
                          <option key={p._id || p.id} value={p._id || p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-slate-600 dark:text-slate-400 text-xs">
                        Show Deleted Tenants
                      </span>
                      <input
                        type="checkbox"
                        checked={showDeletedTenants}
                        onChange={(e) => setShowDeletedTenants(e.target.checked)}
                        className="rounded accent-blue-600 w-3.5 h-3.5"
                      />
                    </div>
                  </div>
                )}

                {/* ──────────────── 10. PAYMENT STATEMENT ──────────────── */}
                {activeReport === "payment_statement" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Select Property
                        </label>
                        <select
                          value={selectedProperty}
                          onChange={(e) => setSelectedProperty(e.target.value)}
                          className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs focus:outline-none"
                        >
                          <option value="all">No properties yet — add one from</option>
                          {properties.map((p) => (
                            <option key={p._id || p.id} value={p._id || p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Select Date:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            placeholder="Start date"
                            className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs focus:outline-none"
                          />
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            placeholder="End date"
                            className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-slate-600 dark:text-slate-400 text-xs">
                        Show Deleted Tenants
                      </span>
                      <input
                        type="checkbox"
                        checked={showDeletedTenants}
                        onChange={(e) => setShowDeletedTenants(e.target.checked)}
                        className="rounded accent-blue-600 w-3.5 h-3.5"
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Button
                    type="submit"
                    className="bg-[#3b4998] hover:bg-[#2c3775] text-white text-xs h-8 px-8 font-medium shadow-none cursor-pointer"
                  >
                    Submit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadPDF}
                    className="text-xs h-8 px-6 text-[#0b1065] border-slate-300 hover:bg-slate-50 cursor-pointer"
                  >
                    Download PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadExcel}
                    className="text-xs h-8 px-6 text-[#0b1065] border-slate-300 hover:bg-slate-50 cursor-pointer"
                  >
                    Download Excel
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Report Output Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer"
              onClick={() => setCollapseReport(!collapseReport)}
            >
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {currentReportObj.label}
              </h4>
              <Minus className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {!collapseReport && (
              <div className="py-16 text-center text-xs text-slate-400">
                There are no records to display
              </div>
            )}
          </div>

          {/* Secondary Graphs Card for Month on Month / Year on Year / Property Grouping */}
          {activeReport === "month_on_month" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer"
                onClick={() => setCollapseGraphs(!collapseGraphs)}
              >
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Month on Month Graphs
                </h4>
                <Minus className="w-3.5 h-3.5 text-slate-400" />
              </div>
              {!collapseGraphs && (
                <div className="py-16 text-center text-xs text-slate-400">
                  No data available
                </div>
              )}
            </div>
          )}

          {activeReport === "year_on_year" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer"
                onClick={() => setCollapseGraphs(!collapseGraphs)}
              >
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Year On Year Graphs
                </h4>
                <Minus className="w-3.5 h-3.5 text-slate-400" />
              </div>
              {!collapseGraphs && (
                <div className="py-16 text-center text-xs text-slate-400">
                  No data available
                </div>
              )}
            </div>
          )}

          {activeReport === "property_grouping" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer"
                onClick={() => setCollapseGraphs(!collapseGraphs)}
              >
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Property Grouping Graphs
                </h4>
                <Minus className="w-3.5 h-3.5 text-slate-400" />
              </div>
              {!collapseGraphs && (
                <div className="py-16 text-center text-xs text-slate-400">
                  No data available
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
