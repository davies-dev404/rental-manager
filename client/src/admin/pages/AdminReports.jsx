import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "../services/adminService";
import DataTable from "../components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileText } from "lucide-react";

const REPORT_TYPES = [
  { id: "revenue", label: "Revenue Reports" },
  { id: "users", label: "User Registration Reports" },
  { id: "properties", label: "Property Registration Reports" },
  { id: "tenants", label: "Tenant Growth Reports" },
  { id: "transactions", label: "Transaction Reports" },
  { id: "subscriptions", label: "Subscription Reports" },
  { id: "occupancy", label: "Occupancy Reports" },
  { id: "activity", label: "Account Activity Reports" }
];

export default function AdminReports() {
  const [reportType, setReportType] = useState("revenue");
  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: report, isLoading } = useQuery({
    queryKey: ["admin-report", reportType, period, startDate, endDate],
    queryFn: () => adminService.getReport(reportType, { period, startDate, endDate })
  });

  const columns = (report?.columns || []).map((colLabel, idx) => ({
    key: `col_${idx}`,
    label: colLabel,
    render: (row) => <span className="text-slate-700 dark:text-slate-300">{row[idx] ?? "—"}</span>
  }));

  const tableRows = (report?.rows || []).map((r, idx) => ({ ...r, _rowId: idx }));
  const summaryEntries = Object.entries(report?.summary || {});

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Reports &amp; Analytics Centre</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate platform-wide weekly, monthly, or annual reports across 8 core operational datasets with CSV &amp; PDF exports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => adminService.exportReport(reportType, "csv", { period, startDate, endDate })}
            className="text-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => adminService.exportReport(reportType, "pdf", { period, startDate, endDate })}
            className="bg-[#0d2240] hover:bg-[#132d4a] text-white text-xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="flex flex-wrap gap-1.5">
        {REPORT_TYPES.map((rt) => (
          <button
            key={rt.id}
            type="button"
            onClick={() => setReportType(rt.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              reportType === rt.id
                ? "bg-[#0d2240] text-white"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            }`}
          >
            {rt.label}
          </button>
        ))}
      </div>

      {/* Date & Summary Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="h-8.5 rounded-md border px-2.5 text-xs bg-white dark:bg-slate-800">
          <option value="weekly">Weekly Summary (Last 7 Days)</option>
          <option value="monthly">Monthly Summary (Last 30 Days)</option>
          <option value="annual">Annual Summary (Year-to-Date)</option>
        </select>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8.5 text-xs" />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8.5 text-xs" />
      </div>

      {/* Summary KPIs */}
      {summaryEntries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summaryEntries.map(([k, v]) => (
            <Card key={k} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
              <CardContent className="p-3.5">
                <p className="text-[10.5px] font-semibold uppercase text-slate-500">
                  {k.replace(/([A-Z])/g, " $1").trim()}
                </p>
                <p className="text-lg font-extrabold text-[#0d2240] dark:text-[#00d4c8] mt-1 tabular-nums">
                  {typeof v === "number" ? v.toLocaleString() : String(v)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DataTable
        columns={columns}
        data={tableRows}
        keyField="_rowId"
        isLoading={isLoading}
        emptyMessage="No records found for this report period."
      />
    </div>
  );
}
