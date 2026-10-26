import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Search,
  X,
  LayoutGrid,
  Home,
  Users,
  DollarSign,
  Receipt,
  TrendingDown,
  FileSpreadsheet,
  BarChart2,
  Zap,
  Wrench,
  Mail,
  Settings,
  PlusCircle,
  Upload,
  BookOpen,
  ArrowRight,
  Building2,
  Layers,
  Smartphone,
  ChevronRight
} from "lucide-react";
import { TutorialDialog } from "./TutorialDialog";

const TUTORIALS = [
  {
    id: "tut-mpesa",
    title: "How to Record M-Pesa & Bank Payments",
    keywords: "mpesa payment paybill bank deposit money cash receipt",
    description: "Step-by-step instructions on recording manual M-Pesa transactions or matching automated Paybill payments.",
    actionLabel: "Record Payment Now",
    actionType: "modal",
    actionTarget: "record_payment",
    tip: "You can enter the M-Pesa transaction code (e.g. QA12345678) for automatic reconciliation and tenant balance updating.",
    steps: [
      { title: "Open Payment Form", detail: "Click on 'Record Payment' from the top search bar or Financials > Payments page." },
      { title: "Select Tenant & Unit", detail: "Choose the tenant making the payment. Their pending rent invoice will appear automatically." },
      { title: "Enter Amount & Reference", detail: "Input the amount received (KES) and paste the M-Pesa or Bank confirmation code." },
      { title: "Confirm & Generate Receipt", detail: "Click 'Save Payment'. The tenant balance is instantly credited and an SMS receipt is queued." }
    ]
  },
  {
    id: "tut-property",
    title: "How to Add Properties & Units",
    keywords: "property add unit building apartments floors estate landlord",
    description: "How to configure a new residential or commercial property with individual rental units.",
    actionLabel: "Add Property Now",
    actionType: "modal",
    actionTarget: "add_property",
    tip: "You can specify total units count to auto-generate sequential unit numbers like Unit 1, Unit 2, or customize them after creation.",
    steps: [
      { title: "Add Property", detail: "Click 'Add Property' and provide the building name, county/location, and ownership details." },
      { title: "Set Number of Units", detail: "Specify total units (e.g. 10 or 20 units) and default expected monthly rent." },
      { title: "Review in Units Page", detail: "Navigate to Properties > Units to inspect occupancy, assign sub-meters, and verify status." }
    ]
  },
  {
    id: "tut-tenant",
    title: "How to Onboard & Lease to Tenants",
    keywords: "tenant onboard lease rent contract agreement add",
    description: "Add tenant contact details, assign them to a vacant unit, and establish their monthly rent schedule.",
    actionLabel: "Add Tenant Now",
    actionType: "modal",
    actionTarget: "add_tenant",
    tip: "Ensure you provide a valid Kenyan phone number (07... or 254...) so the tenant receives rent invoices and payment reminders.",
    steps: [
      { title: "Open Add Tenant Dialog", detail: "Select 'Add Tenant' from quick actions or the Tenants page." },
      { title: "Fill Tenant Profile", detail: "Enter full name, national ID number, phone number, and email address." },
      { title: "Assign Vacant Unit", detail: "Select an available unit and confirm the agreed monthly rent amount and deposit." },
      { title: "Activate Lease", detail: "Click 'Create Tenant'. The unit is marked as occupied and initial billing begins." }
    ]
  },
  {
    id: "tut-statements",
    title: "How to Generate & Download Tenant Statements",
    keywords: "statement pdf download report letterhead print tenant statement",
    description: "Export clean, branded PDF statements containing payment history, invoice ledger, and current balance.",
    actionLabel: "Go to Statements",
    actionType: "navigate",
    actionTarget: "/reports/statements",
    tip: "MakaziFlow's print engine formats statements with official letterhead, summary metric cards, and clean typography.",
    steps: [
      { title: "Navigate to Statements", detail: "Open Reports > Statements from the sidebar or search bar." },
      { title: "Filter by Property or Tenant", detail: "Choose the specific property or select 'All Properties' and your desired date range." },
      { title: "Click Download PDF", detail: "Click the blue 'Download PDF' button. An isolated, print-ready document window will generate." },
      { title: "Print or Save as PDF", detail: "Select 'Save as PDF' in the print preview dialog to email or share with your tenant." }
    ]
  },
  {
    id: "tut-invoices",
    title: "How to Generate Monthly Rent Invoices",
    keywords: "invoice billing rent bill bulk invoice generate water charges",
    description: "Create individual or bulk monthly invoices for all occupied units on the 1st of every month.",
    actionLabel: "Go to Invoices",
    actionType: "navigate",
    actionTarget: "/financials/invoices",
    tip: "You can click 'Bulk Add Invoices' to automatically bill all active tenants for the current billing cycle at once.",
    steps: [
      { title: "Go to Invoices Page", detail: "Open Financials > Invoices from the sidebar." },
      { title: "Select Bulk or Single Invoice", detail: "Click 'Bulk Add Invoices' to generate invoices for all active leases." },
      { title: "Review Line Items", detail: "Confirm monthly base rent, water utility bills, garbage collection, and due date." },
      { title: "Dispatch to Tenants", detail: "Invoices are saved to tenant ledgers and SMS reminders are scheduled." }
    ]
  },
  {
    id: "tut-reminders",
    title: "How to Send Rent Reminders via SMS & Email",
    keywords: "reminder sms email alert overdue arrears notification",
    description: "Schedule automated rent reminders to notify tenants before the 5th and chase overdue balances.",
    actionLabel: "Go to Reminders",
    actionType: "navigate",
    actionTarget: "/reminders",
    tip: "Automated SMS reminders reduce rent arrears by over 38% by providing tenants with direct M-Pesa Paybill instructions.",
    steps: [
      { title: "Open Reminders", detail: "Navigate to Communication > Reminders in the navigation menu." },
      { title: "Choose Reminder Type", detail: "Select between Upcoming Rent Due, Rent Overdue, or Custom Announcement." },
      { title: "Customize SMS Template", detail: "Edit the message template with dynamic tags like {tenant_name} and {amount_due}." },
      { title: "Send or Schedule", detail: "Dispatch immediately or enable the daily automatic reminder cron job." }
    ]
  },
  {
    id: "tut-utilities",
    title: "How to Record & Bill Utility Sub-Meters",
    keywords: "utility water electricity meter sub-meter reading bill",
    description: "Log water or electricity meter units consumed and auto-calculate billing amounts per tenant.",
    actionLabel: "Go to Utilities",
    actionType: "navigate",
    actionTarget: "/utilities",
    tip: "The system automatically subtracts the previous reading from the current reading and multiplies by your unit tariff.",
    steps: [
      { title: "Open Utilities", detail: "Select Utilities from the navigation sidebar." },
      { title: "Input Current Readings", detail: "Enter the current meter unit reading for each occupied unit." },
      { title: "Review Total Units & Cost", detail: "The platform calculates consumption and applies the rate per unit (e.g. KES 150/unit)." },
      { title: "Attach to Invoices", detail: "Add the utility charge to the tenant's monthly invoice with one click." }
    ]
  }
];

