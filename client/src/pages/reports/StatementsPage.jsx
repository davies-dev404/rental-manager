import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Minus, Download, FileSpreadsheet, RotateCcw } from "lucide-react";
import { exportToPDF, downloadRowsAsCSV } from "@/lib/reports";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

const PAID_STATUS_SET = new Set(["paid", "completed", "confirmed", "partial"]);
const UNPAID_STATUS_SET = new Set(["pending", "unpaid", "overdue", "open"]);

// ─── Tenant & Property Sync Helpers ──────────────────────────────────────────
const getTenantPropId = (t) => {
  if (!t) return "";
  if (t.propertyId) {
    return typeof t.propertyId === "object"
      ? String(t.propertyId._id || t.propertyId.id || "")
      : String(t.propertyId);
  }
  if (t.unitId && typeof t.unitId === "object") {
    if (t.unitId.propertyId) {
      return typeof t.unitId.propertyId === "object"
        ? String(t.unitId.propertyId._id || t.unitId.propertyId.id || "")
        : String(t.unitId.propertyId);
    }
    if (t.unitId.property) {
      return typeof t.unitId.property === "object"
        ? String(t.unitId.property._id || t.unitId.property.id || "")
        : String(t.unitId.property);
    }
  }
  if (t.property && typeof t.property === "object") {
    return String(t.property._id || t.property.id || "");
  }
  return "";
};

const getTenantPropName = (t) => {
  if (!t) return "";
  if (typeof t.property === "string") return t.property;
  if (t.propertyName) return t.propertyName;
  if (t.property?.name) return t.property.name;
  if (t.unitId?.propertyId?.name) return t.unitId.propertyId.name;
  if (typeof t.unitId?.property === "string") return t.unitId.property;
  if (t.unitId?.property?.name) return t.unitId.property.name;
  return "";
};

const getTenantUnitNumber = (t) => {
  if (!t) return "";
  if (t.unitNumber) return String(t.unitNumber);
  if (t.unit && typeof t.unit !== "object") return String(t.unit);
  if (t.unitId && typeof t.unitId === "object") return String(t.unitId.unitNumber || t.unitId.unit || "");
  return "";
};

const tenantMatchesProperty = (t, propIdOrName, properties = []) => {
  if (!propIdOrName || propIdOrName === "all" || propIdOrName === "") return true;
  const pId = getTenantPropId(t);
  const pName = getTenantPropName(t);
  const foundProp = properties.find((p) => String(p._id || p.id) === String(propIdOrName));

  if (pId && String(pId) === String(propIdOrName)) return true;
  if (foundProp && pName && pName.toLowerCase() === foundProp.name?.toLowerCase()) return true;
  if (t?.property && String(t.property) === String(propIdOrName)) return true;
  if (pName && pName.toLowerCase() === String(propIdOrName).toLowerCase()) return true;
  return false;
};

