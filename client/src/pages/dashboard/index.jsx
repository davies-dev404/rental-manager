import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Info, ChevronRight, CheckCircle2 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import { ActionModals } from "@/components/dashboard/Modals";
import FloatingAIAssistant from "@/components/dashboard/FloatingAIAssistant";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Active modal state
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState({});

  // Date range filter defaults to current month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const today = now.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);

  // Show all arrears toggle
  const [showAllArrears, setShowAllArrears] = useState(false);

  // Banner visibility states (persisted in localStorage)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem("dwello_dismiss_onboarding") !== "true";
  });
  const [showAiBanner, setShowAiBanner] = useState(() => {
    return localStorage.getItem("dwello_dismiss_aibot") !== "true";
  });

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem("dwello_dismiss_onboarding", "true");
  };

  const handleDismissAiBanner = () => {
    setShowAiBanner(false);
    localStorage.setItem("dwello_dismiss_aibot", "true");
  };

  // Live queries from backend
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: api.getStats
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["properties"],
    queryFn: api.getProperties
  });

  const [selectedPropertyId, setSelectedPropertyId] = useState("all");

  const { data: debtors = [], isLoading: isDebtorsLoading } = useQuery({
    queryKey: ["debtors"],
    queryFn: api.getDebtors
  });

  // Calculate live numbers
  const tenantArrears = Number(stats?.outstandingAmount || 0);
  const totalBilled = Number(stats?.expectedMonthlyRent || 0);
  const totalPaid = Number(stats?.collectedThisMonth || 0);
  const advancePayments = 0.0;
  const vacantUnits = Number(stats?.vacantUnits || 0);
  const occupiedUnits = Number(stats?.occupiedUnits || 0);
  const totalUnits = Number(stats?.totalUnits || 0);

  const occupancyRate =
    totalUnits > 0
      ? Math.round((occupiedUnits / totalUnits) * 100)
      : stats?.occupancyRate || 0;

  const collectionRate =
    totalBilled > 0
      ? Math.min(100, Math.round((totalPaid / totalBilled) * 100))
      : 0;

  // Format real debtors list with robust property resolution
  const arrearsList = Array.isArray(debtors)
    ? debtors.map((d, index) => {
        const tObj = d.tenant || d;
        const tenantName = tObj.name || d.name || "Tenant";
        const unitNumber = tObj.unitId?.unitNumber || tObj.unitNumber || d.unitNumber || (typeof d.unitId === "string" ? d.unitId : d.unitId?.unitNumber) || d.unit || "N/A";
        const dueAmount = Number(d.totalDue ?? d.balance ?? d.rentDue ?? tObj.rentAmount ?? d.amount ?? 0);
        const phone = tObj.phone || d.phone || "";
        const id = tObj._id || d._id || String(index);

        return {
          id,
          unit: unitNumber,
          name: tenantName,
          amount: dueAmount,
          phone
        };
      })
    : [];

  const displayedArrears = showAllArrears ? arrearsList : arrearsList.slice(0, 5);

  // Compute actual onboarding progress
  const hasProperties = (properties?.length || 0) > 0;
  const hasUnits = totalUnits > 0;
  const hasTenants = (stats?.totalTenants || 0) > 0;
  const hasPayments = totalPaid > 0;

  const onboardingStepsCompleted = [hasProperties, hasUnits, hasTenants, hasPayments].filter(Boolean).length;
  const onboardingPercent = onboardingStepsCompleted * 25;

  // Monthly Chart Data from backend 6-month trend or current month
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonthName = monthNames[now.getMonth()];

  const chartData =
    stats?.sixMonthTrend && stats.sixMonthTrend.length > 0
      ? stats.sixMonthTrend.map((m) => ({
          month: m.name,
          payments: m.revenue || 0,
          invoices: m.target || 0,
          expenses: m.expenses || 0
        }))
      : [
          {
            month: currentMonthName,
            payments: totalPaid,
            invoices: totalBilled,
            expenses: Number(stats?.expensesThisMonth || 0)
          }
        ];

  const openModal = (type, data = {}) => {
    // Route directly to the real pages & dedicated forms
    if (type === "add_property") {
      setLocation("/properties?action=add");
      return;
    }
    if (type === "record_payment") {
      setLocation("/financials/payments?action=record");
      return;
    }
    if (type === "add_tenant") {
      setLocation("/tenants?action=add");
      return;
    }
    if (type === "add_unit") {
      setLocation("/units?action=add");
      return;
    }
    if (type === "upload_bank_statement") {
      setLocation("/financials/payments?action=upload_statement");
      return;
    }
    if (type === "maintenance") {
      setLocation("/maintenance");
      return;
    }
    if (type === "settings") {
      setLocation("/settings");
      return;
    }
    if (type === "send_reminders") {
      setLocation("/reminders");
      return;
    }
    setModalData(data);
    setActiveModal(type);
  };

  // Custom Chart Tooltip
  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const payments = payload.find((p) => p.dataKey === "payments")?.value || 0;
      const invoices = payload.find((p) => p.dataKey === "invoices")?.value || 0;
      const expenses = payload.find((p) => p.dataKey === "expenses")?.value || 0;

      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md shadow-lg text-xs min-w-42.5 space-y-1 z-50">
          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{label}</p>
          <p className="text-[#1bb934] font-medium">Total payments : {payments.toLocaleString()} KES</p>
          <p className="text-[#070b3b] dark:text-blue-400 font-medium">Total invoices : {invoices.toLocaleString()} KES</p>
          <p className="text-[#7571f2] font-medium">Total expenses : {expenses.toLocaleString()} KES</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      {/* Property Selector Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 shadow-2xs">
        {properties.length === 0 ? (
          <button 
            onClick={() => openModal("add_property")}
            className="flex items-center justify-between w-full text-left font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            <span>No properties yet — click here to add your first property</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Active Property:</span>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="bg-transparent font-medium border-0 focus:ring-0 text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="all">All Properties ({properties.length} Total)</option>
                {properties.map((p) => (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {p.name} ({p.location || "Kenya"})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => openModal("add_property")}
              className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
            >
              + Add Property
            </button>
          </div>
        )}
      </div>

      {/* Stuck on something? Banner */}
      {showAiBanner && (
        <div className="bg-white dark:bg-slate-900 border-l-4 border-l-teal-500 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900 dark:text-white">Stuck on something? Ask MakaaziBot</span>
              <button
                onClick={() => {
                  const el = document.getElementById("open-ai-chat-btn");
                  if (el) el.click();
                }}
                className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
              >
                Ask MakaaziBot
              </button>
            </div>
            <p className="text-[11px] text-slate-500 italic mt-0.5">
              Try "How do I add a payment?" or "How do I remove a tenant who has left?"
            </p>
          </div>
          <button 
            onClick={handleDismissAiBanner}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none cursor-pointer p-1"
            title="Dismiss banner"
          >
            &times;
          </button>
        </div>
      )}

      {/* Onboarding Progress Banner */}
      {showOnboarding && (
        <div className="bg-white dark:bg-slate-900 border-l-4 border-l-blue-500 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900 dark:text-white">
                You have completed <span className="bg-slate-800 text-white px-1.5 py-0.5 rounded text-[10px]">{onboardingPercent}%</span> onboarding
              </span>
              {onboardingPercent < 100 && (
                <button
                  onClick={() => {
                    if (!hasProperties) openModal("add_property");
                    else if (!hasUnits) openModal("add_unit");
                    else if (!hasTenants) openModal("add_tenant");
                    else openModal("record_payment");
                  }}
                  className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
                >
                  {!hasProperties ? "Next: Add Property" : !hasUnits ? "Next: Add Unit" : !hasTenants ? "Next: Add Tenant" : "Next: Record Payment"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                {onboardingStepsCompleted} of 4 setup milestones
              </span>
              <button 
                onClick={handleDismissOnboarding}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none cursor-pointer p-1"
                title="Dismiss onboarding banner"
              >
                &times;
              </button>
            </div>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 mt-2.5 overflow-hidden">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${onboardingPercent}%` }} />
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-400">
            <span>{onboardingPercent}% completed</span>
            <span className="italic">
              {onboardingPercent === 100 
                ? "All core setup milestones reached!" 
                : "Complete properties, units, tenants, and initial payments to finalize onboarding."}
            </span>
          </div>
        </div>
      )}

      {/* ────────────────── ROW 1: Arrears & Advance Payments ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Tenant Arrears (KES) */}
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                  Tenant Arrears (KES)
                </p>
                <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-2">
                  {tenantArrears.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                  <span>{arrearsList.length} tenants with arrears</span>
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                </p>
              </div>

              <div className="flex items-center sm:flex-col gap-2 shrink-0">
                <button
                  onClick={() =>
                    openModal("view_insights", {
                      title: "Arrears Details",
                      type: "arrears",
                      desc: "Detailed record of outstanding balances by tenant."
                    })
                  }
                  className="px-4 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition cursor-pointer w-full text-center"
                >
                  View Details
                </button>
                <button
                  onClick={() => openModal("send_reminders")}
                  className="px-4 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition cursor-pointer w-full text-center"
                >
                  Send Reminders
                </button>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
              <button
                onClick={() =>
                  openModal("view_insights", {
                    title: "Arrears Insights",
                    type: "arrears",
                    desc: "Live debt overview and payment collection metrics."
                  })
                }
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
              >
                View Insights <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Tenant Advance Payments (KES) */}
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                  Tenant Advance Payments (KES)
                </p>
                <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-2">
                  {advancePayments.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                  <span>0 tenants with advance payments</span>
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                </p>
              </div>

              <div className="flex items-center sm:flex-col gap-2 shrink-0">
                <button
                  onClick={() =>
                    openModal("view_insights", {
                      title: "Advance Payments",
                      desc: "Zero advance rent prepaid."
                    })
                  }
                  className="px-4 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition cursor-pointer w-full text-center"
                >
                  View Details
                </button>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
              <button
                onClick={() =>
                  openModal("view_insights", {
                    title: "Advance Payment Insights",
                    desc: "Prepaid rent trends."
                  })
                }
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
              >
                View Insights <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ────────────────── ROW 2: Payments and Invoices & Occupancy ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 3: Payments and Invoices */}
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Payments and Invoices
              </h4>
              {/* Date pickers filter */}
              <div className="mt-3 flex items-center justify-center gap-2 max-w-sm mx-auto">
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 rounded-md px-2.5 py-1.5 text-slate-700 dark:text-slate-300 text-center font-medium"
                  />
                </div>
                <span className="text-slate-400 text-xs">to</span>
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 rounded-md px-2.5 py-1.5 text-slate-700 dark:text-slate-300 text-center font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 py-2">
              {/* Left stats */}
              <div className="space-y-3">
                <div>
                  <p className="text-base font-bold text-slate-900 dark:text-white">
                    {totalBilled.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                  <p className="text-xs text-slate-500">Total Billed</p>
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900 dark:text-white">
                    {totalPaid.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                  <p className="text-xs text-slate-500">Total Paid</p>
                </div>
              </div>

              {/* Middle circular donut progress */}
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#ede9fe"
                    strokeWidth="8"
                    className="dark:stroke-slate-800"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#7571f2"
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * collectionRate) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-bold text-slate-800 dark:text-white">
                    {collectionRate}%
                  </span>
                </div>
              </div>

              {/* Right button */}
              <div>
                <button
                  onClick={() => openModal("record_payment")}
                  className="px-4 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition cursor-pointer text-center"
                >
                  Record Payments
                </button>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
              <button
                onClick={() => (window.location.href = "/payments")}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
              >
                View <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Occupancy */}
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Occupancy
              </h4>
            </div>

            <div className="flex items-center justify-between gap-4 py-2">
              {/* Left stats */}
              <div className="space-y-4">
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {vacantUnits}
                  </p>
                  <p className="text-xs text-slate-500">Vacant</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {occupiedUnits}
                  </p>
                  <p className="text-xs text-slate-500">Occupied</p>
                </div>
              </div>

              {/* Middle circular donut progress */}
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#e2e8f0"
                    strokeWidth="9"
                    className="dark:stroke-slate-800"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#070b3b"
                    strokeWidth="9"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * occupancyRate) / 100}
                    strokeLinecap="butt"
                    className="dark:stroke-blue-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {occupancyRate}%
                  </span>
                </div>
              </div>

              {/* Right buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => setLocation("/tenants?action=add")}
                  className="w-full px-4 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition cursor-pointer text-center"
                >
                  Add Tenants
                </button>
                <button
                  onClick={() => setLocation("/tenants")}
                  className="w-full px-4 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition cursor-pointer text-center"
                >
                  Manage Tenants
                </button>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
              <button
                onClick={() => setLocation("/reports/insights")}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
              >
                View Insights <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ────────────────── ROW 3: Arrears Overview & More Actions ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 5: Arrears Overview Table */}
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col justify-between">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Arrears Overview
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Showing {displayedArrears.length} of {arrearsList.length} tenants with arrears
              </p>
            </div>

            {arrearsList.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  No Overdue Arrears
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  All active tenant rent accounts are up to date! As soon as an invoice becomes overdue, it will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 font-medium">
                      <th className="py-2.5 text-left font-semibold">Unit</th>
                      <th className="py-2.5 text-left font-semibold">Name</th>
                      <th className="py-2.5 text-right font-semibold">Amount</th>
                      <th className="py-2.5 text-center font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {displayedArrears.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 font-semibold text-slate-700 dark:text-slate-200">
                          {tenant.unit}
                        </td>
                        <td className="py-3 text-slate-800 dark:text-slate-100 font-medium">
                          {tenant.name}
                        </td>
                        <td className="py-3 text-right font-medium text-slate-700 dark:text-slate-200">
                          {tenant.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}{" "}
                          KES
                        </td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => openModal("remind_tenant", tenant)}
                            className="px-3.5 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 border border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-full transition cursor-pointer"
                          >
                            Remind
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {arrearsList.length > 5 && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
                <button
                  onClick={() => setShowAllArrears(!showAllArrears)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
                >
                  {showAllArrears ? "Show Less" : "View All Arrears"} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 6: More Actions */}
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col justify-between">
          <CardContent className="p-6">
            <div className="text-center mb-5">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                More Actions
              </h4>
            </div>

            {/* 2-Column Action Buttons Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <button
                onClick={() => setLocation("/utilities")}
                className="py-2.5 px-3 font-medium text-blue-600 dark:text-blue-400 border border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition cursor-pointer text-center"
              >
                Add Utilities
              </button>
              <button
                onClick={() => setLocation("/financials/invoices")}
                className="py-2.5 px-3 font-medium text-blue-600 dark:text-blue-400 border border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition cursor-pointer text-center"
              >
                Add Invoice
              </button>

              <button
                onClick={() => setLocation("/financials/invoices")}
                className="py-2.5 px-3 font-medium text-blue-600 dark:text-blue-400 border border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition cursor-pointer text-center"
              >
                Bulk Add Invoices
              </button>
              <button
                onClick={() => openModal("upload_bank_statement")}
                className="py-2.5 px-3 font-medium text-blue-600 dark:text-blue-400 border border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition cursor-pointer text-center"
              >
                Upload Bank Statement
              </button>

              <button
                onClick={() => setLocation("/tenants?action=add")}
                className="py-2.5 px-3 font-medium text-blue-600 dark:text-blue-400 border border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition cursor-pointer text-center"
              >
                Add Tenant
              </button>
              <button
                onClick={() => setLocation("/units?action=add")}
                className="py-2.5 px-3 font-medium text-blue-600 dark:text-blue-400 border border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition cursor-pointer text-center"
              >
                Add Unit
              </button>

              <button
                onClick={() => setLocation("/properties?action=add")}
                className="py-2.5 px-3 font-medium text-blue-600 dark:text-blue-400 border border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition cursor-pointer text-center"
              >
                Add Property
              </button>
              <button
                onClick={() => setLocation("/tenants")}
                className="py-2.5 px-3 font-medium text-blue-600 dark:text-blue-400 border border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition cursor-pointer text-center"
              >
                Shift Tenant
              </button>

              <button
                onClick={() => setLocation("/financials/invoices")}
                className="py-2.5 px-3 font-medium text-blue-600 dark:text-blue-400 border border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition cursor-pointer text-center"
              >
                Generate Rent Invoices
              </button>
              <button
                onClick={() => setLocation("/financials/invoices")}
                className="py-2.5 px-3 font-medium text-blue-600 dark:text-blue-400 border border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition cursor-pointer text-center"
              >
                Generate Other Bills Invoices
              </button>

              <button
                onClick={() => openModal("send_message")}
                className="py-2.5 px-3 font-medium text-blue-600 dark:text-blue-400 border border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition cursor-pointer text-center"
              >
                Send Message
              </button>
              <button
                onClick={() => setLocation("/settings?tab=team")}
                className="py-2.5 px-3 font-medium text-blue-600 dark:text-blue-400 border border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition cursor-pointer text-center"
              >
                Add To Team
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ────────────────── ROW 4: Subscription & SMS Balance ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 7: Subscription Balance */}
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Subscription Balance
              </h4>
            </div>

            <div className="flex items-center justify-between gap-4 py-2">
              <div>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  Balance <Info className="w-3 h-3 text-slate-400" />
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  0.00 KES
                </p>
              </div>

              <div className="text-center">
                <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                  Subscription Status <Info className="w-3 h-3 text-slate-400" />
                </p>
                <p className="text-sm font-bold text-emerald-600 mt-1">
                  Active
                </p>
              </div>

              <div>
                <button
                  onClick={() => openModal("pay_subscription")}
                  className="px-4 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition cursor-pointer"
                >
                  Manage Subscription
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 8: SMS Balance */}
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                SMS Balance
              </h4>
            </div>

            <div className="flex items-center justify-between gap-4 py-2">
              <div>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  Balance <Info className="w-3 h-3 text-slate-400" />
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  0.00 KES
                </p>
              </div>

              <div className="text-center">
                <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                  Last Purchase <Info className="w-3 h-3 text-slate-400" />
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  N/A
                </p>
              </div>

              <div>
                <button
                  onClick={() => openModal("buy_sms")}
                  className="px-4 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition cursor-pointer"
                >
                  Buy SMS
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ────────────────── ROW 5: Monthly Multi-bar Financial Chart ────────────────── */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <CardContent className="p-6">
          {/* Chart Legend */}
          <div className="flex items-center justify-center gap-6 text-xs text-slate-600 dark:text-slate-300 font-medium mb-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#1bb934] rounded-xs inline-block"></span>
              <span>Total payments</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#070b3b] dark:bg-blue-500 rounded-xs inline-block"></span>
              <span>Total invoices</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#7571f2] rounded-xs inline-block"></span>
              <span>Total expenses</span>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 20, bottom: 20 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => (val === 0 ? "0" : `${val.toLocaleString()}`)}
                />
                <Tooltip
                  content={<CustomBarTooltip />}
                  cursor={{ fill: "rgba(226, 232, 240, 0.45)" }}
                />
                <Bar dataKey="payments" fill="#1bb934" maxBarSize={24} radius={[2, 2, 0, 0]} />
                <Bar dataKey="invoices" fill="#070b3b" maxBarSize={24} radius={[2, 2, 0, 0]} />
                <Bar dataKey="expenses" fill="#7571f2" maxBarSize={24} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-center text-xs text-slate-500 font-medium -mt-2">
            Performance Overview
          </div>
        </CardContent>
      </Card>

      {/* Floating AI Assistant */}
      <FloatingAIAssistant />

      {/* Dialog Modals */}
      <ActionModals
        modalType={activeModal}
        initialData={modalData}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