const STATIC_PAGES = [
  { name: "Dashboard", path: "/", icon: LayoutGrid, category: "Pages", desc: "Executive overview of occupancy, payments & arrears" },
  { name: "Properties", path: "/properties", icon: Building2, category: "Pages", desc: "Manage buildings, locations & property groupings" },
  { name: "Units", path: "/units", icon: Layers, category: "Pages", desc: "All rental units, rent amounts & vacancy status" },
  { name: "Tenants", path: "/tenants", icon: Users, category: "Pages", desc: "Tenant directories, leases, deposits & contact info" },
  { name: "Payments", path: "/financials/payments", icon: DollarSign, category: "Pages", desc: "M-Pesa reconciliation, receipts & transaction ledger" },
  { name: "Invoices", path: "/financials/invoices", icon: Receipt, category: "Pages", desc: "Monthly rent invoices, utility bills & bulk billing" },
  { name: "Expenses", path: "/financials/expenses", icon: TrendingDown, category: "Pages", desc: "Operating costs, repairs, staff salaries & utilities" },
  { name: "Statements", path: "/reports/statements", icon: FileSpreadsheet, category: "Pages", desc: "Print-ready tenant statements and P&L statements" },
  { name: "Insights & Reports", path: "/reports/insights", icon: BarChart2, category: "Pages", desc: "Revenue analytics, collection rates & occupancy trends" },
  { name: "Utilities", path: "/utilities", icon: Zap, category: "Pages", desc: "Water and electricity sub-meter tracking and billing" },
  { name: "Maintenance", path: "/maintenance", icon: Wrench, category: "Pages", desc: "Repair requests, contractor work orders & tracking" },
  { name: "Reminders & Communication", path: "/reminders", icon: Mail, category: "Pages", desc: "Automated SMS payment reminders & announcements" },
  { name: "Settings", path: "/settings", icon: Settings, category: "Pages", desc: "Account preferences, M-Pesa setup & custom templates" }
];

