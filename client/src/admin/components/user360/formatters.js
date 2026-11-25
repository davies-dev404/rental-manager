export function formatKES(amount) {
  const num = Number(amount || 0);
  if (Number.isNaN(num)) return "KES 0";
  return `KES ${Math.round(num).toLocaleString("en-KE")}`;
}

export function formatDate(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function getInitials(name = "") {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function statusBadgeClass(status = "") {
  const s = String(status || "").toLowerCase();
  if (["active", "paid", "confirmed", "completed", "verified", "reconciled", "success", "resolved", "up_to_date"].includes(s)) {
    return "bg-[#16A36A]/10 text-[#16A36A] border-[#16A36A]/30";
  }
  if (["trial", "pending", "pending_verification", "processing", "grace_period", "partial", "outstanding", "in_progress", "open", "warning"].includes(s)) {
    return "bg-[#E9A23B]/15 text-[#B47412] border-[#E9A23B]/40";
  }
  if (["suspended", "failed", "overdue", "expired", "rejected", "flagged", "unmatched", "amount_mismatch", "danger", "deactivated", "cancelled"].includes(s)) {
    return "bg-[#DC4545]/10 text-[#DC4545] border-[#DC4545]/30";
  }
  return "bg-slate-100 text-[#738197] border-[#E1E7EF]";
}
