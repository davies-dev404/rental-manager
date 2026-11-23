import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AlertTriangle, CalendarClock, Wrench } from "lucide-react";

function formatWindow(startAt, endAt) {
  if (!startAt) return "";
  try {
    const fmt = {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    };
    const startStr = new Date(startAt).toLocaleString("en-KE", fmt);
    if (!endAt) return `${startStr} EAT`;
    const endStr = new Date(endAt).toLocaleString("en-KE", fmt);
    return `${startStr} – ${endStr} EAT`;
  } catch {
    return "";
  }
}

export default function MaintenanceBanner({ variant = "app" }) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["public-maintenance-status"],
    queryFn: api.getMaintenanceStatus,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 15_000,
    refetchOnWindowFocus: true
  });

  useEffect(() => {
    const handleEvent = () => {
      queryClient.invalidateQueries({ queryKey: ["public-maintenance-status"] });
    };
    window.addEventListener("makaziflow:maintenance", handleEvent);
    return () => window.removeEventListener("makaziflow:maintenance", handleEvent);
  }, [queryClient]);

  if (!data?.bannerVisible) {
    return null;
  }

  const isActive = Boolean(data.active);
  const windowText = data.scheduled && data.startAt ? formatWindow(data.startAt, data.endAt) : "";

  const bgClasses = isActive
    ? "bg-rose-700 bg-linear-to-r from-rose-700 via-red-700 to-rose-800 border-rose-500/40"
    : "bg-amber-600 bg-linear-to-r from-amber-600 via-orange-600 to-amber-700 border-amber-400/40";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${bgClasses} text-white text-xs px-4 py-2.5 border-b shadow-sm shrink-0 w-full z-50 ${
        variant === "public" ? "font-sans" : ""
      }`}
    >
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4">
        <div className="flex items-start sm:items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 bg-white/20 text-white px-2 py-0.5 rounded font-extrabold uppercase text-[10px] tracking-wider border border-white/25 shrink-0 mt-0.5 sm:mt-0">
            {isActive ? (
              <>
                <AlertTriangle className="w-3 h-3" />
                Maintenance Active
              </>
            ) : (
              <>
                <CalendarClock className="w-3 h-3" />
                Scheduled Maintenance
              </>
            )}
          </span>
          <p className="text-white font-semibold text-xs leading-snug">
            {data.message || "MakaziFlow is undergoing scheduled system maintenance."}
          </p>
        </div>

        {windowText && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold bg-black/25 px-2.5 py-1 rounded-md border border-white/15 shrink-0 self-start sm:self-auto">
            <Wrench className="w-3 h-3 text-white/90" />
            <span>{windowText}</span>
          </div>
        )}
      </div>
    </div>
  );
}
