import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Send,
  Minus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCw
} from "lucide-react";
import { ActionModals } from "@/components/dashboard/Modals";

export default function CommunicationPage() {
  const { toast } = useToast();

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

  // Messages list state
  const [messagesData, setMessagesData] = useState([]);

  // Listen for sent messages across app
  useEffect(() => {
    const handleNewMessage = (e) => {
      if (e.detail) {
        setMessagesData((prev) => [e.detail, ...prev]);
      }
    };
    window.addEventListener("dwello_message_sent", handleNewMessage);
    return () => {
      window.removeEventListener("dwello_message_sent", handleNewMessage);
    };
  }, []);

  const totalSent = messagesData.length;
  const totalDelivered = messagesData.filter((m) => m.status === "delivered").length;
  const totalFailed = messagesData.filter((m) => m.status === "failed").length;

  const filteredMessages = messagesData.filter((m) => {
    if (selectedProperty !== "all" && m.propertyId !== selectedProperty) return false;
    return true;
  });

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

  const handleResend = (msg) => {
    toast({
      title: "Resending Message",
      description: `Re-dispatching message to ${msg.recipient || "recipient"}.`
    });
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
            <span className="w-2.5 h-0.5 bg-[#4f46e5] rounded select-none cursor-pointer"></span>
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
                  <option value="all">
                    No properties yet — add one from the Properties page
                  </option>
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
                <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-800/20">
                  <Button
                    onClick={() => {
                      if (selectedRows.length === 0) {
                        toast({
                          title: "No Messages Selected",
                          description: "Please select messages to resend."
                        });
                        return;
                      }
                      toast({
                        title: "Resending Messages",
                        description: `Re-dispatching ${selectedRows.length} messages.`
                      });
                      setSelectedRows([]);
                    }}
                    variant="outline"
                    className="text-xs h-7.5 px-3.5 gap-1.5 font-medium text-[#0b1065] border-slate-300 hover:bg-slate-100 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-[#0b1065]" />
                    <span>Resend Messages</span>
                  </Button>
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
                            <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                              {msg.text || "—"}
                            </td>
                            <td className="py-2.5 px-4 text-center text-slate-700 dark:text-slate-300">
                              {msg.charge || "0.80 KES"}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-700 capitalize">
                                {msg.status || "delivered"}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResend(msg)}
                                className="h-6 text-xs text-blue-600 hover:text-blue-700 px-2"
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
