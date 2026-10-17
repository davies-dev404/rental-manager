import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Plus,
  Eye,
  Download,
  Trash2,
  CheckCircle,
  Ban,
  Search,
  FileCheck,
  Send,
  Printer,
  ChevronRight,
  Clock,
  Sparkles,
  Layers,
  FilePlus,
  ShieldAlert
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

// Default pre-loaded document templates
const DEFAULT_TEMPLATES = [
  {
    id: "tpl_res_lease",
    title: "Standard Residential Lease Agreement",
    filename: "Standard Residential Lease Agreement.docx",
    category: "Lease Agreement",
    description: "Auto-fills tenant details, unit number, monthly rent, deposit and term.",
    content: `RESIDENTIAL LEASE AGREEMENT

This Agreement is made on {{date}} between MakaaziHub Property Management ("Landlord") and {{tenant_name}} ("Tenant") for the rental of premises located at Unit {{unit_number}}, {{property_name}}.

1. TERM: The lease shall commence on {{start_date}} for an initial period of 12 months.
2. RENT: Tenant agrees to pay monthly rent of KES {{rent_amount}} payable on or before the 5th of each calendar month.
3. SECURITY DEPOSIT: Tenant has deposited KES {{deposit_amount}} as security against damage or breach.
4. UTILITIES: Tenant is responsible for electricity and water consumption based on sub-meter readings.
5. GOVERNING LAW: This agreement shall be governed by the laws of the Republic of Kenya.

Signatures:
Landlord: MakaaziHub Management
Tenant: {{tenant_name}}`
  },
  {
    id: "tpl_comm_lease",
    title: "Commercial Space Tenancy Contract",
    filename: "Commercial Space Tenancy Contract.docx",
    category: "Commercial",
    description: "Tailored for retail and commercial premises with VAT, service charge, and fit-out terms.",
    content: `COMMERCIAL LEASE CONTRACT

This Commercial Tenancy Agreement is entered into on {{date}} by and between MakaaziHub ("Landlord") and {{tenant_name}} ("Lessee").

Premises: Commercial Unit {{unit_number}}, {{property_name}}.
Permitted Use: General Office / Retail operations.
Agreed Rent: KES {{rent_amount}} per month (exclusive of statutory VAT & service charges).
Term: 3 Years with review clause.`
  },
  {
    id: "tpl_arrears_notice",
    title: "Formal Rent Arrears Demand Notice",
    filename: "Formal Rent Arrears Demand Notice.pdf",
    category: "Notice",
    description: "Statutory 14-day demand letter with outstanding arrears calculation.",
    content: `FORMAL NOTICE OF RENT ARREARS

Date: {{date}}
To: {{tenant_name}}
Unit: {{unit_number}}, {{property_name}}

RE: OUTSTANDING RENT BALANCE DEMAND

Our accounting records indicate that your rent account is currently in arrears amounting to KES {{rent_amount}}.

Kindly settle this outstanding sum within fourteen (14) days from the date of this notice to prevent further administrative actions or penalties.

MakaaziHub Property Accounts`
  },
  {
    id: "tpl_vacate_notice",
    title: "30-Day Notice to Vacate",
    filename: "30-Day Notice to Vacate.pdf",
    category: "Notice",
    description: "Formal notice to vacate with move-out guidelines and deposit refund terms.",
    content: `NOTICE TO VACATE PREMISES

Date: {{date}}
Tenant: {{tenant_name}}
Unit: {{unit_number}}

Please be advised that your tenancy for the above-referenced premises will terminate on {{expiry_date}}. You are required to surrender possession of the unit cleaned and with all keys returned for final inspection.`
  },
  {
    id: "tpl_movein_checklist",
    title: "Move-in Condition Inspection Checklist",
    filename: "Move-in Condition Inspection Checklist.pdf",
    category: "Inspection",
    description: "Detailed unit handover, electrical fixtures, plumbing and meter verification form.",
    content: `MOVE-IN CONDITION INSPECTION REPORT

Property: {{property_name}} | Unit: {{unit_number}}
Tenant: {{tenant_name}}
Date: {{date}}

Items Inspected:
[✓] Main Entry & Lockset
[✓] Electrical Sockets & Lighting
[✓] Kitchen Cabinetry & Sink
[✓] Bathroom Plumbing & Taps
[✓] Water Meter Reading: Verified
[✓] Power Meter Reading: Verified`
  }
];