// Safely convert timestamp / ISO date to YYYY-MM-DD without dropping today's records
const getRecordDateStr = (val) => {
  if (!val) return "";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    return val.trim();
  }
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z$/.test(val.trim())) {
    return val.trim().slice(0, 10);
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDisplayDate = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const formatKES = (num) =>
  `KES ${(Number(num) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const isTenantDeleted = (t) => {
  const st = (t?.status || "").toLowerCase();
  return st === "inactive" || st === "deleted" || t?.isDeleted === true;
};

export default function StatementsPage() {
  const { toast } = useToast();

  const [activeReport, setActiveReport] = useState("tenant_statement");

  // Filters State
  const [selectedProperty, setSelectedProperty] = useState("all");
  const [selectedPropertiesInput, setSelectedPropertiesInput] = useState("");
  const [selectAllProperties, setSelectAllProperties] = useState(true);
  const [selectedGrouping, setSelectedGrouping] = useState("all");
  const [searchDeletedTenants, setSearchDeletedTenants] = useState("");
  const [selectedTenant, setSelectedTenant] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startMonthYear, setStartMonthYear] = useState("");
  const [startYear, setStartYear] = useState("");

  // Checkboxes
  const [showDeletedTenants, setShowDeletedTenants] = useState(false);
  const [showExpensesNotLinked, setShowExpensesNotLinked] = useState(true);

  // Collapsible cards
  const [collapseFilters, setCollapseFilters] = useState(false);
  const [collapseReport, setCollapseReport] = useState(false);
  const [collapseGraphs, setCollapseGraphs] = useState(false);

  // Queries
  const { data: properties = [] } = useQuery({
    queryKey: ["properties"],
    queryFn: api.getProperties
  });

  const { data: units = [] } = useQuery({
    queryKey: ["units"],
    queryFn: () => api.getUnits()
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: api.getTenants
  });

  const { data: settings = {} } = useQuery({
    queryKey: ["settings"],
    queryFn: api.getSettings
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: api.getPayments
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: api.getExpenses
  });

  const { data: debtors = [] } = useQuery({
    queryKey: ["debtors"],
    queryFn: api.getDebtors
  });

  const savedGroupings = useMemo(() => {
    try {
      const raw = localStorage.getItem("dwello_property_groupings");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [activeReport]);

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

  const handleClearFilters = () => {
    setSelectedProperty("all");
    setSelectedTenant("");
    setStartDate("");
    setEndDate("");
    setStartMonthYear("");
    setStartYear("");
    setSelectedGrouping("all");
    setSelectedPropertiesInput("");
    setSelectAllProperties(true);
    setSearchDeletedTenants("");
    setShowDeletedTenants(false);
    toast({
      title: "Filters Cleared",
      description: `Showing all available records for ${currentReportObj.label}.`
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = getFilteredStatementData();
    toast({
      title: "Statement Updated",
      description: `Loaded ${data.records.length} record(s) for ${currentReportObj.label}.`
    });
  };

  // Resolve full metadata for any payment record using properties, units & tenants
  const resolvePaymentMeta = (p) => {
    const rawTenantId = typeof p.tenantId === "object" ? (p.tenantId?._id || p.tenantId?.id) : p.tenantId;
    const matchedTenant = tenants.find((t) => String(t._id || t.id) === String(rawTenantId))
      || (typeof p.tenantId === "object" ? p.tenantId : null);

    const rawUnitId = typeof p.unitId === "object"
      ? (p.unitId?._id || p.unitId?.id)
      : (p.unitId || (typeof matchedTenant?.unitId === "object" ? (matchedTenant.unitId?._id || matchedTenant.unitId?.id) : matchedTenant?.unitId));
    const matchedUnit = units.find((u) => String(u._id || u.id) === String(rawUnitId))
      || (typeof p.unitId === "object" ? p.unitId : null);

    let propId = "";
    if (p.propertyId) {
      propId = typeof p.propertyId === "object" ? String(p.propertyId._id || p.propertyId.id || "") : String(p.propertyId);
    } else if (matchedUnit?.propertyId) {
      propId = typeof matchedUnit.propertyId === "object"
        ? String(matchedUnit.propertyId._id || matchedUnit.propertyId.id || "")
        : String(matchedUnit.propertyId);
    } else if (matchedTenant) {
      propId = getTenantPropId(matchedTenant);
    }

    const foundProp = properties.find((pr) => String(pr._id || pr.id) === String(propId));
    const propName = foundProp?.name
      || (typeof p.property === "object" ? p.property?.name : p.property)
      || p.unitId?.propertyId?.name
      || matchedUnit?.propertyId?.name
      || getTenantPropName(matchedTenant)
      || "—";

    const resolvedPropId = foundProp ? String(foundProp._id || foundProp.id) : propId;
    const unitNumber = p.unitId?.unitNumber || matchedUnit?.unitNumber || getTenantUnitNumber(matchedTenant) || p.unit || "—";
    const tenantName = (typeof p.tenantId === "object" ? p.tenantId?.name : "")
      || matchedTenant?.name
      || p.tenantName
      || "Tenant";

    return {
      matchedTenant,
      matchedUnit,
      propId: resolvedPropId,
      propName,
      unitNumber,
      tenantName,
      rawTenantId: rawTenantId ? String(rawTenantId) : ""
    };
  };

  const paymentMatchesProperty = (p, propFilter) => {
    if (!propFilter || propFilter === "all") return true;
    const meta = resolvePaymentMeta(p);
    const foundProp = properties.find((pr) => String(pr._id || pr.id) === String(propFilter));
    if (meta.propId && String(meta.propId) === String(propFilter)) return true;
    if (foundProp && meta.propName && meta.propName.toLowerCase() === foundProp.name?.toLowerCase()) return true;
    if (meta.matchedTenant && tenantMatchesProperty(meta.matchedTenant, propFilter, properties)) return true;
    return false;
  };

  const expenseMatchesProperty = (e, propFilter) => {
    if (!propFilter || propFilter === "all") return true;
    const foundProp = properties.find((pr) => String(pr._id || pr.id) === String(propFilter));
    const ePropId = typeof e.propertyId === "object"
      ? String(e.propertyId?._id || e.propertyId?.id || "")
      : String(e.propertyId || (typeof e.property === "object" ? (e.property?._id || e.property?.id || "") : ""));
    const ePropName = e.property?.name || e.propertyName || (typeof e.property === "string" ? e.property : "");

    if (ePropId && ePropId === String(propFilter)) return true;
    if (foundProp && ePropName && ePropName.toLowerCase() === foundProp.name?.toLowerCase()) return true;
    return false;
  };

  const dateInRange = (val) => {
    if (!startDate && !endDate) return true;
    const ds = getRecordDateStr(val);
    if (!ds) return false;
    if (startDate && ds < startDate) return false;
    if (endDate && ds > endDate) return false;
    return true;
  };

  const getFilteredStatementData = () => {
    let title = currentReportObj.label;
    const defaultBrand = settings?.orgName || settings?.landlordName || "Rental Management Statement";
    let subtitle = defaultBrand;
    let records = [];
    let columns = [];
    let summary = {};
    let chartData = [];

    const dateRangeStr = startDate && endDate
      ? `${startDate} to ${endDate}`
      : startDate
      ? `From ${startDate}`
      : endDate
      ? `Up to ${endDate}`
      : "All Records";

    if (activeReport === "property_statements") {
      title = "Property Financial Statements";
      subtitle = `${defaultBrand} — Property Performance & Net Cashflow`;
      columns = [
        { key: "index", label: "#" },
        { key: "property", label: "Property" },
        { key: "units", label: "Units" },
        { key: "occupied", label: "Occupied" },
        { key: "collected", label: "Collected", align: "right" },
        { key: "pending", label: "Pending", align: "right" },
        { key: "expenses", label: "Expenses", align: "right" },
        { key: "net", label: "Net Income", align: "right" }
      ];

      const searchTerms = !selectAllProperties && selectedPropertiesInput.trim()
        ? selectedPropertiesInput.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
        : [];

      const matchingProps = properties.filter((pr) => {
        if (searchTerms.length === 0) return true;
        return searchTerms.some((term) => (pr.name || "").toLowerCase().includes(term));
      });

      const validTenants = showDeletedTenants ? tenants : tenants.filter((t) => !isTenantDeleted(t));
      const allowedTenantIds = new Set(validTenants.map((t) => String(t._id || t.id)));

      let grandCollected = 0;
      let grandPending = 0;
      let grandExpenses = 0;

      records = matchingProps.map((pr, idx) => {
        const pid = String(pr._id || pr.id);
        const propUnits = units.filter((u) => {
          const upid = typeof u.propertyId === "object" ? String(u.propertyId?._id || u.propertyId?.id || "") : String(u.propertyId || "");
          return upid === pid;
        });
        const occupiedCount = propUnits.filter((u) => (u.status || "").toLowerCase() === "occupied").length;

        const propPayments = payments.filter((p) => {
          if (!dateInRange(p.date || p.createdAt)) return false;
          if (!paymentMatchesProperty(p, pid)) return false;
          const meta = resolvePaymentMeta(p);
          if (!showDeletedTenants && meta.rawTenantId && !allowedTenantIds.has(meta.rawTenantId)) {
            return false;
          }
          return true;
        });

        const collected = propPayments
          .filter((p) => PAID_STATUS_SET.has((p.status || "").toLowerCase()))
          .reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const pending = propPayments
          .filter((p) => UNPAID_STATUS_SET.has((p.status || "").toLowerCase()))
          .reduce((s, p) => s + (Number(p.amount) || 0), 0);

        const propExpenses = expenses
          .filter((e) => dateInRange(e.date || e.createdAt) && expenseMatchesProperty(e, pid))
          .reduce((s, e) => s + (Number(e.amount) || 0), 0);

        grandCollected += collected;
        grandPending += pending;
        grandExpenses += propExpenses;

        return {
          index: idx + 1,
          property: pr.name || "Unnamed Property",
          units: propUnits.length,
          occupied: `${occupiedCount}/${propUnits.length}`,
          collected: formatKES(collected),
          pending: formatKES(pending),
          expenses: formatKES(propExpenses),
          net: formatKES(collected - propExpenses)
        };
      });

      if (showExpensesNotLinked) {
        const unlinkedExpenses = expenses.filter((e) => {
          if (!dateInRange(e.date || e.createdAt)) return false;
          const hasProp = Boolean(
            (typeof e.propertyId === "object" ? e.propertyId?._id : e.propertyId) ||
            (typeof e.property === "object" ? e.property?._id : e.property) ||
            e.propertyName
          );
          return !hasProp;
        });
        if (unlinkedExpenses.length > 0) {
          const unlinkedTotal = unlinkedExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
          grandExpenses += unlinkedTotal;
          records.push({
            index: records.length + 1,
            property: "Unlinked Portfolio Expenses",
            units: "—",
            occupied: "—",
            collected: formatKES(0),
            pending: formatKES(0),
            expenses: formatKES(unlinkedTotal),
            net: formatKES(-unlinkedTotal)
          });
        }
      }

      summary = {
        "Total Collected": formatKES(grandCollected),
        "Total Expenses": formatKES(grandExpenses),
        "Net Income": formatKES(grandCollected - grandExpenses)
      };
    } else if (activeReport === "arrears_report") {
      title = "Tenant Rent Arrears Report";
      subtitle = `${defaultBrand} — Outstanding & Pending Balances`;
      columns = [
        { key: "index", label: "#" },
        { key: "tenant", label: "Tenant Name" },
        { key: "property", label: "Property" },
        { key: "unit", label: "Unit" },
        { key: "phone", label: "Phone" },
        { key: "expected", label: "Expected", align: "right" },
        { key: "paid", label: "Paid", align: "right" },
        { key: "amount", label: "Arrears Due", align: "right" }
      ];

      // Start from synced backend debtors (includes expected rent gap + pending/unpaid records)
      const seenTenantIds = new Set();
      const arrearEntries = [];

      debtors.forEach((d) => {
        const t = d.tenant || d;
        const tid = String(t?._id || t?.id || "");
        if (!showDeletedTenants && isTenantDeleted(t)) return;
        if (selectedProperty !== "all" && !tenantMatchesProperty(t, selectedProperty, properties)) return;
        if (tid) seenTenantIds.add(tid);
        arrearEntries.push({
          tenant: t?.name || "Tenant",
          property: getTenantPropName(t) || "Unassigned",
          unit: getTenantUnitNumber(t) || "N/A",
          phone: t?.phone || "—",
          expected: Number(d.expectedRent || 0) + Number(d.expectedUtilities || 0),
          paid: Number(d.totalPaid || 0),
          due: Number(d.totalDue || 0)
        });
      });

      // Fallback check: also include any inactive tenant unpaid payment if showDeletedTenants is checked
      if (showDeletedTenants) {
        payments.forEach((p) => {
          if (!UNPAID_STATUS_SET.has((p.status || "").toLowerCase())) return;
          if (!dateInRange(p.date || p.createdAt)) return;
          if (!paymentMatchesProperty(p, selectedProperty)) return;
          const meta = resolvePaymentMeta(p);
          if (meta.rawTenantId && seenTenantIds.has(meta.rawTenantId)) return;
          arrearEntries.push({
            tenant: `${meta.tenantName} (Inactive)`,
            property: meta.propName,
            unit: meta.unitNumber,
            phone: meta.matchedTenant?.phone || "—",
            expected: Number(p.amount) || 0,
            paid: 0,
            due: Number(p.amount) || 0
          });
        });
      }

      const totalArrears = arrearEntries.reduce((s, r) => s + r.due, 0);
      summary = {
        "Total Arrears": formatKES(totalArrears),
        "Tenants In Arrears": arrearEntries.length,
        "As Of": new Date().toLocaleDateString("en-GB")
      };

      records = arrearEntries.map((r, idx) => ({
        index: idx + 1,
        tenant: r.tenant,
        property: r.property,
        unit: r.unit,
        phone: r.phone,
        expected: formatKES(r.expected),
        paid: formatKES(r.paid),
        amount: formatKES(r.due)
      }));
    } else if (activeReport === "expenses_report") {
      title = "Expenses Statement Report";
      subtitle = `${defaultBrand} — Property Operating & Maintenance Expenses`;
      columns = [
        { key: "index", label: "#" },
        { key: "date", label: "Date" },
        { key: "title", label: "Expense Description" },
        { key: "category", label: "Category" },
        { key: "property", label: "Property" },
        { key: "amount", label: "Amount", align: "right" }
      ];
      const filtered = expenses.filter((e) => {
        if (!dateInRange(e.date || e.createdAt)) return false;
        if (!expenseMatchesProperty(e, selectedProperty)) return false;
        return true;
      });
      const totalExp = filtered.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      summary = {
        "Total Expenses": formatKES(totalExp),
        "Transactions": filtered.length,
        "Period": dateRangeStr
      };
      records = filtered.map((e, idx) => ({
        index: idx + 1,
        date: formatDisplayDate(e.date || e.createdAt),
        title: e.title || e.description || "General Expense",
        category: e.category || "General",
        property: e.property?.name || e.propertyName || "Unlinked",
        amount: formatKES(e.amount)
      }));
    } else if (activeReport === "month_on_month") {
      title = "Month on Month Financial Report";
      subtitle = `${defaultBrand} — Monthly Collections, Expenses & Net Income`;
      columns = [
        { key: "index", label: "#" },
        { key: "month", label: "Month" },
        { key: "collected", label: "Collected", align: "right" },
        { key: "pending", label: "Pending", align: "right" },
        { key: "expenses", label: "Expenses", align: "right" },
        { key: "net", label: "Net Income", align: "right" },
        { key: "transactions", label: "Txns", align: "right" }
      ];

      const buckets = new Map();
      const ensureBucket = (ym) => {
        if (!buckets.has(ym)) {
          const [y, m] = ym.split("-");
          const labelDate = new Date(Number(y), Number(m) - 1, 1);
          const monthLabel = isNaN(labelDate.getTime())
            ? ym
            : labelDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
          buckets.set(ym, { ym, monthLabel, collected: 0, pending: 0, expenses: 0, transactions: 0 });
        }
        return buckets.get(ym);
      };

      payments.forEach((p) => {
        if (!paymentMatchesProperty(p, selectedProperty)) return;
        const ds = getRecordDateStr(p.date || p.createdAt);
        if (!ds) return;
        const ym = ds.slice(0, 7);
        if (startMonthYear && ym < startMonthYear) return;
        const b = ensureBucket(ym);
        const st = (p.status || "").toLowerCase();
        if (UNPAID_STATUS_SET.has(st)) {
          b.pending += Number(p.amount) || 0;
        } else {
          b.collected += Number(p.amount) || 0;
        }
        b.transactions += 1;
      });

      expenses.forEach((e) => {
        if (!expenseMatchesProperty(e, selectedProperty)) return;
        const ds = getRecordDateStr(e.date || e.createdAt);
        if (!ds) return;
        const ym = ds.slice(0, 7);
        if (startMonthYear && ym < startMonthYear) return;
        const b = ensureBucket(ym);
        b.expenses += Number(e.amount) || 0;
      });

      const sorted = Array.from(buckets.values()).sort((a, b) => a.ym.localeCompare(b.ym));
      const totalCollected = sorted.reduce((s, b) => s + b.collected, 0);
      const totalExpenses = sorted.reduce((s, b) => s + b.expenses, 0);

      summary = {
        "Total Collected": formatKES(totalCollected),
        "Total Expenses": formatKES(totalExpenses),
        "Net Income": formatKES(totalCollected - totalExpenses)
      };

      records = sorted.map((b, idx) => ({
        index: idx + 1,
        month: b.monthLabel,
        collected: formatKES(b.collected),
        pending: formatKES(b.pending),
        expenses: formatKES(b.expenses),
        net: formatKES(b.collected - b.expenses),
        transactions: b.transactions
      }));

      chartData = sorted.map((b) => ({
        name: b.monthLabel,
        Collected: b.collected,
        Expenses: b.expenses,
        Net: b.collected - b.expenses
      }));
    } else if (activeReport === "year_on_year") {
      title = "Year on Year Financial Report";
      subtitle = `${defaultBrand} — Annual Revenue & Expense Comparison`;
      columns = [
        { key: "index", label: "#" },
        { key: "year", label: "Year" },
        { key: "collected", label: "Collected", align: "right" },
        { key: "pending", label: "Pending", align: "right" },
        { key: "expenses", label: "Expenses", align: "right" },
        { key: "net", label: "Net Income", align: "right" },
        { key: "transactions", label: "Txns", align: "right" }
      ];

      const buckets = new Map();
      const ensureYear = (yr) => {
        if (!buckets.has(yr)) {
          buckets.set(yr, { yr, collected: 0, pending: 0, expenses: 0, transactions: 0 });
        }
        return buckets.get(yr);
      };

      payments.forEach((p) => {
        if (!paymentMatchesProperty(p, selectedProperty)) return;
        const ds = getRecordDateStr(p.date || p.createdAt);
        if (!ds) return;
        const yr = ds.slice(0, 4);
        if (startYear && Number(yr) < Number(startYear)) return;
        const b = ensureYear(yr);
        const st = (p.status || "").toLowerCase();
        if (UNPAID_STATUS_SET.has(st)) {
          b.pending += Number(p.amount) || 0;
        } else {
          b.collected += Number(p.amount) || 0;
        }
        b.transactions += 1;
      });

      expenses.forEach((e) => {
        if (!expenseMatchesProperty(e, selectedProperty)) return;
        const ds = getRecordDateStr(e.date || e.createdAt);
        if (!ds) return;
        const yr = ds.slice(0, 4);
        if (startYear && Number(yr) < Number(startYear)) return;
        const b = ensureYear(yr);
        b.expenses += Number(e.amount) || 0;
      });

      const sorted = Array.from(buckets.values()).sort((a, b) => a.yr.localeCompare(b.yr));
      const totalCollected = sorted.reduce((s, b) => s + b.collected, 0);
      const totalExpenses = sorted.reduce((s, b) => s + b.expenses, 0);

      summary = {
        "Total Collected": formatKES(totalCollected),
        "Total Expenses": formatKES(totalExpenses),
        "Net Income": formatKES(totalCollected - totalExpenses)
      };

      records = sorted.map((b, idx) => ({
        index: idx + 1,
        year: b.yr,
        collected: formatKES(b.collected),
        pending: formatKES(b.pending),
        expenses: formatKES(b.expenses),
        net: formatKES(b.collected - b.expenses),
        transactions: b.transactions
      }));

      chartData = sorted.map((b) => ({
        name: b.yr,
        Collected: b.collected,
        Expenses: b.expenses,
        Net: b.collected - b.expenses
      }));
    } else if (activeReport === "property_grouping") {
      title = "Property Grouping Report";
      subtitle = `${defaultBrand} — Portfolio & Property Group Breakdown`;
      columns = [
        { key: "index", label: "#" },
        { key: "groupName", label: "Group / Portfolio" },
        { key: "propertiesList", label: "Properties" },
        { key: "managers", label: "Managers" },
        { key: "units", label: "Units" },
        { key: "collected", label: "Collected", align: "right" },
        { key: "expenses", label: "Expenses", align: "right" },
        { key: "net", label: "Net Income", align: "right" }
      ];

      // Use user-created groupings if present; otherwise treat each property as its own portfolio group
      const baseGroups = savedGroupings.length > 0
        ? savedGroupings.map((g) => ({
            id: g.id,
            name: g.name,
            propNames: String(g.properties || "")
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s && s !== "None assigned"),
            managers: g.managers || "Unassigned"
          }))
        : properties.map((p) => ({
            id: String(p._id || p.id),
            name: p.name,
            propNames: [p.name],
            managers: settings?.landlordName || "Owner / Manager"
          }));

      const filteredGroups = baseGroups.filter((g) => {
        if (!selectedGrouping || selectedGrouping === "all") return true;
        return String(g.id) === String(selectedGrouping) || g.name.toLowerCase().includes(selectedGrouping.toLowerCase());
      });

      let grandCollected = 0;
      let grandExpenses = 0;

      records = filteredGroups.map((g, idx) => {
        const matchedProps = properties.filter((pr) =>
          g.propNames.some((pn) => pn.toLowerCase() === (pr.name || "").toLowerCase())
        );
        const propIds = matchedProps.map((pr) => String(pr._id || pr.id));

        const groupUnitsCount = units.filter((u) => {
          const upid = typeof u.propertyId === "object" ? String(u.propertyId?._id || u.propertyId?.id || "") : String(u.propertyId || "");
          return propIds.includes(upid);
        }).length;

        const groupCollected = payments
          .filter((p) =>
            dateInRange(p.date || p.createdAt) &&
            PAID_STATUS_SET.has((p.status || "").toLowerCase()) &&
            propIds.some((pid) => paymentMatchesProperty(p, pid))
          )
          .reduce((s, p) => s + (Number(p.amount) || 0), 0);

        const groupExpenses = expenses
          .filter((e) =>
            dateInRange(e.date || e.createdAt) &&
            propIds.some((pid) => expenseMatchesProperty(e, pid))
          )
          .reduce((s, e) => s + (Number(e.amount) || 0), 0);

        grandCollected += groupCollected;
        grandExpenses += groupExpenses;

        chartData.push({
          name: g.name,
          Collected: groupCollected,
          Expenses: groupExpenses,
          Net: groupCollected - groupExpenses
        });

        return {
          index: idx + 1,
          groupName: g.name,
          propertiesList: g.propNames.length > 0 ? g.propNames.join(", ") : "None assigned",
          managers: g.managers,
          units: groupUnitsCount,
          collected: formatKES(groupCollected),
          expenses: formatKES(groupExpenses),
          net: formatKES(groupCollected - groupExpenses)
        };
      });

      summary = {
        "Groups Included": records.length,
        "Total Collected": formatKES(grandCollected),
        "Net Income": formatKES(grandCollected - grandExpenses)
      };
    } else if (activeReport === "deleted_tenants") {
      title = "Deleted / Former Tenants Report";
      subtitle = `${defaultBrand} — Inactive & Archived Tenancy Records`;
      columns = [
        { key: "index", label: "#" },
        { key: "name", label: "Tenant Name" },
        { key: "property", label: "Property" },
        { key: "unit", label: "Unit" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "status", label: "Status" }
      ];

      const q = searchDeletedTenants.trim().toLowerCase();
      const deletedList = tenants.filter((t) => {
        if (!isTenantDeleted(t)) return false;
        if (!tenantMatchesProperty(t, selectedProperty, properties)) return false;
        if (q) {
          const hay = `${t.name || ""} ${t.phone || ""} ${t.email || ""} ${getTenantUnitNumber(t)}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      summary = {
        "Deleted / Former Tenants": deletedList.length,
        "Property Filter": selectedProperty === "all"
          ? "All Properties"
          : (properties.find((p) => String(p._id || p.id) === selectedProperty)?.name || "Selected"),
        "Generated": new Date().toLocaleDateString("en-GB")
      };

      records = deletedList.map((t, idx) => ({
        index: idx + 1,
        name: t.name || "—",
        property: getTenantPropName(t) || "—",
        unit: getTenantUnitNumber(t) || "N/A",
        phone: t.phone || "—",
        email: t.email || "—",
        status: t.status || "inactive"
      }));
    } else if (activeReport === "deposits_report") {
      title = "Tenant Security Deposits Report";
      subtitle = `${defaultBrand} — Security Deposits Held`;
      columns = [
        { key: "index", label: "#" },
        { key: "name", label: "Tenant Name" },
        { key: "property", label: "Property" },
        { key: "unit", label: "Unit" },
        { key: "phone", label: "Phone" },
        { key: "rent", label: "Monthly Rent", align: "right" },
        { key: "deposit", label: "Deposit Held", align: "right" },
        { key: "status", label: "Status" }
      ];

      const list = tenants.filter((t) => {
        if (!showDeletedTenants && isTenantDeleted(t)) return false;
        if (!tenantMatchesProperty(t, selectedProperty, properties)) return false;
        return true;
      });

      const totalDeposits = list.reduce((s, t) => s + (Number(t.depositAmount || 0)), 0);
      summary = {
        "Total Deposits Held": formatKES(totalDeposits),
        "Tenants Listed": list.length,
        "Generated": new Date().toLocaleDateString("en-GB")
      };

      records = list.map((t, idx) => ({
        index: idx + 1,
        name: t.name || "—",
        property: getTenantPropName(t) || "—",
        unit: getTenantUnitNumber(t) || "N/A",
        phone: t.phone || "—",
        rent: formatKES(t.rentAmount || t.unitId?.rentAmount || 0),
        deposit: formatKES(t.depositAmount || 0),
        status: t.status || "active"
      }));
    } else {
      // tenant_statement & payment_statement
      title = activeReport === "tenant_statement" ? "Tenant Statement" : "Payment Statement";
      subtitle = `${defaultBrand} — Transaction Ledger (${dateRangeStr})`;
      columns = [
        { key: "index", label: "#" },
        { key: "date", label: "Date" },
        { key: "tenant", label: "Tenant" },
        { key: "property", label: "Property" },
        { key: "unit", label: "Unit" },
        { key: "method", label: "Channel" },
        { key: "reference", label: "Reference" },
        { key: "status", label: "Status" },
        { key: "amount", label: "Amount", align: "right" }
      ];

      const inactiveTenantIds = new Set(
        tenants.filter((t) => isTenantDeleted(t)).map((t) => String(t._id || t.id))
      );

      const filtered = payments.filter((p) => {
        if (!dateInRange(p.date || p.createdAt)) return false;
        if (!paymentMatchesProperty(p, selectedProperty)) return false;
        const meta = resolvePaymentMeta(p);
        if (activeReport === "payment_statement" && !showDeletedTenants && meta.rawTenantId && inactiveTenantIds.has(meta.rawTenantId)) {
          return false;
        }
        if (activeReport === "tenant_statement" && selectedTenant && selectedTenant !== "") {
          const selTenantObj = tenants.find((t) => String(t._id || t.id) === String(selectedTenant));
          const sameId = meta.rawTenantId && meta.rawTenantId === String(selectedTenant);
          const sameName = selTenantObj?.name && meta.tenantName.toLowerCase() === selTenantObj.name.toLowerCase();
          if (!sameId && !sameName) return false;
        }
        return true;
      });

      const paidSum = filtered
        .filter((p) => PAID_STATUS_SET.has((p.status || "").toLowerCase()))
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const pendingSum = filtered
        .filter((p) => UNPAID_STATUS_SET.has((p.status || "").toLowerCase()))
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);

      summary = {
        "Collected": formatKES(paidSum),
        "Pending / Unpaid": formatKES(pendingSum),
        "Transactions": filtered.length
      };

      records = filtered.map((p, idx) => {
        const meta = resolvePaymentMeta(p);
        return {
          index: idx + 1,
          date: formatDisplayDate(p.date || p.createdAt),
          tenant: meta.tenantName,
          property: meta.propName,
          unit: meta.unitNumber,
          method: (p.method || p.paymentMethod || "M-Pesa").toUpperCase(),
          reference: p.transactionId || p.reference || `MKZ-${p._id ? p._id.slice(-6).toUpperCase() : "8921"}`,
          status: p.status || "Paid",
          amount: formatKES(p.amount)
        };
      });
    }

    return { title, subtitle, dateRange: dateRangeStr, records, columns, summary, chartData };
  };

  const statementData = getFilteredStatementData();

  const handleDownloadPDF = () => {
    if (!statementData.records || statementData.records.length === 0) {
      toast({
        variant: "destructive",
        title: "No Records to Export",
        description: `There are no ${currentReportObj.label} records matching your current filters.`
      });
      return;
    }
    const selectedPropObj = selectedProperty !== "all"
      ? properties.find((p) => String(p._id || p.id) === String(selectedProperty))
      : null;
    toast({
      title: "Generating PDF",
      description: `Opening print view for ${currentReportObj.label} (${statementData.records.length} rows).`
    });
    exportToPDF({
      ...statementData,
      company: settings,
      propertyName: selectedPropObj?.name || ""
    });
  };

  const handleDownloadExcel = () => {
    if (!statementData.records || statementData.records.length === 0) {
      toast({
        variant: "destructive",
        title: "No Records to Export",
        description: `There are no ${currentReportObj.label} records matching your current filters.`
      });
      return;
    }
    const csvRows = statementData.records.map((row) => {
      const flat = {};
      statementData.columns.forEach((col) => {
        flat[col.label] = row[col.key] ?? "";
      });
      return flat;
    });
    const result = downloadRowsAsCSV(csvRows, currentReportObj.id || "statement");
    if (result.success) {
      toast({
        title: "CSV Exported",
        description: `Downloaded ${result.count} record(s) to ${result.filename}.`
      });
    } else {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: result.message || "Could not export CSV."
      });
    }
  };

  const PropertySelectOptions = () => (
    <>
      <option value="all">All Properties</option>
      {properties.map((p) => (
        <option key={p._id || p.id} value={p._id || p.id}>
          {p.name}
        </option>
      ))}
    </>
  );

  const renderChartCard = (graphTitle) => {
    const data = statementData.chartData || [];
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer"
          onClick={() => setCollapseGraphs(!collapseGraphs)}
        >
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {graphTitle}
          </h4>
          <Minus className="w-3.5 h-3.5 text-slate-400" />
        </div>
        {!collapseGraphs && (
          data.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No chart data available for current filters
            </div>
          ) : (
            <div className="p-4 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 16, left: 4, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => formatKES(val)} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="Collected" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Net" fill="#2546e8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )
        )}
      </div>
    );
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
                {/* 1. TENANT STATEMENT */}
                {activeReport === "tenant_statement" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Select Property
                        </label>
                        <select
                          value={selectedProperty}
                          onChange={(e) => {
                            setSelectedProperty(e.target.value);
                            setSelectedTenant("");
                          }}
                          className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        >
                          <PropertySelectOptions />
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Select Tenant
                        </label>
                        <select
                          value={selectedTenant}
                          onChange={(e) => setSelectedTenant(e.target.value)}
                          className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        >
                          <option value="">All Tenants</option>
                          {tenants
                            .filter((t) => selectedProperty === "all" || tenantMatchesProperty(t, selectedProperty, properties))
                            .map((t) => {
                              const uNum = getTenantUnitNumber(t);
                              const pName = getTenantPropName(t);
                              return (
                                <option key={t._id || t.id} value={t._id || t.id}>
                                  {t.name} (Unit {uNum || "—"}{pName ? ` · ${pName}` : ""})
                                </option>
                              );
                            })}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-600 dark:text-slate-400 font-medium">
                        Select Date Range (optional)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    </div>
                  </div>
                )}

                {/* 2. PROPERTY STATEMENTS */}
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
                          disabled={selectAllProperties}
                          placeholder={selectAllProperties ? "All properties included" : "Filter e.g. Hacienda"}
                          onChange={(e) => setSelectedPropertiesInput(e.target.value)}
                          className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs focus:outline-none focus:border-blue-500 disabled:opacity-60"
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
                          Select Date Range (optional)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs focus:outline-none"
                          />
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
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
                          Include Deleted Tenants
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
                  </div>
                )}

                {/* 3. ARREARS REPORT */}
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
                          <PropertySelectOptions />
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Select Date Range (optional)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs focus:outline-none"
                          />
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

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
                  </div>
                )}

                {/* 4. EXPENSES REPORT */}
                {activeReport === "expenses_report" && (
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
                        <PropertySelectOptions />
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-600 dark:text-slate-400 font-medium">
                        Select Date Range (optional)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs focus:outline-none"
                        />
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. MONTH ON MONTH REPORT */}
                {activeReport === "month_on_month" && (
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
                        <PropertySelectOptions />
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-600 dark:text-slate-400 font-medium">
                        From Month / Year (optional)
                      </label>
                      <input
                        type="month"
                        value={startMonthYear}
                        onChange={(e) => setStartMonthYear(e.target.value)}
                        className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* 6. YEAR ON YEAR REPORT */}
                {activeReport === "year_on_year" && (
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
                        <PropertySelectOptions />
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-600 dark:text-slate-400 font-medium">
                        From Year (optional)
                      </label>
                      <input
                        type="number"
                        min="2000"
                        max="2099"
                        placeholder="e.g. 2026"
                        value={startYear}
                        onChange={(e) => setStartYear(e.target.value)}
                        className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* 7. PROPERTY GROUPING REPORT */}
                {activeReport === "property_grouping" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-slate-600 dark:text-slate-400 font-medium">
                        Select Grouping(s)
                      </label>
                      <select
                        value={selectedGrouping}
                        onChange={(e) => setSelectedGrouping(e.target.value)}
                        className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs focus:outline-none"
                      >
                        <option value="all">
                          {savedGroupings.length > 0 ? "All Property Groupings" : "All Properties (Portfolio Summary)"}
                        </option>
                        {savedGroupings.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-600 dark:text-slate-400 font-medium">
                        Select Date Range (optional)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs focus:outline-none"
                        />
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 8. DELETED TENANTS REPORT */}
                {activeReport === "deleted_tenants" && (
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
                        <PropertySelectOptions />
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-600 dark:text-slate-400 font-medium">
                        Search Deleted Tenants (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Search by name, unit, or phone..."
                        value={searchDeletedTenants}
                        onChange={(e) => setSearchDeletedTenants(e.target.value)}
                        className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* 9. DEPOSITS REPORT */}
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
                        <PropertySelectOptions />
                      </select>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer pt-1">
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
                  </div>
                )}

                {/* 10. PAYMENT STATEMENT */}
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
                          <PropertySelectOptions />
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-600 dark:text-slate-400 font-medium">
                          Select Date Range (optional)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs focus:outline-none"
                          />
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer pt-1">
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
                    className="text-xs h-8 px-5 text-[#0b1065] border-slate-300 hover:bg-slate-50 cursor-pointer gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadExcel}
                    className="text-xs h-8 px-5 text-[#0b1065] border-slate-300 hover:bg-slate-50 cursor-pointer gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Download Excel / CSV
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClearFilters}
                    className="text-xs h-8 px-3 text-slate-500 hover:text-slate-800 cursor-pointer gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset Filters
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
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {currentReportObj.label}
                </h4>
                <span className="text-[11px] text-slate-400">
                  ({statementData.records.length} {statementData.records.length === 1 ? "record" : "records"})
                </span>
              </div>
              <Minus className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {!collapseReport && (
              <div className="p-4 overflow-x-auto">
                {!statementData.records || statementData.records.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                    <p>There are no records to display for the current filters.</p>
                    {(startDate || endDate || selectedProperty !== "all" || selectedTenant) && (
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="text-[#2546e8] hover:underline font-medium cursor-pointer"
                      >
                        Reset filters to view all records
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {statementData.summary && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Object.entries(statementData.summary).map(([key, val]) => (
                          <div key={key} className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{key}</div>
                            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{val}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <table className="w-full text-xs text-left text-slate-600 dark:text-slate-300">
                      <thead className="text-[10px] uppercase bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-y border-slate-200 dark:border-slate-700">
                        <tr>
                          {statementData.columns.map((col) => (
                            <th key={col.key} className={`py-2 px-3 ${col.align === "right" ? "text-right" : ""}`}>
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {statementData.records.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            {statementData.columns.map((col) => (
                              <td key={col.key} className={`py-2.5 px-3 ${col.align === "right" ? "text-right font-semibold" : ""}`}>
                                {r[col.key]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {activeReport === "month_on_month" && renderChartCard("Month on Month Graphs")}
          {activeReport === "year_on_year" && renderChartCard("Year On Year Graphs")}
          {activeReport === "property_grouping" && renderChartCard("Property Grouping Graphs")}
        </main>
      </div>
    </div>
  );
}
