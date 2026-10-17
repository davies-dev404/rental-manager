import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { usePreferences } from "@/lib/currency";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Info,
  Save,
  Download,
  Upload,
  CheckCircle2,
  Lock,
  Plus,
  Trash2,
  RefreshCw,
  Smartphone,
  Check,
  ChevronDown,
  Building2,
  User,
  Users,
  Bell,
  CreditCard,
  FileText,
  MessageSquare,
  Sliders,
  Activity,
  Database
} from "lucide-react";

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { currency, changeCurrency, timezone, changeTimezone } = usePreferences();

  // Active tab state matching Bomahut inner settings navigation
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("tab") || "general";
    }
    return "general";
  });
  const [isSaving, setIsSaving] = useState(false);

  // Sync tab with URL and custom event
  useEffect(() => {
    const handleSyncTab = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab) {
        setActiveTab(tab);
      }
    };

    handleSyncTab();
    window.addEventListener("popstate", handleSyncTab);
    const handleCustomTab = (e) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
      }
    };
    window.addEventListener("dwello_tab_change", handleCustomTab);

    return () => {
      window.removeEventListener("popstate", handleSyncTab);
      window.removeEventListener("dwello_tab_change", handleCustomTab);
    };
  }, []);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tabId);
    window.history.pushState({}, "", url.toString());
    // Also notify sidebar
    window.dispatchEvent(new CustomEvent("dwello_tab_change", { detail: { tab: tabId } }));
  };

  // General Settings State matching Bomahut General tab
  const [generalSettings, setGeneralSettings] = useState({
    companyName: "Dwello Properties Ltd",
    abbreviatedName: "Dwello",
    companyAddress: "P.O. Box 45012 - 00100, Westlands, Nairobi, Kenya",
    invoiceTitle: "Invoice",
    invoiceFootnote: "This is a computer generated invoice and does not require a physical signature.",
    currency: currency || "KES",
    timezone: timezone || "Africa/Nairobi",
    mpesaType: "Paybill",
    paybillNumber: "247247",
    paybillAccount: "Unit Number (e.g. 1B)",
    // Automated tasks
    autoRentInvoices: false,
    autoRecurringInvoices: false,
    alertLandlordNewTenant: true,
    autoSendPaymentAck: true,
    // Monthly reminder dates
    reminderDates: ["5th"],
    // Lease expiry
    leaseExpiryRange: "30",
    // Communication
    commSMS: true,
    commWhatsApp: false,
    commEmail: false,
    // Account type
    accountType: "Property Management"
  });

  // Account Form State
  const [accountForm, setAccountForm] = useState({
    name: user?.name || "Admin Manager",
    email: user?.email || "admin@dwello.co.ke",
    phone: user?.phone || "+254 712 345 678",
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Alerts State
  const [alertSettings, setAlertSettings] = useState({
    smsDueReminder: true,
    smsReceiptOnPayment: true,
    smsOverdueAlert: true,
    emailMonthlyStatement: true
  });

  // Custom Message Templates
  const [templateType, setTemplateType] = useState("reminder");
  const [templates, setTemplates] = useState({
    reminder:
      "Dear {tenant_name}, your rent of KES {amount_due} for Unit {unit_number} is due on {due_date}. Please pay via M-Pesa Paybill {paybill_no} A/C {unit_number}. Thank you.",
    receipt:
      "Received! Thank you {tenant_name}. We have received KES {amount_paid} for Unit {unit_number}. Receipt ref: {reference}. Balance: KES {balance}.",
    overdue:
      "OVERDUE NOTICE: Dear {tenant_name}, your rent of KES {amount_due} for Unit {unit_number} was due on {due_date}. Please settle promptly to avoid penalties."
  });

  // Team Members
  const [teamMembers, setTeamMembers] = useState([
    { id: "1", name: "David M.", email: "david@dwello.co.ke", role: "Administrator", status: "Active" },
    { id: "2", name: "Joseph K.", email: "joseph@dwello.co.ke", role: "Caretaker", status: "Active" },
    { id: "3", name: "Sarah W.", email: "sarah@dwello.co.ke", role: "Accountant", status: "Active" }
  ]);
  const [newTeamEmail, setNewTeamEmail] = useState("");
  const [newTeamRole, setNewTeamRole] = useState("Caretaker");

  // Custom Fields
  const [customFields, setCustomFields] = useState([
    { id: "1", target: "Unit", label: "KPLC Meter Number", type: "Text" },
    { id: "2", target: "Unit", label: "Water Meter Serial", type: "Text" },
    { id: "3", target: "Tenant", label: "National ID / Passport #", type: "Text" },
    { id: "4", target: "Tenant", label: "Emergency Contact Phone", type: "Phone" }
  ]);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldTarget, setNewFieldTarget] = useState("Unit");

  // Documents (beta) 
  const [docSubTab, setDocSubTab] = useState("documents"); // "documents" | "templates"
  const [docList, setDocList] = useState(() => {
    try {
      const saved = localStorage.getItem("dwello_tenant_documents");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [newDocData, setNewDocData] = useState({
    title: "",
    type: "Lease Agreement",
    tenant: "",
    unit: ""
  });

  // Settings Tabs List matching the vertical order in Bomahut screenshot media_1792230186332.png
  const settingsNavItems = [
    { id: "general", label: "General" },
    { id: "account", label: "Account Info" },
    { id: "team", label: "Team" },
    { id: "alerts", label: "Alerts" },
    { id: "billing", label: "Billing" },
    { id: "mpesa", label: "MPESA Transactions Status" },
    { id: "documents", label: "Documents (beta)" },
    { id: "templates", label: "Custom Message Template" },
    { id: "custom_fields", label: "Custom Fields" },
    { id: "audit", label: "Audit Trail" },
    { id: "backup", label: "Backup" }
  ];

  const handleSaveGeneral = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Settings Saved",
        description: "General organization parameters have been updated successfully."
      });
    }, 400);
  };

  const handleExportBackup = (format = "json") => {
    toast({
      title: `Exporting Database (${format.toUpperCase()})`,
      description: "Generating complete snapshot of properties, units, tenants, and transactions."
    });
    setTimeout(() => {
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(
          JSON.stringify(
            {
              exportDate: new Date().toISOString(),
              system: "Makaazihub Rental Management",
              version: "2.0"
            },
            null,
            2
          )
        );
      const dl = document.createElement("a");
      dl.setAttribute("href", dataStr);
      dl.setAttribute("download", `dwello_backup_${new Date().toISOString().split("T")[0]}.${format}`);
      dl.click();
    }, 400);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Bomahut 2-Column Settings Layout */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left Column: Vertical Settings Tabs Navigation */}
        <aside className="w-full md:w-56 shrink-0 bg-transparent space-y-1">
          {settingsNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full text-left px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer block ${
                  isActive
                    ? "bg-[#eef1f6] dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </aside>

        {/* Right Column: Settings Content Card */}
        <main className="flex-1 min-w-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-2xs">
          {/* ────────────────── 1. GENERAL TAB ────────────────── */}
          {activeTab === "general" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                General
              </h2>

              {/* Company Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Company
                </h3>

                <div className="space-y-1.5 max-w-2xl">
                  <Label className="text-xs text-slate-700 dark:text-slate-300">Company Name</Label>
                  <Input
                    placeholder="Company Name..."
                    value={generalSettings.companyName}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, companyName: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 max-w-2xl">
                  <Label className="text-xs text-slate-700 dark:text-slate-300">Abbreviated Name</Label>
                  <Input
                    placeholder="Abbreviated Name .."
                    value={generalSettings.abbreviatedName}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, abbreviatedName: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 max-w-2xl">
                  <Label className="text-xs text-slate-700 dark:text-slate-300">Company Address (optional)</Label>
                  <textarea
                    rows={3}
                    placeholder="Company Address..."
                    value={generalSettings.companyAddress}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, companyAddress: e.target.value })}
                    className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5 max-w-2xl">
                  <Label className="text-xs text-slate-700 dark:text-slate-300">Logo (Optional)</Label>
                  <div className="flex items-center gap-3">
                    <label className="border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded px-3 py-1.5 text-xs text-blue-700 dark:text-blue-400 font-medium cursor-pointer shadow-2xs transition">
                      Choose file
                      <input type="file" accept="image/*" className="hidden" />
                    </label>
                    <span className="text-xs text-slate-400">No file chosen</span>
                  </div>
                </div>

                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-slate-700 dark:text-slate-300">Title of Invoice (options)</Label>
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                  </div>
                  <Input
                    value={generalSettings.invoiceTitle}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, invoiceTitle: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-slate-700 dark:text-slate-300">Invoice Footnote (options)</Label>
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                  </div>
                  <textarea
                    rows={3}
                    placeholder="eg. This is a non-tax invoice. Leave empty for no footnote."
                    value={generalSettings.invoiceFootnote}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, invoiceFootnote: e.target.value })}
                    className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Currency Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Currency
                </h3>
                <div className="max-w-xs">
                  <select
                    value={generalSettings.currency}
                    onChange={(e) => {
                      setGeneralSettings({ ...generalSettings, currency: e.target.value });
                      changeCurrency(e.target.value);
                    }}
                    className="w-36 h-8.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-medium shadow-2xs cursor-pointer"
                  >
                    <option value="KES">KES</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="TZS">TZS</option>
                    <option value="UGX">UGX</option>
                  </select>
                </div>
              </div>

              {/* Timezone Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Timezone
                </h3>
                <div className="max-w-xs">
                  <select
                    value={generalSettings.timezone}
                    onChange={(e) => {
                      setGeneralSettings({ ...generalSettings, timezone: e.target.value });
                      changeTimezone(e.target.value);
                    }}
                    className="h-8.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-medium shadow-2xs cursor-pointer"
                  >
                    <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                    <option value="UTC">UTC</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                  </select>
                </div>
              </div>

              {/* MPESA Section */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  MPESA
                </h3>

                <div className="flex items-center gap-6 text-xs text-slate-700 dark:text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mpesaType"
                      checked={generalSettings.mpesaType === "Paybill"}
                      onChange={() => setGeneralSettings({ ...generalSettings, mpesaType: "Paybill" })}
                      className="accent-blue-600"
                    />
                    <span>Paybill</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mpesaType"
                      checked={generalSettings.mpesaType === "Till"}
                      onChange={() => setGeneralSettings({ ...generalSettings, mpesaType: "Till" })}
                      className="accent-blue-600"
                    />
                    <span>Till Number</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl pt-1">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-slate-700 dark:text-slate-300">Paybill Number</Label>
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                    </div>
                    <Input
                      placeholder="e.g. 247247"
                      value={generalSettings.paybillNumber}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, paybillNumber: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-slate-700 dark:text-slate-300">Paybill Default Account #</Label>
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                    </div>
                    <Input
                      placeholder="e.g. Unit Number"
                      value={generalSettings.paybillAccount}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, paybillAccount: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* ── Automated Tasks Section ── */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Automated Tasks
                </h3>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 -mt-2">
                  This task runs automatically between 1st and 7th of every month (listed run will be on 11/1/2026)
                </p>
                <div className="space-y-3 text-xs">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalSettings.autoRentInvoices}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, autoRentInvoices: e.target.checked })}
                      className="rounded accent-blue-600 w-3.5 h-3.5"
                    />
                    <span className="text-slate-700 dark:text-slate-300">Automatically generate rent invoices</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalSettings.autoRecurringInvoices}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, autoRecurringInvoices: e.target.checked })}
                      className="rounded accent-blue-600 w-3.5 h-3.5"
                    />
                    <span className="text-slate-700 dark:text-slate-300">Automatically generate other recurring bills invoices</span>
                  </label>
                </div>

                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-4">
                  Other Automated Tasks
                </h4>
                <div className="space-y-3 text-xs">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalSettings.alertLandlordNewTenant}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, alertLandlordNewTenant: e.target.checked })}
                      className="rounded accent-blue-600 w-3.5 h-3.5"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-700 dark:text-slate-300">Alert landlord when new tenant is added to their property.</span>
                      <Info className="w-3 h-3 text-slate-400" />
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalSettings.autoSendPaymentAck}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, autoSendPaymentAck: e.target.checked })}
                      className="rounded accent-blue-600 w-3.5 h-3.5"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-700 dark:text-slate-300">Automatically send acknowledgement for received payments</span>
                      <Info className="w-3 h-3 text-slate-400" />
                    </div>
                  </label>
                </div>
              </div>

              {/* ── Monthly Payment Reminders ── */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Monthly Payment Reminders
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Choose date(s) to remind clients</p>
                <div className="space-y-2 text-xs">
                  {["5th", "10th", "15th", "20th", "25th"].map((date) => (
                    <label key={date} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={generalSettings.reminderDates.includes(date)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...generalSettings.reminderDates, date]
                            : generalSettings.reminderDates.filter((d) => d !== date);
                          setGeneralSettings({ ...generalSettings, reminderDates: next });
                        }}
                        className="rounded accent-blue-600 w-3.5 h-3.5"
                      />
                      <span className="text-slate-700 dark:text-slate-300">{date}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ── Lease Expiry Notifications ── */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Lease Expiry Notifications
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Receive SMS and dashboard alerts for leases expiring within this range:
                </p>
                <select
                  value={generalSettings.leaseExpiryRange}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, leaseExpiryRange: e.target.value })}
                  className="w-64 h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs shadow-xs cursor-pointer"
                >
                  <option value="">Select range...</option>
                  <option value="7">7 days before expiry</option>
                  <option value="14">14 days before expiry</option>
                  <option value="30">30 days before expiry</option>
                  <option value="60">60 days before expiry</option>
                  <option value="90">90 days before expiry</option>
                </select>
              </div>

              {/* ── Communication Options ── */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Communication Options
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select how you want to communicate with tenants. You can choose multiple methods.{" "}
                  <span className="text-blue-600 font-medium">Whatsapp & SMS are mutually exclusive.</span>
                </p>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalSettings.commSMS}
                      onChange={(e) => {
                        setGeneralSettings({
                          ...generalSettings,
                          commSMS: e.target.checked,
                          commWhatsApp: e.target.checked ? false : generalSettings.commWhatsApp
                        });
                      }}
                      className="rounded accent-blue-600 w-3.5 h-3.5"
                    />
                    <span className="text-slate-700 dark:text-slate-300">SMS</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalSettings.commWhatsApp}
                      onChange={(e) => {
                        setGeneralSettings({
                          ...generalSettings,
                          commWhatsApp: e.target.checked,
                          commSMS: e.target.checked ? false : generalSettings.commSMS
                        });
                      }}
                      className="rounded accent-blue-600 w-3.5 h-3.5"
                    />
                    <span className="text-slate-700 dark:text-slate-300">WhatsApp</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalSettings.commEmail}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, commEmail: e.target.checked })}
                      className="rounded accent-blue-600 w-3.5 h-3.5"
                    />
                    <span className="text-slate-700 dark:text-slate-300">Email</span>
                  </label>
                </div>
              </div>

              {/* ── Account Type ── */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Account Type
                </h3>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">Select Account/Property Type</p>
                  <select
                    value={generalSettings.accountType}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, accountType: e.target.value })}
                    className="w-64 h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs shadow-xs cursor-pointer"
                  >
                    <option value="Property Management">Property Management</option>
                    <option value="Self-Managed">Self-Managed Landlord</option>
                    <option value="Agency">Real Estate Agency</option>
                    <option value="Student Housing">Student Housing</option>
                    <option value="Commercial">Commercial Properties</option>
                  </select>
                </div>
              </div>

              {/* ── Update Settings Button (Bomahut primary navy button) ── */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button
                  onClick={handleSaveGeneral}
                  disabled={isSaving}
                  className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs px-8 py-2.5 h-auto"
                >
                  {isSaving ? "Saving..." : "Update Settings"}
                </Button>
              </div>
            </div>
          )}


          {/* ────────────────── 2. ACCOUNT INFO ────────────────── */}
          {activeTab === "account" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Account Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                <div className="space-y-1.5">
                  <Label className="text-xs">Full Name</Label>
                  <Input
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email Address</Label>
                  <Input
                    value={accountForm.email}
                    onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone Number</Label>
                  <Input
                    value={accountForm.phone}
                    onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 max-w-2xl">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600" /> Change Password
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Current Password</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={accountForm.oldPassword}
                      onChange={(e) => setAccountForm({ ...accountForm, oldPassword: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">New Password</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={accountForm.newPassword}
                      onChange={(e) => setAccountForm({ ...accountForm, newPassword: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Confirm Password</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={accountForm.confirmPassword}
                      onChange={(e) => setAccountForm({ ...accountForm, confirmPassword: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button
                  onClick={() => toast({ title: "Account Updated", description: "Profile saved." })}
                  className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs px-6"
                >
                  Save Account Changes
                </Button>
              </div>
            </div>
          )}

          {/* ────────────────── 3. TEAM ────────────────── */}
          {activeTab === "team" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Team
              </h2>

              <div className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Invite Colleague by Email</Label>
                  <Input
                    placeholder="colleague@domain.com"
                    value={newTeamEmail}
                    onChange={(e) => setNewTeamEmail(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="w-48 space-y-1">
                  <Label className="text-xs">Role</Label>
                  <select
                    value={newTeamRole}
                    onChange={(e) => setNewTeamRole(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                  >
                    <option value="Administrator">Administrator (Full Access)</option>
                    <option value="Property Manager">Property Manager</option>
                    <option value="Caretaker">Caretaker</option>
                    <option value="Accountant">Accountant</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => {
                      if (!newTeamEmail.trim()) return;
                      setTeamMembers([
                        ...teamMembers,
                        {
                          id: String(Date.now()),
                          name: newTeamEmail.split("@")[0],
                          email: newTeamEmail,
                          role: newTeamRole,
                          status: "Active"
                        }
                      ]);
                      setNewTeamEmail("");
                      toast({ title: "Team Member Added" });
                    }}
                    className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Member
                  </Button>
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b">
                    <tr>
                      <th className="py-2.5 px-4 text-left font-semibold">Name</th>
                      <th className="py-2.5 px-4 text-left font-semibold">Email</th>
                      <th className="py-2.5 px-4 text-left font-semibold">Role</th>
                      <th className="py-2.5 px-4 text-left font-semibold">Status</th>
                      <th className="py-2.5 px-4 text-center font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">{member.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{member.email}</td>
                        <td className="py-3 px-4"><Badge variant="outline" className="text-[10px]">{member.role}</Badge></td>
                        <td className="py-3 px-4 text-emerald-600 font-medium">{member.status}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setTeamMembers(teamMembers.filter((m) => m.id !== member.id))}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ────────────────── 4. ALERTS ────────────────── */}
          {activeTab === "alerts" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Alerts & Reminders
              </h2>
              <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Upcoming Rent Due SMS</p>
                    <p className="text-muted-foreground text-[11px]">Notify tenants before their rent due date.</p>
                  </div>
                  <Switch
                    checked={alertSettings.smsDueReminder}
                    onCheckedChange={(c) => setAlertSettings({ ...alertSettings, smsDueReminder: c })}
                  />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Payment Receipt SMS</p>
                    <p className="text-muted-foreground text-[11px]">Send instant SMS confirmation whenever rent is paid.</p>
                  </div>
                  <Switch
                    checked={alertSettings.smsReceiptOnPayment}
                    onCheckedChange={(c) => setAlertSettings({ ...alertSettings, smsReceiptOnPayment: c })}
                  />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Overdue Rent Warnings</p>
                    <p className="text-muted-foreground text-[11px]">Dispatch automated reminder when rent passes grace period.</p>
                  </div>
                  <Switch
                    checked={alertSettings.smsOverdueAlert}
                    onCheckedChange={(c) => setAlertSettings({ ...alertSettings, smsOverdueAlert: c })}
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Button onClick={() => toast({ title: "Alert Preferences Saved" })} className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs">
                  Save Alert Settings
                </Button>
              </div>
            </div>
          )}

          {/* ────────────────── 5. BILLING ────────────────── */}
          {activeTab === "billing" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Billing & Subscription
              </h2>
              <div className="border rounded-xl p-5 bg-linear-to-r from-blue-900/10 to-transparent flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <Badge className="bg-blue-600 text-white text-[10px] uppercase">Active Plan</Badge>
                  <h3 className="text-lg font-bold mt-2">Standard Portfolio Tier</h3>
                  <p className="text-xs text-muted-foreground">Up to 25 units • Automated SMS & M-Pesa Reconciliation Included</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-blue-600">KES 2,500 <span className="text-xs text-muted-foreground font-normal">/ month</span></p>
                  <Button size="sm" className="mt-2 bg-[#0b1065] text-white text-xs">Renew Subscription</Button>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────── 6. MPESA TRANSACTIONS STATUS ────────────────── */}
          {activeTab === "mpesa" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  MPESA Transactions Status
                </h2>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                  Daraja Connected
                </Badge>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border space-y-2 text-xs">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Live Callbacks:</p>
                <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded border">
                  <span className="font-mono text-[11px] text-muted-foreground">https://api.dwello.co.ke/api/mpesa/c2b-validation</span>
                  <span className="text-[10px] text-blue-600 font-medium">Validation URL</span>
                </div>
                <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded border">
                  <span className="font-mono text-[11px] text-muted-foreground">https://api.dwello.co.ke/api/mpesa/c2b-confirmation</span>
                  <span className="text-[10px] text-emerald-600 font-medium">Confirmation URL</span>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────── 7. DOCUMENTS (BETA) (───────────────── */}
          {activeTab === "documents" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header with Title, Subtitle, and Top Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-normal text-slate-800 dark:text-slate-100">
                    Documents (beta)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Leases, notices and letters for your tenants.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setIsNewDocModalOpen(true)}
                    className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-8 px-4 font-semibold shadow-xs cursor-pointer"
                  >
                    New document
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDocSubTab("templates");
                      toast({
                        title: "New Template",
                        description: "Template builder activated. Choose a standard draft to customize."
                      });
                    }}
                    className="bg-white dark:bg-slate-900 border border-[#0b1065] text-[#0b1065] dark:text-blue-400 hover:bg-[#0b1065]/5 text-xs h-8 px-4 font-semibold shadow-xs cursor-pointer"
                  >
                    New template
                  </Button>
                </div>
              </div>

              {/* Sub-tabs: Documents | Templates */}
              <div className="flex gap-6 border-b border-slate-200 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setDocSubTab("documents")}
                  className={`pb-2.5 font-semibold transition cursor-pointer relative ${
                    docSubTab === "documents"
                      ? "text-[#0b1065] dark:text-blue-400 border-b-2 border-[#0b1065] dark:border-blue-400"
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
                      ? "text-[#0b1065] dark:text-blue-400 border-b-2 border-[#0b1065] dark:border-blue-400"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Templates
                </button>
              </div>

              {docSubTab === "documents" && (
                <div className="space-y-6">
                  {/* 3 Summary Cards matching Screenshot 4 */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Card 1: PENDING */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
                      <div className="text-[11px] font-semibold text-slate-500 tracking-wider">
                        PENDING
                      </div>
                      <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 my-1">
                        {docList.filter(d => d.status === "pending").length}
                      </div>
                      <div className="text-xs text-slate-400">
                        Not yet signed or served
                      </div>
                    </div>

                    {/* Card 2: COMPLETED */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
                      <div className="text-[11px] font-semibold text-slate-500 tracking-wider">
                        COMPLETED
                      </div>
                      <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 my-1">
                        {docList.filter(d => d.status === "completed").length}
                      </div>
                      <div className="text-xs text-slate-400">
                        Signed or served, downloadable
                      </div>
                    </div>

                    {/* Card 3: VOIDED */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
                      <div className="text-[11px] font-semibold text-slate-500 tracking-wider">
                        VOIDED
                      </div>
                      <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 my-1">
                        {docList.filter(d => d.status === "voided").length}
                      </div>
                      <div className="text-xs text-slate-400">
                        Kept on record, no longer valid
                      </div>
                    </div>
                  </div>

                  {/* Empty State Card matching Screenshot 4 */}
                  {docList.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-16 px-6 text-center shadow-xs">
                      <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                        No documents yet
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 mb-5 max-w-sm mx-auto">
                        Create a lease, notice or letter and send it to a tenant.
                      </p>
                      <Button
                        onClick={() => setIsNewDocModalOpen(true)}
                        className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-8 px-5 font-semibold cursor-pointer shadow-xs"
                      >
                        New document
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="py-2.5 px-4">Document Title</th>
                            <th className="py-2.5 px-4">Type</th>
                            <th className="py-2.5 px-4">Recipient</th>
                            <th className="py-2.5 px-4">Status</th>
                            <th className="py-2.5 px-4">Date</th>
                            <th className="py-2.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {docList.map(doc => (
                            <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">{doc.title}</td>
                              <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{doc.type}</td>
                              <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{doc.tenant || "-"}</td>
                              <td className="py-2.5 px-4">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                                  doc.status === "completed"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : doc.status === "voided"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}>
                                  {doc.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-slate-400">{doc.date}</td>
                              <td className="py-2.5 px-4 text-right space-x-2">
                                <button
                                  onClick={() => toast({ title: "Downloading Document", description: `Prepared ${doc.title} for download.` })}
                                  className="text-blue-600 hover:underline font-medium"
                                >
                                  Download
                                </button>
                                <button
                                  onClick={() => {
                                    const next = docList.map(d => d.id === doc.id ? { ...d, status: "voided" } : d);
                                    setDocList(next);
                                    localStorage.setItem("dwello_tenant_documents", JSON.stringify(next));
                                    toast({ title: "Document Voided", description: `${doc.title} marked as voided.` });
                                  }}
                                  className="text-slate-400 hover:text-rose-500"
                                >
                                  Void
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Templates sub-tab */}
              {docSubTab === "templates" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
                      <div className="text-[11px] font-semibold text-slate-500 tracking-wider">ACTIVE</div>
                      <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 my-1">4</div>
                      <div className="text-xs text-slate-400">Ready to generate leases and notices</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
                      <div className="text-[11px] font-semibold text-slate-500 tracking-wider">DRAFT</div>
                      <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 my-1">0</div>
                      <div className="text-xs text-slate-400">Unpublished templates</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs">
                      <div className="text-[11px] font-semibold text-slate-500 tracking-wider">ARCHIVED</div>
                      <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 my-1">0</div>
                      <div className="text-xs text-slate-400">Previous versions</div>
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y text-xs bg-white dark:bg-slate-900">
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">Standard Residential Lease Agreement.docx</p>
                        <p className="text-[11px] text-muted-foreground">Auto-fills tenant details, unit, monthly rent, and deposit</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsNewDocModalOpen(true);
                          setNewDocData(d => ({ ...d, title: "Residential Lease Agreement", type: "Lease Agreement" }));
                        }}
                        className="h-7 text-xs"
                      >
                        Use Template
                      </Button>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">Commercial Space Tenancy Contract.docx</p>
                        <p className="text-[11px] text-muted-foreground">Tailored for retail and office units with VAT & service charge</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsNewDocModalOpen(true);
                          setNewDocData(d => ({ ...d, title: "Commercial Tenancy Contract", type: "Lease Agreement" }));
                        }}
                        className="h-7 text-xs"
                      >
                        Use Template
                      </Button>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">Formal Rent Arrears Demand Notice.pdf</p>
                        <p className="text-[11px] text-muted-foreground">Statutory 14-day notice with outstanding balance calculation</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsNewDocModalOpen(true);
                          setNewDocData(d => ({ ...d, title: "Rent Arrears Demand Notice", type: "Notice" }));
                        }}
                        className="h-7 text-xs"
                      >
                        Use Template
                      </Button>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">Move-in Condition Inspection Checklist.pdf</p>
                        <p className="text-[11px] text-muted-foreground">Unit handover and fixtures verification form</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsNewDocModalOpen(true);
                          setNewDocData(d => ({ ...d, title: "Move-in Inspection Checklist", type: "Inspection" }));
                        }}
                        className="h-7 text-xs"
                      >
                        Use Template
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Dialog for Creating New Document */}
              <Dialog open={isNewDocModalOpen} onOpenChange={setIsNewDocModalOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-base font-semibold text-[#0b1065] dark:text-blue-400">
                      Create New Tenant Document
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Generate and dispatch a formal document to a tenant.
                    </DialogDescription>
                  </DialogHeader>

                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      if (!newDocData.title.trim()) {
                        toast({ variant: "destructive", title: "Title Required", description: "Please enter a document title." });
                        return;
                      }
                      const created = {
                        id: `doc_${Date.now()}`,
                        title: newDocData.title,
                        type: newDocData.type,
                        tenant: newDocData.tenant || "General Tenant",
                        unit: newDocData.unit || "All Units",
                        status: "pending",
                        date: new Date().toISOString().split("T")[0]
                      };
                      const next = [created, ...docList];
                      setDocList(next);
                      localStorage.setItem("dwello_tenant_documents", JSON.stringify(next));
                      setIsNewDocModalOpen(false);
                      setNewDocData({ title: "", type: "Lease Agreement", tenant: "", unit: "" });
                      toast({
                        title: "Document Created",
                        description: `Prepared "${created.title}" ready to send.`
                      });
                    }}
                    className="space-y-4 pt-2 text-xs"
                  >
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Document Title</Label>
                      <Input
                        placeholder="e.g. Residential Lease Agreement - Unit 4B"
                        value={newDocData.title}
                        onChange={e => setNewDocData({ ...newDocData, title: e.target.value })}
                        className="text-xs h-8"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Document Type</Label>
                      <select
                        value={newDocData.type}
                        onChange={e => setNewDocData({ ...newDocData, type: e.target.value })}
                        className="w-full h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs"
                      >
                        <option value="Lease Agreement">Lease Agreement</option>
                        <option value="Notice">Notice</option>
                        <option value="Inspection">Inspection Report</option>
                        <option value="Letter">Formal Letter</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Recipient Tenant (Optional)</Label>
                      <Input
                        placeholder="e.g. John Doe"
                        value={newDocData.tenant}
                        onChange={e => setNewDocData({ ...newDocData, tenant: e.target.value })}
                        className="text-xs h-8"
                      />
                    </div>

                    <DialogFooter className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsNewDocModalOpen(false)}
                        className="text-xs h-8"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-8 font-semibold"
                      >
                        Create Document
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* ────────────────── 8. CUSTOM MESSAGE TEMPLATES ────────────────── */}
          {activeTab === "templates" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Custom Message Template
              </h2>
              <div className="flex gap-2 border-b pb-2">
                <Button
                  variant={templateType === "reminder" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTemplateType("reminder")}
                  className="text-xs"
                >
                  Rent Due Reminder
                </Button>
                <Button
                  variant={templateType === "receipt" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTemplateType("receipt")}
                  className="text-xs"
                >
                  Payment Received
                </Button>
                <Button
                  variant={templateType === "overdue" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTemplateType("overdue")}
                  className="text-xs"
                >
                  Overdue Notice
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Click merge tag to insert:</Label>
                <div className="flex flex-wrap gap-1.5">
                  {["{tenant_name}", "{unit_number}", "{amount_due}", "{amount_paid}", "{due_date}", "{paybill_no}", "{balance}"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTemplates({ ...templates, [templateType]: templates[templateType] + " " + tag })}
                      className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[11px] font-mono rounded hover:bg-blue-100 transition"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <textarea
                  rows={4}
                  value={templates[templateType]}
                  onChange={(e) => setTemplates({ ...templates, [templateType]: e.target.value })}
                  className="w-full rounded-md border border-input bg-background p-3 text-xs leading-relaxed"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => toast({ title: "Template Saved" })} className="bg-[#0b1065] text-white text-xs">
                  Save Template
                </Button>
              </div>
            </div>
          )}

          {/* ────────────────── 9. CUSTOM FIELDS ────────────────── */}
          {activeTab === "custom_fields" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Custom Fields
              </h2>
              <div className="flex gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border">
                <div className="w-40 space-y-1">
                  <Label className="text-xs">Applies To</Label>
                  <select
                    value={newFieldTarget}
                    onChange={(e) => setNewFieldTarget(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="Unit">Unit / House</option>
                    <option value="Tenant">Tenant Profile</option>
                    <option value="Property">Property</option>
                  </select>
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Field Label</Label>
                  <Input
                    placeholder="e.g. Garbage Card Serial #"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => {
                      if (!newFieldLabel.trim()) return;
                      setCustomFields([...customFields, { id: String(Date.now()), target: newFieldTarget, label: newFieldLabel, type: "Text" }]);
                      setNewFieldLabel("");
                      toast({ title: "Field Added" });
                    }}
                    className="bg-[#0b1065] text-white text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Field
                  </Button>
                </div>
              </div>
              <div className="border rounded-xl divide-y text-xs">
                {customFields.map((field) => (
                  <div key={field.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px]">{field.target}</Badge>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{field.label}</span>
                    </div>
                    <button onClick={() => setCustomFields(customFields.filter((f) => f.id !== field.id))} className="text-rose-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ────────────────── 10. AUDIT TRAIL ────────────────── */}
          {activeTab === "audit" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Audit Trail
                </h2>
                <Button variant="outline" size="sm" onClick={() => toast({ title: "Refreshed" })} className="text-xs">
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
                </Button>
              </div>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b">
                    <tr>
                      <th className="py-2.5 px-4 text-left font-semibold">Timestamp</th>
                      <th className="py-2.5 px-4 text-left font-semibold">User</th>
                      <th className="py-2.5 px-4 text-left font-semibold">Action</th>
                      <th className="py-2.5 px-4 text-left font-semibold">Details</th>
                      <th className="py-2.5 px-4 text-center font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[
                      { time: "17 Oct 2026, 11:42 AM", user: "Admin Manager", action: "Record Payment", details: "Recorded KES 25,000 for Unit G1 via M-Pesa", status: "Success" },
                      { time: "17 Oct 2026, 10:15 AM", user: "System Job", action: "Batch Reminders", details: "Dispatched 13 SMS reminders to arrears list", status: "Success" },
                      { time: "16 Oct 2026, 03:22 PM", user: "Sarah W. (Accountant)", action: "Generate Invoices", details: "Created monthly rent invoices for portfolio", status: "Success" }
                    ].map((log, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{log.time}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">{log.user}</td>
                        <td className="py-3 px-4 font-medium">{log.action}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{log.details}</td>
                        <td className="py-3 px-4 text-center"><Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]">{log.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ────────────────── 11. BACKUP ────────────────── */}
          {activeTab === "backup" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Backup & Data Export
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border rounded-xl p-5 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                  <h4 className="font-semibold text-sm">Download Full Backup</h4>
                  <p className="text-xs text-muted-foreground">Export encrypted JSON snapshot of properties, units, tenants, and ledger.</p>
                  <Button onClick={() => handleExportBackup("json")} variant="outline" className="text-xs">
                    <Download className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Download JSON Backup
                  </Button>
                </div>
                <div className="border rounded-xl p-5 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                  <h4 className="font-semibold text-sm">Export Rent Roll (CSV)</h4>
                  <p className="text-xs text-muted-foreground">Download spreadsheet of tenants, unit rents, deposits, and arrears.</p>
                  <Button onClick={() => handleExportBackup("csv")} variant="outline" className="text-xs">
                    <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Download CSV Rent Roll
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