export default function DocumentsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Active Sub-tab: 'documents' | 'templates'
  const [docSubTab, setDocSubTab] = useState("documents");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals state
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Form State for New Document
  const [newDocData, setNewDocData] = useState({
    title: "",
    type: "Lease Agreement",
    tenantId: "",
    tenantName: "",
    unit: "",
    rent: "",
    startDate: new Date().toISOString().split("T")[0],
    notes: ""
  });

  // Form State for New Template
  const [newTemplateData, setNewTemplateData] = useState({
    title: "",
    category: "General",
    description: "",
    content: ""
  });

  // Load Tenants & Properties for dropdowns
  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: api.getTenants
  });

  // Documents list persisted in localStorage
  const [docList, setDocList] = useState(() => {
    try {
      const saved =
        localStorage.getItem("makaazihub_tenant_documents") ||
        localStorage.getItem("dwello_tenant_documents");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Templates list persisted in localStorage
  const [templates, setTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem("makaazihub_document_templates");
      return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
    } catch {
      return DEFAULT_TEMPLATES;
    }
  });

  const saveDocuments = (docs) => {
    setDocList(docs);
    localStorage.setItem("makaazihub_tenant_documents", JSON.stringify(docs));
    localStorage.setItem("dwello_tenant_documents", JSON.stringify(docs));
  };

  const saveTemplates = (tpls) => {
    setTemplates(tpls);
    localStorage.setItem("makaazihub_document_templates", JSON.stringify(tpls));
  };

  // When a tenant is selected in New Document modal, auto-populate details
  const handleTenantSelect = (tenantId) => {
    const selected = tenants.find((t) => String(t._id || t.id) === String(tenantId));
    if (selected) {
      setNewDocData((prev) => ({
        ...prev,
        tenantId,
        tenantName: selected.name,
        unit: selected.unitId?.unitNumber || selected.unitNumber || "Unit A1",
        rent: selected.rentAmount || selected.unitId?.rentAmount || "25,000",
        title: prev.title || `${prev.type} - ${selected.name}`
      }));
    } else {
      setNewDocData((prev) => ({ ...prev, tenantId }));
    }
  };

  // Create Document Handler
  const handleCreateDocument = (e) => {
    e.preventDefault();
    if (!newDocData.title.trim()) {
      toast({
        variant: "destructive",
        title: "Title Required",
        description: "Please provide a document title."
      });
      return;
    }

    const created = {
      id: `DOC-${Date.now().toString().slice(-6)}`,
      title: newDocData.title.trim(),
      type: newDocData.type,
      tenant: newDocData.tenantName || "Unassigned Tenant",
      unit: newDocData.unit || "General Unit",
      rent: newDocData.rent || "-",
      status: "pending", // 'pending' | 'completed' | 'voided'
      date: newDocData.startDate || new Date().toISOString().split("T")[0],
      content: `DOCUMENT: ${newDocData.title}
Tenant: ${newDocData.tenantName || "N/A"}
Unit: ${newDocData.unit || "N/A"}
Date Created: ${new Date().toLocaleDateString()}
Status: Pending Signature

Terms & Specifics:
1. Rent Amount: KES ${newDocData.rent || "25,000"}
2. Start Date: ${newDocData.startDate}
3. Notes: ${newDocData.notes || "Standard terms apply."}

Generated by MakaaziHub Documents Engine.`
    };

    const next = [created, ...docList];
    saveDocuments(next);
    setIsNewDocModalOpen(false);
    setNewDocData({
      title: "",
      type: "Lease Agreement",
      tenantId: "",
      tenantName: "",
      unit: "",
      rent: "",
      startDate: new Date().toISOString().split("T")[0],
      notes: ""
    });

    toast({
      title: "Document Created 🎉",
      description: `"${created.title}" is ready and pending signature.`
    });
  };

  // Create Template Handler
  const handleCreateTemplate = (e) => {
    e.preventDefault();
    if (!newTemplateData.title.trim()) {
      toast({
        variant: "destructive",
        title: "Title Required",
        description: "Please specify a template title."
      });
      return;
    }

    const tpl = {
      id: `tpl_${Date.now()}`,
      title: newTemplateData.title.trim(),
      filename: `${newTemplateData.title.trim()}.docx`,
      category: newTemplateData.category || "Custom",
      description: newTemplateData.description || "Custom tenant template.",
      content: newTemplateData.content || `TEMPORARY TEMPLATE: ${newTemplateData.title}\n\nTenant: {{tenant_name}}\nUnit: {{unit_number}}\nDate: {{date}}`
    };

    const next = [tpl, ...templates];
    saveTemplates(next);
    setIsNewTemplateModalOpen(false);
    setNewTemplateData({ title: "", category: "General", description: "", content: "" });

    toast({
      title: "Template Saved",
      description: `New template "${tpl.title}" added to library.`
    });
  };

  // Status Actions
  const handleMarkCompleted = (docId) => {
    const next = docList.map((d) => (d.id === docId ? { ...d, status: "completed" } : d));
    saveDocuments(next);
    toast({
      title: "Document Completed",
      description: "Marked as signed and served."
    });
    if (previewDoc && previewDoc.id === docId) {
      setPreviewDoc((prev) => ({ ...prev, status: "completed" }));
    }
  };

  const handleVoidDocument = (docId) => {
    const next = docList.map((d) => (d.id === docId ? { ...d, status: "voided" } : d));
    saveDocuments(next);
    toast({
      title: "Document Voided",
      description: "Document marked as voided."
    });
    if (previewDoc && previewDoc.id === docId) {
      setPreviewDoc((prev) => ({ ...prev, status: "voided" }));
    }
  };

  const handleDeleteDocument = (docId) => {
    const next = docList.filter((d) => d.id !== docId);
    saveDocuments(next);
    toast({
      title: "Document Removed",
      description: "Document deleted from system."
    });
    if (previewDoc && previewDoc.id === docId) {
      setPreviewDoc(null);
    }
  };

  // Filtered Documents
  const filteredDocs = docList.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.tenant && doc.tenant.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.unit && doc.unit.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = docList.filter((d) => d.status === "pending").length;
  const completedCount = docList.filter((d) => d.status === "completed").length;
  const voidedCount = docList.filter((d) => d.status === "voided").length;

  return (
    <div className="space-y-6">
      
      {/* ────────────────── TWO-COLUMN INNER SETTINGS LAYOUT (Matching Bomahut Screenshot) ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
        
        {/* Left Column: Submenu Navigation */}
        <aside className="md:col-span-1 space-y-1 text-xs">
          <Link
            href="/settings?tab=account"
            className="block px-3 py-2 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
          >
            Account Info
          </Link>
          <Link
            href="/settings?tab=alerts"
            className="block px-3 py-2 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
          >
            Alerts
          </Link>
          <Link
            href="/settings?tab=billing"
            className="block px-3 py-2 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
          >
            Billing
          </Link>
          {/* Active Documents Pill matching screenshot */}
          <div className="px-3 py-2 rounded-md bg-slate-200 dark:bg-slate-800 font-semibold text-slate-900 dark:text-slate-100 cursor-default">
            Documents (beta)
          </div>
          <Link
            href="/settings?tab=templates"
            className="block px-3 py-2 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
          >
            Custom Message Template
          </Link>
          <Link
            href="/settings?tab=audit"
            className="block px-3 py-2 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
          >
            Audit Trail
          </Link>
        </aside>

        {/* Right Column: Main Documents Workspace */}
        <main className="md:col-span-4 space-y-6">
          
          {/* Top Bar: Title & Primary Buttons (Matching Screenshot) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-normal text-slate-800 dark:text-slate-100">
                Documents (beta)
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Leases, notices and letters for your tenants.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setIsNewDocModalOpen(true)}
                className="bg-[#06083b] hover:bg-[#0b1065] text-white text-xs h-8 px-4 font-semibold shadow-xs cursor-pointer transition-colors"
              >
                New document
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsNewTemplateModalOpen(true)}
                className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs h-8 px-4 font-semibold shadow-xs cursor-pointer transition-colors"
              >
                New template
              </Button>
            </div>
          </div>

          {/* Sub-Tabs: Documents | Templates */}
          <div className="flex gap-6 border-b border-slate-200 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setDocSubTab("documents")}
              className={`pb-2.5 font-semibold transition cursor-pointer relative ${
                docSubTab === "documents"
                  ? "text-[#06083b] dark:text-blue-400 border-b-2 border-[#06083b] dark:border-blue-400"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Documents
            </button>
            <button
              type="button"
              onClick={() => setDocSubTab("templates")}
              className={`pb-2.5 font-semibold transition cursor-pointer relative ${
                docSubTab === "templates"
                  ? "text-[#06083b] dark:text-blue-400 border-b-2 border-[#06083b] dark:border-blue-400"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Templates
            </button>
          </div>

          {/* ────────────────── TAB 1: DOCUMENTS ────────────────── */}
          {docSubTab === "documents" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* 3 Summary Cards (Exact Layout from Screenshot) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* PENDING Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-500 tracking-wider">
                    PENDING
                  </div>
                  <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 my-1">
                    {pendingCount}
                  </div>
                  <div className="text-xs text-slate-400">
                    Not yet signed or served
                  </div>
                </div>

                {/* COMPLETED Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-500 tracking-wider">
                    COMPLETED
                  </div>
                  <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 my-1">
                    {completedCount}
                  </div>
                  <div className="text-xs text-slate-400">
                    Signed or served, downloadable
                  </div>
                </div>

                {/* VOIDED Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-500 tracking-wider">
                    VOIDED
                  </div>
                  <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 my-1">
                    {voidedCount}
                  </div>
                  <div className="text-xs text-slate-400">
                    Kept on record, no longer valid
                  </div>
                </div>
              </div>

              {/* Main Content Area: Empty State OR Populated Table */}
              {docList.length === 0 ? (
                /* Empty State Card matching screenshot */
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-16 px-6 text-center shadow-xs">
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                    No documents yet
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 mb-5 max-w-sm mx-auto">
                    Create a lease, notice or letter and send it to a tenant.
                  </p>
                  <Button
                    onClick={() => setIsNewDocModalOpen(true)}
                    className="bg-[#06083b] hover:bg-[#0b1065] text-white text-xs h-8 px-5 font-semibold cursor-pointer shadow-xs transition-colors"
                  >
                    New document
                  </Button>
                </div>
              ) : (
                /* Documents Table */
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs overflow-hidden space-y-3 p-4">
                  
                  {/* Search and Filter Controls */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-64">
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search documents, tenants, units..."
                        className="text-xs h-8 pl-8 pr-3"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                    </div>

                    <div className="flex items-center gap-1.5 self-end text-xs">
                      <span className="text-slate-400 text-[11px]">Filter:</span>
                      {["all", "pending", "completed", "voided"].map((st) => (
                        <button
                          key={st}
                          onClick={() => setStatusFilter(st)}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize transition cursor-pointer ${
                            statusFilter === st
                              ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Document Title</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Tenant / Recipient</th>
                          <th className="py-2.5 px-3">Unit</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredDocs.map((doc) => (
                          <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                              <div className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="hover:underline cursor-pointer" onClick={() => setPreviewDoc(doc)}>
                                  {doc.title}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                              {doc.type}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 font-medium">
                              {doc.tenant}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                              {doc.unit}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                                  doc.status === "completed"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : doc.status === "voided"
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                }`}
                              >
                                {doc.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">
                              {doc.date}
                            </td>
                            <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPreviewDoc(doc)}
                                className="h-6 px-2 text-[11px] text-blue-600 hover:text-blue-800"
                                title="View Document"
                              >
                                <Eye className="w-3 h-3 mr-1" /> View
                              </Button>

                              {doc.status === "pending" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkCompleted(doc.id)}
                                  className="h-6 px-2 text-[11px] text-emerald-600 hover:text-emerald-800"
                                  title="Mark Signed"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" /> Sign
                                </Button>
                              )}

                              {doc.status !== "voided" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleVoidDocument(doc.id)}
                                  className="h-6 px-2 text-[11px] text-slate-400 hover:text-rose-600"
                                  title="Void"
                                >
                                  <Ban className="w-3 h-3" />
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="h-6 px-2 text-[11px] text-slate-400 hover:text-rose-600"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ────────────────── TAB 2: TEMPLATES ────────────────── */}
          {docSubTab === "templates" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Template Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-500 tracking-wider">ACTIVE</div>
                  <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 my-1">
                    {templates.length}
                  </div>
                  <div className="text-xs text-slate-400">Ready to generate leases and notices</div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-500 tracking-wider">CATEGORIES</div>
                  <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 my-1">4</div>
                  <div className="text-xs text-slate-400">Residential, Commercial, Notices, Handover</div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-500 tracking-wider">AUTOMATIONS</div>
                  <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 my-1">Enabled</div>
                  <div className="text-xs text-slate-400">Auto-fill variables from tenant database</div>
                </div>
              </div>

              {/* Template Cards List */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 text-xs bg-white dark:bg-slate-900 shadow-xs">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {tpl.filename || tpl.title}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {tpl.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {tpl.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPreviewDoc({
                            id: tpl.id,
                            title: tpl.title,
                            type: tpl.category,
                            tenant: "Sample Tenant",
                            unit: "Sample Unit",
                            status: "template",
                            date: new Date().toISOString().split("T")[0],
                            content: tpl.content
                          });
                        }}
                        className="h-7 text-xs border-slate-300 cursor-pointer"
                      >
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setNewDocData((prev) => ({
                            ...prev,
                            title: tpl.title,
                            type: tpl.category,
                            notes: tpl.content
                          }));
                          setIsNewDocModalOpen(true);
                        }}
                        className="h-7 text-xs bg-[#06083b] hover:bg-[#0b1065] text-white font-medium cursor-pointer"
                      >
                        Use Template
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ────────────────── DIALOG: CREATE NEW DOCUMENT ────────────────── */}
      <Dialog open={isNewDocModalOpen} onOpenChange={setIsNewDocModalOpen}>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FilePlus className="w-4 h-4 text-blue-600" />
              Generate Tenant Document
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create and dispatch a formal lease, notice, or letter for a tenant.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateDocument} className="space-y-4 pt-2 text-xs">
            
            {/* Title */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Document Title *</Label>
              <Input
                required
                value={newDocData.title}
                onChange={(e) => setNewDocData({ ...newDocData, title: e.target.value })}
                placeholder="e.g. Residential Lease Agreement - Unit 4B"
                className="text-xs h-8"
              />
            </div>

            {/* Type & Tenant Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Document Type</Label>
                <select
                  value={newDocData.type}
                  onChange={(e) => setNewDocData({ ...newDocData, type: e.target.value })}
                  className="w-full h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs"
                >
                  <option value="Lease Agreement">Lease Agreement</option>
                  <option value="Commercial Tenancy">Commercial Tenancy</option>
                  <option value="Rent Arrears Demand">Rent Arrears Demand</option>
                  <option value="Notice to Vacate">Notice to Vacate</option>
                  <option value="Move-in Inspection">Move-in Inspection</option>
                  <option value="Payment Reminder">Payment Reminder</option>
                  <option value="General Letter">General Letter</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Select Tenant</Label>
                <select
                  value={newDocData.tenantId}
                  onChange={(e) => handleTenantSelect(e.target.value)}
                  className="w-full h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs"
                >
                  <option value="">-- Choose Tenant (Optional) --</option>
                  {tenants.map((t) => (
                    <option key={t._id || t.id} value={t._id || t.id}>
                      {t.name} ({t.unitId?.unitNumber || t.unitNumber || "No Unit"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recipient Name & Unit Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-1">
                <Label className="text-xs font-medium">Tenant Name</Label>
                <Input
                  value={newDocData.tenantName}
                  onChange={(e) => setNewDocData({ ...newDocData, tenantName: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Unit No.</Label>
                <Input
                  value={newDocData.unit}
                  onChange={(e) => setNewDocData({ ...newDocData, unit: e.target.value })}
                  placeholder="e.g. A3"
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Rent Amount (KES)</Label>
                <Input
                  value={newDocData.rent}
                  onChange={(e) => setNewDocData({ ...newDocData, rent: e.target.value })}
                  placeholder="e.g. 25,000"
                  className="text-xs h-8"
                />
              </div>
            </div>

            {/* Start Date */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Effective Date</Label>
              <Input
                type="date"
                value={newDocData.startDate}
                onChange={(e) => setNewDocData({ ...newDocData, startDate: e.target.value })}
                className="text-xs h-8"
              />
            </div>

            {/* Specific Clauses / Notes */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Additional Clauses / Terms</Label>
              <textarea
                rows={3}
                value={newDocData.notes}
                onChange={(e) => setNewDocData({ ...newDocData, notes: e.target.value })}
                placeholder="Specific clauses, utility meter details, deposit terms..."
                className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewDocModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#06083b] hover:bg-[#0b1065] text-white text-xs font-semibold px-4"
              >
                Create Document
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ────────────────── DIALOG: CREATE NEW TEMPLATE ────────────────── */}
      <Dialog open={isNewTemplateModalOpen} onOpenChange={setIsNewTemplateModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Create Document Template
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Save reusable text templates with auto-fill variables like {"{{tenant_name}}"}, {"{{unit_number}}"}, and {"{{rent_amount}}"}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTemplate} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Template Title *</Label>
              <Input
                required
                value={newTemplateData.title}
                onChange={(e) => setNewTemplateData({ ...newTemplateData, title: e.target.value })}
                placeholder="e.g. Furnished Apartment Tenancy Agreement"
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Category</Label>
              <select
                value={newTemplateData.category}
                onChange={(e) => setNewTemplateData({ ...newTemplateData, category: e.target.value })}
                className="w-full h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs"
              >
                <option value="Lease Agreement">Lease Agreement</option>
                <option value="Commercial">Commercial</option>
                <option value="Notice">Notice</option>
                <option value="Inspection">Inspection</option>
                <option value="General">General</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Short Description</Label>
              <Input
                value={newTemplateData.description}
                onChange={(e) => setNewTemplateData({ ...newTemplateData, description: e.target.value })}
                placeholder="Brief summary of when to use this template..."
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Template Body</Label>
                <span className="text-[10px] text-blue-600 font-mono">
                  Supported: {"{{tenant_name}}"}, {"{{unit_number}}"}, {"{{rent_amount}}"}
                </span>
              </div>
              <textarea
                rows={5}
                value={newTemplateData.content}
                onChange={(e) => setNewTemplateData({ ...newTemplateData, content: e.target.value })}
                placeholder="Draft template clauses here..."
                className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewTemplateModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#06083b] hover:bg-[#0b1065] text-white text-xs font-semibold px-4"
              >
                Save Template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ────────────────── DIALOG: DOCUMENT VIEWER / PREVIEW ────────────────── */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6">
          {previewDoc && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    {previewDoc.title}
                  </DialogTitle>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      previewDoc.status === "completed"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : previewDoc.status === "voided"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {previewDoc.status}
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500">
                  Recipient: <strong className="text-slate-700 dark:text-slate-300">{previewDoc.tenant}</strong> ({previewDoc.unit}) • Date: {previewDoc.date}
                </DialogDescription>
              </DialogHeader>

              {/* Printable Document Paper View */}
              <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-lg border border-slate-200 dark:border-slate-800 font-serif text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-96 overflow-y-auto shadow-inner">
                {previewDoc.content || "Standard agreement content generated automatically."}
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between pt-2 gap-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.print();
                    }}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "Download Started",
                        description: `Exporting ${previewDoc.title}.pdf`
                      });
                    }}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Download PDF
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {previewDoc.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => handleMarkCompleted(previewDoc.id)}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Mark Signed & Served
                    </Button>
                  )}

                  {previewDoc.status !== "voided" && previewDoc.status !== "template" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVoidDocument(previewDoc.id)}
                      className="h-8 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" /> Void
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
