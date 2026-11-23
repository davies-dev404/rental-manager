import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "teal",
  className = ""
}) {
  const accentStyles = {
    teal: "bg-[#00a99d]/12 text-[#00a99d]",
    navy: "bg-[#0d2240]/10 text-[#0d2240] dark:bg-blue-950/60 dark:text-blue-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
  };

  return (
    <Card className={cn("bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs rounded-xl", className)}>
      <CardContent className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 truncate">
            {title}
          </p>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
            {value}
          </p>
          {subtitle && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", accentStyles[accent] || accentStyles.teal)}>
            <Icon className="w-4.5 h-4.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
