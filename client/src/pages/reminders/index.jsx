import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Send,
  Minus,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  RefreshCw
} from "lucide-react";
import { ActionModals } from "@/components/dashboard/Modals";

export default function CommunicationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedProperty, setSelectedProperty] = useState("all");

  const [recipientFilters, setRecipientFilters] = useState({
    tenants: true,
    team: true
  });

  const [statusFilters, setStatusFilters] = useState({
    pending: true,
    delivered: true,
    failed: true
  });

  const [channelFilters, setChannelFilters] = useState({
    sms: false,
    whatsapp: false,
    email: false
  });

  // Collapsible sections
  const [collapseDate, setCollapseDate] = useState(false);
  const [collapseProperty, setCollapseProperty] = useState(false);
  const [collapseRecipient, setCollapseRecipient] = useState(false);
  const [collapseStatus, setCollapseStatus] = useState(false);
  const [collapseChannel, setCollapseChannel] = useState(false);
  const [collapseSummary, setCollapseSummary] = useState(false);
  const [collapseMessages, setCollapseMessages] = useState(false);

  // Pagination state
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Selected table rows
  const [selectedRows, setSelectedRows] = useState([]);

  // Modal triggers
  const [activeModal, setActiveModal] = useState(null);

  // Queries
  const { data: properties = [] } = useQuery({
    queryKey: ["properties"],
    queryFn: api.getProperties
  });

  const {
    data: apiReminders = [],
    isFetching: isRefreshing,
    refetch: refetchReminders
  } = useQuery({
    queryKey: ["reminders"],
    queryFn: api.getReminders
  });

  // Live local messages dispatched during current session
  const [liveMessages, setLiveMessages] = useState([]);
  const [isResending, setIsResending] = useState(false);

  // Listen for sent messages across app
  useEffect(() => {
    const handleNewMessage = (e) => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      if (e.detail && (e.detail.text || e.detail.message)) {
        setLiveMessages((prev) => [e.detail, ...prev]);
      }
    };
    window.addEventListener("dwello_message_sent", handleNewMessage);
    return () => {
      window.removeEventListener("dwello_message_sent", handleNewMessage);
    };
  }, [queryClient]);

  // Reset pagination & row selection whenever filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedRows([]);
  }, [startDate, endDate, selectedProperty, recipientFilters, statusFilters, channelFilters]);

  const messagesData = useMemo(() => {
    const mappedReminders = (Array.isArray(apiReminders) ? apiReminders : []).map((r) => {
      const rawStatus = (r.status || "").toLowerCase();
      const normalizedStatus =
        rawStatus === "sent" || rawStatus === "delivered"
          ? "delivered"
          : rawStatus === "failed"
          ? "failed"
          : "pending";
      const d = r.createdAt || r.dueDate;
      const parsedDate = d ? new Date(d) : null;
      const rawDate = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.toISOString().split("T")[0] : "";
      const propObj = r.tenantId?.unitId?.propertyId;
      const propertyId = r.propertyId
        ? String(r.propertyId)
        : propObj?._id
        ? String(propObj._id)
        : typeof propObj === "string"
        ? propObj
        : undefined;
      const propertyName = r.propertyName || propObj?.name || "";
      const unitNum = r.unitNumber || r.tenantId?.unitId?.unitNumber || "";
      const recipientType = (r.recipientType || (r.tenantId ? "tenant" : "team")).toLowerCase();
      const propertyUnit = propertyName && unitNum
        ? `${propertyName} (Unit ${unitNum})`
        : propertyName
        ? propertyName
        : unitNum
        ? `Unit ${unitNum}`
        : recipientType === "team"
        ? "Account / Team"
        : (r.title || "—");
      const methodLower = (r.method || "email").toLowerCase();
      const numericCharge = Number(r.charge || 0);
      const formattedCharge =
        numericCharge > 0
          ? `${numericCharge.toFixed(2)} KES`
          : methodLower === "sms"
          ? "0.80 KES"
          : "Email";
      return {
        _id: r._id,
        source: r.source || "reminder",
        type: methodLower.toUpperCase(),
        date: parsedDate && !isNaN(parsedDate.getTime())
          ? parsedDate.toLocaleString("en-KE", { dateStyle: "short", timeStyle: "short" })
          : "—",
        rawDate,
        recipient: r.recipientName || r.tenantId?.name || r.recipientEmail || "—",
        recipientEmail: r.recipientEmail || r.tenantId?.email || "",
        recipientType,
        propertyUnit,
        text: r.description || r.title || "—",
        charge: formattedCharge,
        status: normalizedStatus,
        propertyId,
        errorMessage: r.errorMessage || "",
        canResend: r.canResend !== undefined ? Boolean(r.canResend) : Boolean(r._id)
      };
    });
    const existingIds = new Set(mappedReminders.map((m) => String(m._id || "")).filter(Boolean));
    const uniqueLive = liveMessages.filter((m) => !m._id || !existingIds.has(String(m._id)));
    return [...uniqueLive, ...mappedReminders];
  }, [apiReminders, liveMessages]);

  const activeChannels = Object.entries(channelFilters)
    .filter(([, enabled]) => enabled)
    .map(([channel]) => channel.toLowerCase());

  const filteredMessages = messagesData.filter((m) => {
    if (selectedProperty !== "all" && m.propertyId !== selectedProperty) return false;
    if (startDate && m.rawDate && m.rawDate < startDate) return false;
    if (endDate && m.rawDate && m.rawDate > endDate) return false;
    const isTeam = (m.recipientType || "tenant").toLowerCase() === "team";
    if (!recipientFilters.tenants && !isTeam) return false;
    if (!recipientFilters.team && isTeam) return false;
    const st = (m.status || "pending").toLowerCase();
    if (statusFilters[st] === false) return false;
    if (activeChannels.length > 0 && !activeChannels.includes((m.type || "email").toLowerCase())) {
      return false;
    }
    return true;
  });

  const totalSent = filteredMessages.length;
  const totalDelivered = filteredMessages.filter((m) => m.status === "delivered").length;
  const totalFailed = filteredMessages.filter((m) => m.status === "failed").length;

  const totalPages = Math.max(1, Math.ceil(filteredMessages.length / perPage));
  const paginated = filteredMessages.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(paginated.map((_, idx) => idx));
    } else {
      setSelectedRows([]);
    }
  };

  const toggleSelectRow = (idx) => {
    if (selectedRows.includes(idx)) {
      setSelectedRows(selectedRows.filter((i) => i !== idx));
    } else {
      setSelectedRows([...selectedRows, idx]);
    }
  };

  const dispatchResend = async (msg) => {
    if (!msg?._id || msg.canResend === false) {
      throw new Error("This entry cannot be resent (read-only receipt or masked security alert).");
    }
    if (msg.source === "communication_log") {
      return api.resendCommunicationLog(msg._id);
    }
    return api.sendReminderNow(msg._id);
  };

  const handleResend = async (msg) => {
    if (!msg?._id || msg.canResend === false) {
      toast({
        variant: "destructive",
        title: "Cannot Resend",
        description: "This log entry cannot be resent directly."
      });
      return;
    }
    try {
      await dispatchResend(msg);
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast({
        title: `Message Resent via ${msg.type || "Email"}`,
        description: `Dispatched to ${msg.recipientEmail || msg.recipient || "recipient"}.`
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Resend Failed",
        description: err.message || "Could not resend message."
      });
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* ────────────────── TWO COLUMN LAYOUT ────────────────── */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* LEFT COLUMN: Filters Sidebar */}
        <aside className="w-full md:w-64 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <h4 className="text-xs font-bold text-[#0b1065] dark:text-blue-400">
              Filters
            </h4>
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setSelectedProperty("all");
                setRecipientFilters({ tenants: true, team: true });
                setStatusFilters({ pending: true, delivered: true, failed: true });
                setChannelFilters({ sms: false, whatsapp: false, email: false });
              }}
              className="text-[11px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Reset
            </button>
          </div>

          {/* 1. Date */}
          <div>
            <button
              type="button"
              onClick={() => setCollapseDate(!collapseDate)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
            >
              <span>Date</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  collapseDate ? "rotate-180" : ""
                }`}
              />
            </button>
            {!collapseDate && (
              <div className="space-y-1.5 mt-2">
                <input
                  type="text"
                  onFocus={(e) => (e.target.type = "date")}
                  onBlur={(e) => {
                    if (!e.target.value) e.target.type = "text";
                  }}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Start date"
                  className="w-full h-7.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 text-xs text-slate-600 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  onFocus={(e) => (e.target.type = "date")}
                  onBlur={(e) => {
                    if (!e.target.value) e.target.type = "text";
                  }}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="End date"
                  className="w-full h-7.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 text-xs text-slate-600 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* 2. Property / Unit */}
          <div>
            <button
              type="button"
              onClick={() => setCollapseProperty(!collapseProperty)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
            >
              <span>Property / Unit</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  collapseProperty ? "rotate-180" : ""
                }`}
              />
            </button>
            {!collapseProperty && (
              <div className="mt-2">
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="w-full h-7.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">All Properties</option>
                  {properties.map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 3. Tenant / Team */}
          <div>
            <button
              type="button"
              onClick={() => setCollapseRecipient(!collapseRecipient)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
            >
              <span>Tenant / Team</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  collapseRecipient ? "rotate-180" : ""
                }`}
              />
            </button>
            {!collapseRecipient && (
              <div className="space-y-1.5 mt-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recipientFilters.tenants}
                    onChange={(e) =>
                      setRecipientFilters({
                        ...recipientFilters,
                        tenants: e.target.checked
                      })
                    }
                    className="rounded accent-blue-600 w-3.5 h-3.5"
                  />
                  <span className="text-slate-600 dark:text-slate-400">Tenants</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recipientFilters.team}
                    onChange={(e) =>
                      setRecipientFilters({
                        ...recipientFilters,
                        team: e.target.checked
                      })
                    }
                    className="rounded accent-blue-600 w-3.5 h-3.5"
                  />
                  <span className="text-slate-600 dark:text-slate-400">Team</span>
                </label>
              </div>
            )}
          </div>

          {/* 4. Status */}
          <div>
            <button
              type="button"
              onClick={() => setCollapseStatus(!collapseStatus)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
            >
              <span>Status</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  collapseStatus ? "rotate-180" : ""
                }`}
              />
            </button>
            {!collapseStatus && (
              <div className="space-y-1.5 mt-2 text-xs">
                {["pending", "delivered", "failed"].map((s) => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer capitalize">
                    <input
                      type="checkbox"
                      checked={statusFilters[s]}
                      onChange={(e) =>
                        setStatusFilters({
                          ...statusFilters,
                          [s]: e.target.checked
                        })
                      }
                      className="rounded accent-blue-600 w-3.5 h-3.5"
                    />
                    <span className="text-slate-600 dark:text-slate-400">{s}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 5. Message Type */}
          <div>
            <button
              type="button"
              onClick={() => setCollapseChannel(!collapseChannel)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
            >
              <span>Message Type</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  collapseChannel ? "rotate-180" : ""
                }`}
              />
            </button>
            {!collapseChannel && (
              <div className="space-y-1.5 mt-2 text-xs">
                {[
                  { id: "sms", label: "SMS" },
                  { id: "whatsapp", label: "WhatsApp" },
                  { id: "email", label: "Email" }
                ].map((ch) => (
                  <label key={ch.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channelFilters[ch.id]}
                      onChange={(e) =>
                        setChannelFilters({
                          ...channelFilters,
                          [ch.id]: e.target.checked
                        })
                      }
                      className="rounded accent-blue-600 w-3.5 h-3.5"
                    />
                    <span className="text-slate-600 dark:text-slate-400">
                      {ch.label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: Summary Card + Messages Card */}
        <main className="flex-1 min-w-0 w-full space-y-4">
          {/* Summary Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer"
              onClick={() => setCollapseSummary(!collapseSummary)}
            >
              <h4 className="text-sm font-semibold text-[#0b1065] dark:text-blue-400">
                Summary
              </h4>
              <span className="text-slate-400 text-lg leading-none select-none">–</span>
            </div>

            {!collapseSummary && (
              <div className="p-6 grid grid-cols-3 text-center divide-x divide-slate-100 dark:divide-slate-800">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Total
                  </p>
                  <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-2">
                    {totalSent}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">(sent)</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Delivered
                  </p>
                  <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-2">
                    {totalDelivered}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">(delivered)</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Failed
                  </p>
                  <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-2">
                    {totalFailed}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">(failed)</p>
                </div>
              </div>
            )}
          </div>

          {/* Messages Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer"
              onClick={() => setCollapseMessages(!collapseMessages)}
            >
              <h4 className="text-sm font-semibold text-[#0b1065] dark:text-blue-400">
                Messages
              </h4>
              <span className="text-slate-400 text-lg leading-none select-none">–</span>
            </div>

            {!collapseMessages && (
              <>
                {/* Action Toolbar */}
                <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-800/20">
                  <Button
                    disabled={isResending}
                    onClick={async () => {
                      if (selectedRows.length === 0) {
                        toast({
                          title: "No Messages Selected",
                          description: "Please select messages to resend."
                        });
                        return;
                      }
                      const targets = selectedRows.map((i) => paginated[i]).filter(Boolean);
                      setIsResending(true);
                      let sentCount = 0;
                      let failedCount = 0;
                      let lastErr = "";
                      for (const msg of targets) {
                        try {
                          await dispatchResend(msg);
                          sentCount++;
                        } catch (err) {
                          failedCount++;
                          lastErr = err.message || "Send failed";
                        }
                      }
                      setIsResending(false);
                      setSelectedRows([]);
                      queryClient.invalidateQueries({ queryKey: ["reminders"] });
                      if (sentCount === 0) {
                        toast({
                          variant: "destructive",
                          title: "Resend Failed",
                          description: lastErr || "Could not resend selected messages."
                        });
                      } else {
                        toast({
                          title: "Messages Resent",
                          description: failedCount > 0
                            ? `Sent ${sentCount} message(s) (${failedCount} skipped/failed: ${lastErr}).`
                            : `Successfully resent ${sentCount} message(s).`
                        });
                      }
                    }}
                    variant="outline"
                    className="text-xs h-7.5 px-3.5 gap-1.5 font-medium text-[#0b1065] border-slate-300 hover:bg-slate-100 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-[#0b1065]" />
                    <span>{isResending ? "Resending..." : "Resend Messages"}</span>
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => refetchReminders()}
                      disabled={isRefreshing}
                      className="text-xs h-7.5 px-3 gap-1.5 font-medium text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                      <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setActiveModal("send_message")}
                      className="text-xs h-7.5 px-3.5 gap-1.5 font-medium bg-[#0b1065] hover:bg-[#090d52] text-white cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Send Message</span>
                    </Button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                      <tr>
                        <th className="py-2.5 px-3 w-8 text-center">
                          <input
                            type="checkbox"
                            onChange={toggleSelectAll}
                            checked={
                              paginated.length > 0 &&
                              selectedRows.length === paginated.length
                            }
                            className="rounded accent-blue-600 w-3.5 h-3.5"
                          />
                        </th>
                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                          Type
                        </th>
                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                          Date
                        </th>
                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                          Tenant/Team
                        </th>
                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                          Property (Unit)
                        </th>
                        <th className="py-2.5 px-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                          Message
                        </th>
                        <th className="py-2.5 px-4 text-center font-semibold text-slate-600 dark:text-slate-400">
                          SMS Charge
                        </th>
                        <th className="py-2.5 px-4 text-center font-semibold text-slate-600 dark:text-slate-400">
                          Status
                        </th>
                        <th className="py-2.5 px-4 text-right font-semibold text-slate-600 dark:text-slate-400">
                          Resend
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {paginated.length === 0 ? null : (
                        paginated.map((msg, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={selectedRows.includes(idx)}
                                onChange={() => toggleSelectRow(idx)}
                                className="rounded accent-blue-600 w-3.5 h-3.5"
                              />
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 uppercase text-[11px]">
                              {msg.type || "SMS"}
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                              {msg.date || "—"}
                            </td>
                            <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200 font-medium">
                              {msg.recipient || "—"}
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                              {msg.propertyUnit || "—"}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={msg.text || ""}>
                              {msg.text || "—"}
                            </td>
                            <td className="py-2.5 px-4 text-center text-slate-700 dark:text-slate-300">
                              {msg.charge || "0.80 KES"}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span
                                title={msg.errorMessage || ""}
                                className={`px-2 py-0.5 rounded-full text-[10px] capitalize ${
                                  msg.status === "failed"
                                    ? "bg-rose-100 text-rose-700"
                                    : msg.status === "pending"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {msg.status || "delivered"}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={!msg._id || msg.canResend === false}
                                title={
                                  !msg._id || msg.canResend === false
                                    ? "Read-only receipt or masked security alert"
                                    : "Resend message"
                                }
                                onClick={() => handleResend(msg)}
                                className="h-6 text-xs text-blue-600 hover:text-blue-700 px-2 disabled:opacity-40"
                              >
                                <RotateCw className="w-3 h-3 mr-1" /> Resend
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <select
                      value={perPage}
                      onChange={(e) => {
                        setPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-6.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 text-xs focus:outline-none"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                    <span>
                      Showing {filteredMessages.length === 0 ? "0 to 0" : `${(currentPage - 1) * perPage + 1} to ${Math.min(currentPage * perPage, filteredMessages.length)}`} of {filteredMessages.length} Results
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold text-xs">
                      {currentPage}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Global Modals for Send Message */}
      <ActionModals
        modalType={activeModal}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