const STATIC_ACTIONS = [
  { name: "Add Property", actionType: "modal", target: "add_property", icon: PlusCircle, category: "Actions", desc: "Register a new building or estate" },
  { name: "Add Unit", actionType: "modal", target: "add_unit", icon: PlusCircle, category: "Actions", desc: "Add a rental unit to an existing property" },
  { name: "Add Tenant", actionType: "modal", target: "add_tenant", icon: PlusCircle, category: "Actions", desc: "Onboard tenant and assign unit" },
  { name: "Record Payment", actionType: "modal", target: "record_payment", icon: DollarSign, category: "Actions", desc: "Log M-Pesa or bank rent payment" },
  { name: "Add Expense", actionType: "modal", target: "add_expense", icon: TrendingDown, category: "Actions", desc: "Record operational cost or repair fee" },
  { name: "Upload Bank Statement", actionType: "modal", target: "upload_bank_statement", icon: Upload, category: "Actions", desc: "Import CSV/PDF bank statement for reconciliation" },
  { name: "Create Invoice", actionType: "navigate", target: "/financials/invoices?action=add", icon: Receipt, category: "Actions", desc: "Generate a new rent or utility invoice" },
  { name: "Send Rent Reminders", actionType: "navigate", target: "/reminders", icon: Mail, category: "Actions", desc: "Dispatch SMS & Email payment notifications" }
];

