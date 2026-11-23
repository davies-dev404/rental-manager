import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

const PIE_COLORS = ["#0d2240", "#00a99d", "#00d4c8", "#3b82f6", "#f59e0b", "#64748b"];

export default function RevenueChart({
  title = "Revenue Analytics",
  subtitle = "",
  type = "bar",
  data = [],
  height = 260,
  series = []
}) {
  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">{title}</CardTitle>
        {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
      </CardHeader>
      <CardContent style={{ height }}>
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            No analytics data available yet.
          </div>
        ) : type === "pie" ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="plan"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={80}
                paddingAngle={3}
              >
                {data.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        ) : type === "line" ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              {(series.length > 0 ? series : [{ key: "registrations", name: "New Users", color: "#00a99d" }]).map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color || "#00a99d"}
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              {(series.length > 0
                ? series
                : [
                    { key: "subscriptionRevenue", name: "Subscription Revenue (KES)", color: "#0d2240" },
                    { key: "rentPaymentsVolume", name: "Tenant Rent Volume (KES)", color: "#00a99d" }
                  ]
              ).map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.name}
                  fill={s.color || "#0d2240"}
                  radius={[5, 5, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
