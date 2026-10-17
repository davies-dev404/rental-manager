import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { usePreferences } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Info, ChevronLeft, ChevronRight } from "lucide-react";

export default function InsightsPage() {
  const { toast } = useToast();
  const { formatCurrency } = usePreferences();

  // Tabs: Tenant Arrears, Occupancy Rate
  const [activeTab, setActiveTab] = useState("tenant_arrears");

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: api.getStats
  });

  const { data: debtors = [] } = useQuery({
    queryKey: ["debtors"],
    queryFn: api.getDebtors
  });

  const tenantArrears = Number(stats?.outstandingAmount || 0);
  const advancePayments = 0.0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Tab Pills */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("tenant_arrears")}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === "tenant_arrears"
              ? "bg-[#e8ebf7] dark:bg-slate-800 text-[#0b1065] dark:text-blue-400"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Tenant Arrears
        </button>
        <button
          onClick={() => setActiveTab("occupancy_rate")}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === "occupancy_rate"
              ? "bg-[#e8ebf7] dark:bg-slate-800 text-[#0b1065] dark:text-blue-400"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Occupancy Rate
        </button>
      </div>

      {activeTab === "tenant_arrears" && (
        <div className="space-y-6">
          {/* Top 2 Cards: Tenant Arrears & Advance Payments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Tenant Arrears (KES) */}
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
              <CardContent className="p-6">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span>Tenant Arrears (KES)</span>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-2">
                  {tenantArrears.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </h3>
                <p className="text-[11px] text-slate-400 mt-2">
                  # tenants with arrears
                </p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {debtors.length} tenants
                </p>
              </CardContent>
            </Card>

            {/* Card 2: Advance Payments (KES) */}
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
              <CardContent className="p-6">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span>Advance Payments (KES)</span>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-2">
                  {advancePayments.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </h3>
                <p className="text-[11px] text-slate-400 mt-2">
                  # tenants with advance payments
                </p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  0 tenants
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tenant Arrears Summary Table Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Tenant Arrears Summary
            </h4>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                    <tr>
                      <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                        Property Name
                      </th>
                      <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                        Total Arrears (KES)
                      </th>
                      <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                        # Tenants with Arrears
                      </th>
                      <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                        Total Advance Payments (KES)
                      </th>
                      <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                        # Tenants with Advance Payments
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {debtors.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-12 text-center text-slate-400 text-xs"
                        >
                          No tenant arrears recorded.
                        </td>
                      </tr>
                    ) : (
                      debtors.map((d, index) => (
                        <tr
                          key={index}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200 font-medium">
                            {d.propertyName || d.property || "-"}
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                            {Number(d.balance || 0).toLocaleString()} KES
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                            1
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                            0.00 KES
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                            0
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "occupancy_rate" && (
        <div className="space-y-4">
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
            <CardContent className="p-6">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Portfolio Occupancy Rate
              </h4>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {stats?.occupancyRate || 0}%
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {stats?.occupiedUnits || 0} occupied of {stats?.totalUnits || 0} total units
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