export function GlobalSearchBar({ onOpenModal }) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTutorial, setActiveTutorial] = useState(null);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const mobileInputRef = useRef(null);

  // Live queries for live properties, units, and tenants
  const { data: properties = [] } = useQuery({
    queryKey: ["properties"],
    queryFn: api.getProperties,
    staleTime: 60 * 1000
  });

  const { data: units = [] } = useQuery({
    queryKey: ["units"],
    queryFn: () => api.getUnits(),
    staleTime: 60 * 1000
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: api.getTenants,
    staleTime: 60 * 1000
  });

  // Global keyboard shortcut listener (Ctrl+K or Cmd+K or '/')
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      } else if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered results
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      // Default suggested items when empty
      return {
        pages: STATIC_PAGES.slice(0, 4),
        actions: STATIC_ACTIONS.slice(0, 4),
        properties: (Array.isArray(properties) ? properties : []).slice(0, 3).map((p) => ({
          name: p.name,
          category: "Properties",
          sub: p.location || "Kenya",
          path: `/properties?search=${encodeURIComponent(p.name)}`
        })),
        tenants: (Array.isArray(tenants) ? tenants : []).slice(0, 3).map((t) => ({
          name: t.name || "Tenant",
          category: "Tenants",
          sub: `Unit ${t.unitId?.unitNumber || t.unitNumber || "N/A"} • ${t.phone || ""}`,
          path: `/tenants?search=${encodeURIComponent(t.name || "")}`
        })),
        tutorials: TUTORIALS.slice(0, 3)
      };
    }

    const pages = STATIC_PAGES.filter(
      (p) => p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)
    );

    const actions = STATIC_ACTIONS.filter(
      (a) => a.name.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q)
    );

    const propList = (Array.isArray(properties) ? properties : [])
      .filter((p) => p.name?.toLowerCase().includes(q) || p.location?.toLowerCase().includes(q))
      .slice(0, 4)
      .map((p) => ({
        name: p.name,
        category: "Properties",
        sub: p.location || "Kenya",
        path: `/properties?search=${encodeURIComponent(p.name)}`
      }));

    const unitList = (Array.isArray(units) ? units : [])
      .filter((u) => {
        const num = String(u.unitNumber || u.name || "").toLowerCase();
        const prop = String(u.propertyId?.name || u.propertyName || "").toLowerCase();
        return num.includes(q) || prop.includes(q);
      })
      .slice(0, 4)
      .map((u) => ({
        name: `Unit ${u.unitNumber || u.name}`,
        category: "Units",
        sub: u.propertyId?.name || u.propertyName || "Rental Unit",
        path: `/units?search=${encodeURIComponent(u.unitNumber || u.name || "")}`
      }));

    const tenantList = (Array.isArray(tenants) ? tenants : [])
      .filter(
        (t) =>
          t.name?.toLowerCase().includes(q) ||
          t.phone?.toLowerCase().includes(q) ||
          t.email?.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((t) => ({
        name: t.name,
        category: "Tenants",
        sub: `Unit ${t.unitId?.unitNumber || t.unitNumber || "N/A"} • ${t.phone || ""}`,
        path: `/tenants?search=${encodeURIComponent(t.name || "")}`
      }));

    const tutorials = TUTORIALS.filter(
      (tut) =>
        tut.title.toLowerCase().includes(q) ||
        tut.keywords.toLowerCase().includes(q) ||
        tut.description.toLowerCase().includes(q)
    );

    return {
      pages,
      actions,
      properties: propList,
      units: unitList,
      tenants: tenantList,
      tutorials
    };
  }, [query, properties, units, tenants]);

  // Flattened array for keyboard cycling
  const flattenedItems = useMemo(() => {
    const list = [];
    if (filteredResults.pages?.length) {
      filteredResults.pages.forEach((item) => list.push({ ...item, type: "page" }));
    }
    if (filteredResults.actions?.length) {
      filteredResults.actions.forEach((item) => list.push({ ...item, type: "action" }));
    }
    if (filteredResults.properties?.length) {
      filteredResults.properties.forEach((item) => list.push({ ...item, type: "property" }));
    }
    if (filteredResults.units?.length) {
      filteredResults.units.forEach((item) => list.push({ ...item, type: "unit" }));
    }
    if (filteredResults.tenants?.length) {
      filteredResults.tenants.forEach((item) => list.push({ ...item, type: "tenant" }));
    }
    if (filteredResults.tutorials?.length) {
      filteredResults.tutorials.forEach((item) => list.push({ ...item, type: "tutorial" }));
    }
    return list;
  }, [filteredResults]);

  const handleSelectItem = (item) => {
    setIsOpen(false);
    setIsMobileSearchOpen(false);
    setQuery("");

    if (!item) return;

    if (item.type === "page" || item.path) {
      setLocation(item.path);
      return;
    }

    if (item.type === "action") {
      if (item.actionType === "modal") {
        if (onOpenModal) onOpenModal(item.target);
      } else if (item.actionType === "navigate") {
        setLocation(item.target);
      }
      return;
    }

    if (item.type === "tutorial") {
      setActiveTutorial(item);
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % (flattenedItems.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + (flattenedItems.length || 1)) % (flattenedItems.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flattenedItems[activeIndex]) {
        handleSelectItem(flattenedItems[activeIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleTutorialAction = (actionType, actionTarget) => {
    if (actionType === "modal" && onOpenModal) {
      onOpenModal(actionTarget);
    } else if (actionType === "navigate") {
      setLocation(actionTarget);
    }
  };

  const totalResultsCount = flattenedItems.length;

  return (
    <>
      {/* Search Input Container */}
      <div ref={containerRef} className="relative w-64 md:w-80 lg:w-96">
        {/* Desktop / Tablet Search Input */}
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setActiveIndex(0);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search... Pages, Actions, Tutorials"
            className="w-full h-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-16 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-2xs transition-all"
            aria-label="Global search across pages, actions, properties, tenants, and tutorials"
          />

          <div className="absolute right-2.5 flex items-center gap-1.5 pointer-events-none">
            {query ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="pointer-events-auto p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-700/60 rounded border border-slate-200 dark:border-slate-600">
                <span className="text-[9px]">⌘</span>K
              </kbd>
            )}
            <Search className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* Dropdown Floating Palette */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-10 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 max-h-[75vh] flex flex-col">
            {/* Header info */}
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>{query ? `Results for "${query}"` : "Suggested Pages & Actions"}</span>
              <span className="text-[10px] text-slate-400">
                {totalResultsCount} items • Esc to close
              </span>
            </div>

            {/* Scrollable list */}
            <div className="overflow-y-auto p-1.5 space-y-3 divide-y divide-slate-100 dark:divide-slate-800/60">
              {totalResultsCount === 0 && (
                <div className="py-8 text-center text-xs text-slate-500">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">No matching results found</p>
                  <p className="mt-1 text-slate-400">
                    Try searching for "Properties", "Tenants", "Payments", or "How to record..."
                  </p>
                </div>
              )}

              {/* Pages */}
              {filteredResults.pages?.length > 0 && (
                <div className="pt-1.5 first:pt-0">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Navigation Pages</span>
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                      {filteredResults.pages.length}
                    </span>
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {filteredResults.pages.map((item) => {
                      const IconComponent = item.icon || LayoutGrid;
                      const globalIdx = flattenedItems.findIndex(
                        (fi) => fi.type === "page" && fi.name === item.name
                      );
                      const isSelected = activeIndex === globalIdx;

                      return (
                        <div
                          key={item.name}
                          onClick={() => handleSelectItem({ ...item, type: "page" })}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition ${
                            isSelected
                              ? "bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-medium"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`p-1.5 rounded-md ${isSelected ? "bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                              <IconComponent className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate">
                              <p className="truncate font-semibold">{item.name}</p>
                              {item.desc && (
                                <p className="text-[10px] text-slate-400 truncate">{item.desc}</p>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              {filteredResults.actions?.length > 0 && (
                <div className="pt-2">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center justify-between">
                    <span>Quick Actions</span>
                    <span className="text-[9px] bg-teal-50 dark:bg-teal-950/50 px-1.5 py-0.5 rounded text-teal-600 dark:text-teal-400">
                      ⚡ Action
                    </span>
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {filteredResults.actions.map((item) => {
                      const IconComponent = item.icon || PlusCircle;
                      const globalIdx = flattenedItems.findIndex(
                        (fi) => fi.type === "action" && fi.name === item.name
                      );
                      const isSelected = activeIndex === globalIdx;

                      return (
                        <div
                          key={item.name}
                          onClick={() => handleSelectItem({ ...item, type: "action" })}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition ${
                            isSelected
                              ? "bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-medium"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`p-1.5 rounded-md ${isSelected ? "bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300" : "bg-teal-50 dark:bg-teal-950/50 text-teal-600"}`}>
                              <IconComponent className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate">
                              <p className="truncate font-semibold">{item.name}</p>
                              {item.desc && (
                                <p className="text-[10px] text-slate-400 truncate">{item.desc}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800 shrink-0">
                            Execute
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Live Properties */}
              {filteredResults.properties?.length > 0 && (
                <div className="pt-2">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Properties</span>
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                      {filteredResults.properties.length}
                    </span>
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {filteredResults.properties.map((item) => {
                      const globalIdx = flattenedItems.findIndex(
                        (fi) => fi.type === "property" && fi.name === item.name
                      );
                      const isSelected = activeIndex === globalIdx;

                      return (
                        <div
                          key={item.name}
                          onClick={() => handleSelectItem({ ...item, type: "property" })}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition ${
                            isSelected
                              ? "bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-medium"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                              <Building2 className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate">
                              <p className="truncate font-semibold">{item.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{item.sub}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-blue-600 font-medium shrink-0">View Property</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Live Units */}
              {filteredResults.units?.length > 0 && (
                <div className="pt-2">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Units</span>
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                      {filteredResults.units.length}
                    </span>
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {filteredResults.units.map((item) => {
                      const globalIdx = flattenedItems.findIndex(
                        (fi) => fi.type === "unit" && fi.name === item.name
                      );
                      const isSelected = activeIndex === globalIdx;

                      return (
                        <div
                          key={item.name}
                          onClick={() => handleSelectItem({ ...item, type: "unit" })}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition ${
                            isSelected
                              ? "bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-medium"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                              <Layers className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate">
                              <p className="truncate font-semibold">{item.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{item.sub}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-indigo-600 font-medium shrink-0">View Unit</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Live Tenants */}
              {filteredResults.tenants?.length > 0 && (
                <div className="pt-2">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Tenants</span>
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                      {filteredResults.tenants.length}
                    </span>
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {filteredResults.tenants.map((item) => {
                      const globalIdx = flattenedItems.findIndex(
                        (fi) => fi.type === "tenant" && fi.name === item.name
                      );
                      const isSelected = activeIndex === globalIdx;

                      return (
                        <div
                          key={item.name}
                          onClick={() => handleSelectItem({ ...item, type: "tenant" })}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition ${
                            isSelected
                              ? "bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-medium"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                              <Users className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate">
                              <p className="truncate font-semibold">{item.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{item.sub}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-emerald-600 font-medium shrink-0">View Tenant</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tutorials & Guides */}
              {filteredResults.tutorials?.length > 0 && (
                <div className="pt-2">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center justify-between">
                    <span>Tutorials & Guides</span>
                    <span className="text-[9px] bg-purple-50 dark:bg-purple-950/50 px-1.5 py-0.5 rounded text-purple-600 dark:text-purple-400">
                      📖 Guide
                    </span>
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {filteredResults.tutorials.map((item) => {
                      const globalIdx = flattenedItems.findIndex(
                        (fi) => fi.type === "tutorial" && fi.title === item.title
                      );
                      const isSelected = activeIndex === globalIdx;

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectItem({ ...item, type: "tutorial" })}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition ${
                            isSelected
                              ? "bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-medium"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                              <BookOpen className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate">
                              <p className="truncate font-semibold">{item.title}</p>
                              <p className="text-[10px] text-slate-400 truncate">{item.description}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800 shrink-0">
                            Open Guide
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Keyboard Guide */}
            <div className="p-2 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <div className="flex items-center gap-3">
                <span>↑↓ to navigate</span>
                <span>↵ to select</span>
                <span>esc to dismiss</span>
              </div>
              <span className="font-medium text-teal-600 dark:text-teal-400">MakaziFlow Search</span>
            </div>
          </div>
        )}
      </div>

      {/* Tutorial Viewer Dialog */}
      <TutorialDialog
        tutorial={activeTutorial}
        isOpen={Boolean(activeTutorial)}
        onClose={() => setActiveTutorial(null)}
        onExecuteAction={handleTutorialAction}
      />
    </>
  );
}
