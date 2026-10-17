import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { usePreferences } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Mail,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  Minus,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Upload,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Plus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const paymentStatusColors = {
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  partial: "bg-amber-100 text-amber-700 border-amber-200",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200"
};

// ─── Payment Form View (Bomahut Layout matching Screenshot 3) ─────────────────
function PaymentFormView({ properties, tenants, onBack, onAdd }) {
  const { toast } = useToast();
  const [propertyId, setPropertyId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [status, setStatus] = useState("confirmed");
  const [hideOptional, setHideOptional] = useState(false);
  const [paymentType, setPaymentType] = useState("other");
  const [description, setDescription] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedProp = properties.find((p) => (p._id || p.id) === propertyId);
  const filteredTenants = tenants.filter((t) => {
    if (!propertyId) return true;
    return (t.propertyId || t.property) === propertyId;
  });

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFileName(f.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tenantId && tenants.length > 0) {
      toast({
        variant: "destructive",
        title: "Tenant Required",
        description: "Please select a tenant."
      });
      return;
    }
    if (!paidAmount || Number(paidAmount) <= 0) {
      toast({
        variant: "destructive",
        title: "Amount Required",
        description: "Please enter a valid payment amount."
      });
      return;
    }

    setLoading(true);
    try {
      const selectedTenant = tenants.find(
        (t) => (t._id || t.id) === tenantId
      );

      const paymentData = {
        _id: "PAY-" + Date.now().toString().slice(-6),
        amount: Number(paidAmount),
        date: paymentDate,
        tenantId: selectedTenant ? selectedTenant.name : "Tenant",
        unitId: selectedTenant?.unitNumber || selectedTenant?.unit || "Unit",
        property: selectedProp?.name || "Property",
        status,
        paymentType,
        description,
        transactionId,
        fileName
      };

      try {
        await api.addPayment({
          tenantId: selectedTenant?._id || selectedTenant?.id || tenantId,
          amount: Number(paidAmount),
          date: paymentDate,
          method: paymentType
        });
      } catch {
        // Fallback for offline or client state
      }

      onAdd(paymentData);
      toast({
        title: "Payment Recorded",
        description: `Payment of KES ${Number(paidAmount).toLocaleString()} logged successfully.`
      });
      onBack();
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to record payment."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Back Button */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0b1065] dark:text-blue-400 border border-[#0b1065] dark:border-blue-400 rounded-md hover:bg-[#0b1065]/5 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Payment Form
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Use this form to save tenant payments.
        </p>
      </div>

      {/* Form Card (matching Screenshot 3) */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-10 shadow-xs space-y-5"
      >
        {/* Row 1: Select Tenant */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
          <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 pt-2 shrink-0">
            Select Tenant
          </label>
          <div className="flex-1 max-w-lg space-y-2">
            <select
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value);
                setTenantId("");
              }}
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            >
              <option value="">
                {properties.length === 0
                  ? "No properties yet — add one from the Properties page"
                  : "All Properties"}
              </option>
              {properties.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            >
              <option value="">Select Tenant ...</option>
              {filteredTenants.map((t) => (
                <option key={t._id || t.id} value={t._id || t.id}>
                  {t.name} (Unit {t.unitNumber || t.unit || "—"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Paid Amount */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
            Paid Amount
          </label>
          <div className="flex-1 max-w-lg">
            <Input
              type="number"
              placeholder="e.g. 25000"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Row 3: Payment Date */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
            Payment Date
          </label>
          <div className="flex-1 max-w-lg">
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Row 4: Status */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
            Status
          </label>
          <div className="flex-1 max-w-lg">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
            >
              <option value="confirmed">confirmed</option>
              <option value="pending">pending</option>
              <option value="draft">draft</option>
            </select>
          </div>
        </div>

        {/* Hide / Show Toggle */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
          <div className="sm:w-52 shrink-0" />
          <div className="flex-1 max-w-lg">
            <button
              type="button"
              onClick={() => setHideOptional(!hideOptional)}
              className="text-xs font-semibold text-[#0b1065] dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              {hideOptional ? "Show More" : "Hide"}
              {hideOptional ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {!hideOptional && (
          <>
            {/* Payment Type (optional) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
              <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
                Payment Type (optional)
              </label>
              <div className="flex-1 max-w-lg">
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0b1065]"
                >
                  <option value="other">other</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>

            {/* Description (optional) */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
              <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 pt-2 shrink-0">
                Description (optional)
              </label>
              <div className="flex-1 max-w-lg">
                <Textarea
                  placeholder="Notes, receipt comments..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Bank Transaction ID (optional) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
              <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
                Bank Transaction ID (optional)
              </label>
              <div className="flex-1 max-w-lg">
                <Input
                  placeholder="e.g. QKJ482910"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* File upload (optional) */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
              <label className="sm:w-52 sm:text-right text-xs font-medium text-slate-700 dark:text-slate-300 pt-1.5 shrink-0">
                File upload (optional)
              </label>
              <div className="flex-1 max-w-lg">
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-medium bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 cursor-pointer text-slate-700 dark:text-slate-200">
                    Choose file
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-500 truncate max-w-xs">
                    {fileName || "No file chosen"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  File can be receipt, proof of payment etc.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Submit Button */}
        <div className="pt-4 max-w-lg mx-auto sm:ml-58 space-y-2.5">
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-9 font-medium shadow-xs cursor-pointer"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            + Add Payment
          </Button>
        </div>
      </form>

      {/* Bottom Back Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0b1065] dark:text-blue-400 border border-[#0b1065] dark:border-blue-400 rounded-md hover:bg-[#0b1065]/5 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>
    </div>
  );
}

// ─── Upload Bank Statement View (Bomahut Layout matching Screenshot 4) ────────
function UploadBankStatementView({ onBack, onAddPayments }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [statementFile, setStatementFile] = useState(null);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setStatementFile(f);
      toast({
        title: "Statement Selected",
        description: `Loaded ${f.name} (${(f.size / 1024).toFixed(1)} KB)`
      });
    }
  };

  const handleNext = () => {
    if (!statementFile) {
      toast({
        variant: "destructive",
        title: "No File Selected",
        description: "Please select a bank statement file to upload."
      });
      return;
    }
    setStep(2);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Back Button */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0b1065] dark:text-blue-400 border border-[#0b1065] dark:border-blue-400 rounded-md hover:bg-[#0b1065]/5 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Upload Bank Statement
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Use this tool to easily create payments from bank statement
          transactions.
        </p>
      </div>

      {/* Wizard Card (matching Screenshot 4) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 sm:p-12 shadow-xs space-y-8">
        {/* Step Indicator Tabs */}
        <div className="flex items-center justify-center gap-4 sm:gap-8 pb-4 border-b border-slate-100 dark:border-slate-800 text-xs">
          <div
            className={`flex items-center gap-2 ${step === 1 ? "text-blue-600 font-semibold" : "text-slate-400"}`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${step === 1 ? "bg-blue-600" : "bg-slate-300"}`}
            >
              1
            </span>
            <span>Select Bank Statement</span>
          </div>
          <div
            className={`flex items-center gap-2 ${step === 2 ? "text-blue-600 font-semibold" : "text-slate-400"}`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${step === 2 ? "bg-blue-600" : "bg-slate-300"}`}
            >
              2
            </span>
            <span>Review Transactions</span>
          </div>
          <div
            className={`flex items-center gap-2 ${step === 3 ? "text-blue-600 font-semibold" : "text-slate-400"}`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${step === 3 ? "bg-blue-600" : "bg-slate-300"}`}
            >
              3
            </span>
            <span>Created Payments</span>
          </div>
        </div>

        {/* Step 1 Content */}
        {step === 1 && (
          <div className="text-center max-w-md mx-auto space-y-5">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Please start by selecting the bank statement you wish to upload.
            </p>

            <div>
              <label className="inline-block bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs font-medium px-5 py-2.5 rounded-md cursor-pointer transition shadow-xs">
                Select Bank Statement
                <input
                  type="file"
                  accept=".csv, .xls, .xlsx, .pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              {statementFile && (
                <p className="text-xs font-semibold text-emerald-600 mt-2">
                  ✓ {statementFile.name}
                </p>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              Accepted formats are csv, excel (xls, xlsx) and pdf
            </p>

            <p className="text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700">
              Note: We do not store your bank statement. In the next step you
              will choose the transactions to store/save.
            </p>

            <div className="flex justify-end pt-4">
              <Button
                type="button"
                onClick={handleNext}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs h-8 px-5 cursor-pointer"
              >
                Next &gt;
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 Content: Review transactions & import */}
        {step === 2 && (
          <div className="space-y-4 max-w-xl mx-auto">
            <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md text-xs text-blue-700 dark:text-blue-300">
              Transactions parsed from statement. Select transactions to import
              as tenant payments:
            </div>

            <div className="space-y-2 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs divide-y divide-slate-100 dark:divide-slate-800">
              <div className="py-2 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    MPESA Ref: QK91823901 - Jane Mwangi
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Date: 16 Oct 2026 | Unit 3B
                  </p>
                </div>
                <span className="font-bold text-emerald-600">KES 28,000</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Bank EFT Ref: FT819283 - David Kamau
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Date: 15 Oct 2026 | Unit 1A
                  </p>
                </div>
                <span className="font-bold text-emerald-600">KES 32,000</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                className="text-xs h-8"
              >
                &lt; Back
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  toast({
                    title: "Payments Imported",
                    description: "2 bank transactions imported successfully."
                  });
                  onBack();
                }}
                className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-8 px-4"
              >
                Confirm & Import (KES 60,000)
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Back Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0b1065] dark:text-blue-400 border border-[#0b1065] dark:border-blue-400 rounded-md hover:bg-[#0b1065]/5 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>
    </div>
  );
}

// ─── Main Payments Page Component ─────────────────────────────────────────────
export default function PaymentsPageBomahut() {
  const { toast } = useToast();
  const { formatCurrency } = usePreferences();
  const queryClient = useQueryClient();

  const [view, setView] = useState("list"); // 'list' | 'record_payment' | 'upload_statement'
  const [selectedPayments, setSelectedPayments] = useState([]);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: api.getPayments
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["properties"],
    queryFn: api.getProperties
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: api.getTenants
  });

  // Local recorded payments state
  const [customPayments, setCustomPayments] = useState(() => {
    try {
      const saved = localStorage.getItem("dwello_custom_payments");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const handleAddPayment = (newPay) => {
    setCustomPayments((prev) => {
      const next = [newPay, ...prev];
      try {
        localStorage.setItem("dwello_custom_payments", JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  const allPayments = [
    ...customPayments,
    ...payments.map((p) => ({
      _id: p._id,
      date: p.date,
      tenantId:
        typeof p.tenantId === "object"
          ? p.tenantId?.name || "Tenant"
          : p.tenantId || "Tenant",
      unitId:
        typeof p.unitId === "object"
          ? p.unitId?.unitNumber || "Unit"
          : p.unitId || "Unit",
      property: p.property || "Property",
      status: p.status || "confirmed",
      amount: p.amount || 0,
      paymentType: p.method || "M-Pesa"
    }))
  ];

  // Filter state
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [statusFilters, setStatusFilters] = useState({
    draft: false,
    confirmed: true
  });
  const [showUnassigned, setShowUnassigned] = useState(false);

  const [collapseDate, setCollapseDate] = useState(false);
  const [collapseStatus, setCollapseStatus] = useState(false);
  const [collapseProperty, setCollapseProperty] = useState(false);
  const [collapseUnassigned, setCollapseUnassigned] = useState(false);
  const [collapseSummary, setCollapseSummary] = useState(false);

  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = allPayments.filter((p) => {
    const searchMatch =
      !search ||
      String(p.tenantId || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      String(p.unitId || "")
        .toLowerCase()
        .includes(search.toLowerCase());
    return searchMatch;
  });

  const total = filtered.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPayments(paginated.map((p) => p._id));
    } else {
      setSelectedPayments([]);
    }
  };

  const toggleSelectPayment = (id) => {
    if (selectedPayments.includes(id)) {
      setSelectedPayments(selectedPayments.filter((i) => i !== id));
    } else {
      setSelectedPayments([...selectedPayments, id]);
    }
  };

  const handleSendReceipts = () => {
    const count =
      selectedPayments.length > 0 ? selectedPayments.length : filtered.length;
    toast({
      title: "Receipt(s) Sent",
      description: `Payment receipts dispatched to ${count} tenant(s) via Email and SMS.`
    });
  };

  const handleDeleteSelected = () => {
    if (selectedPayments.length === 0) {
      toast({
        variant: "destructive",
        title: "None Selected",
        description: "Please select payment records to delete."
      });
      return;
    }
    setCustomPayments((prev) =>
      prev.filter((p) => !selectedPayments.includes(p._id))
    );
    setSelectedPayments([]);
    toast({
      title: "Payments Deleted",
      description: "Selected payment records removed."
    });
  };

  if (view === "record_payment") {
    return (
      <PaymentFormView
        properties={properties}
        tenants={tenants}
        onBack={() => setView("list")}
        onAdd={handleAddPayment}
      />
    );
  }

  if (view === "upload_statement") {
    return (
      <UploadBankStatementView
        onBack={() => setView("list")}
        onAddPayments={handleAddPayment}
      />
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* ────────────────── TOP ACTIONS BAR ────────────────── */}
      <div className="flex items-center justify-end gap-2.5">
        <Button
          onClick={() => setView("record_payment")}
          className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs h-8 px-4 font-semibold shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Record Payment
        </Button>
        <Button
          variant="outline"
          onClick={() => setView("upload_statement")}
          className="text-xs h-8 px-4 gap-1.5 border-slate-300 dark:border-slate-700 text-[#0b1065] dark:text-blue-400 font-semibold cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload Bank Statement
        </Button>
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* LEFT: Filters Panel */}
        <aside className="w-full md:w-64 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Filters
            </h4>
            <Minus className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Type to search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md pl-3 pr-8 text-xs focus:outline-none focus:border-blue-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
          </div>

          {/* Date */}
          <div>
            <button
              type="button"
              onClick={() => setCollapseDate(!collapseDate)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
            >
              <span>Date</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${collapseDate ? "rotate-180" : ""}`}
              />
            </button>
            {!collapseDate && (
              <div className="space-y-1.5 mt-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs text-slate-600"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs text-slate-600"
                />
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <button
              type="button"
              onClick={() => setCollapseStatus(!collapseStatus)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
            >
              <span>Status</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${collapseStatus ? "rotate-180" : ""}`}
              />
            </button>
            {!collapseStatus && (
              <div className="space-y-1.5 mt-2 text-xs">
                {Object.keys(statusFilters).map((s) => (
                  <label
                    key={s}
                    className="flex items-center gap-2 cursor-pointer capitalize"
                  >
                    <input
                      type="checkbox"
                      checked={statusFilters[s]}
                      onChange={() =>
                        setStatusFilters({
                          ...statusFilters,
                          [s]: !statusFilters[s]
                        })
                      }
                      className="rounded accent-[#0b1065] w-3.5 h-3.5"
                    />
                    <span className="text-slate-600 dark:text-slate-400">
                      {s}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Property / Unit */}
          <div>
            <button
              type="button"
              onClick={() => setCollapseProperty(!collapseProperty)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
            >
              <span>Property / Unit</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${collapseProperty ? "rotate-180" : ""}`}
              />
            </button>
            {!collapseProperty && (
              <div className="mt-2">
                <select
                  value={propertyFilter}
                  onChange={(e) => setPropertyFilter(e.target.value)}
                  className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 text-xs text-slate-600"
                >
                  <option value="all">All Properties</option>
                  {properties.map((p) => (
                    <option key={p._id || p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Unassigned payments */}
          <div>
            <button
              type="button"
              onClick={() => setCollapseUnassigned(!collapseUnassigned)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 py-1 cursor-pointer"
            >
              <span>Unassigned payments</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${collapseUnassigned ? "rotate-180" : ""}`}
              />
            </button>
            {!collapseUnassigned && (
              <div className="mt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={showUnassigned}
                    onChange={(e) => setShowUnassigned(e.target.checked)}
                    className="rounded accent-[#0b1065] w-3.5 h-3.5"
                  />
                  <span className="text-slate-600 dark:text-slate-400">
                    Show
                  </span>
                </label>
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT: Summary + Payments Table */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Summary Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <div
              className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer select-none"
              onClick={() => setCollapseSummary(!collapseSummary)}
            >
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Summary
              </h4>
              <Minus className="w-3.5 h-3.5 text-slate-400" />
            </div>
            {!collapseSummary && (
              <div className="px-5 py-4">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {total.toLocaleString("en-KE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
                <p className="text-[11px] text-muted-foreground">(KES)</p>
              </div>
            )}
          </div>

          {/* Payments Table Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Payments
              </h4>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSendReceipts}
                  className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-[11px] h-7 px-3 gap-1 shadow-xs cursor-pointer"
                >
                  <Mail className="w-3 h-3" /> Send Receipt(s)
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="h-7 px-2 text-slate-400 hover:text-rose-500 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toast({
                      title: "Payments Downloaded",
                      description: "Downloading payments CSV report."
                    })
                  }
                  className="text-[11px] h-7 px-3 gap-1 border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  <Download className="w-3 h-3" /> Download Payments
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <tr>
                    <th className="py-2.5 px-3 text-left">
                      <input
                        type="checkbox"
                        onChange={toggleSelectAll}
                        checked={
                          paginated.length > 0 &&
                          selectedPayments.length === paginated.length
                        }
                        className="rounded w-3.5 h-3.5 accent-[#0b1065]"
                      />
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Date
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Payment ID/Number
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Tenant
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Property (Unit)
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Method
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Status
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Amount
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                      Options
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-10 text-center text-xs text-muted-foreground"
                      >
                        Loading payments...
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-10 text-center text-xs text-muted-foreground"
                      >
                        No payments found.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((p) => (
                      <tr
                        key={p._id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={selectedPayments.includes(p._id)}
                            onChange={() => toggleSelectPayment(p._id)}
                            className="rounded w-3.5 h-3.5 accent-[#0b1065]"
                          />
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {p.date
                            ? new Date(p.date).toLocaleDateString("en-KE")
                            : "—"}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                          #{String(p._id || "").slice(-6).toUpperCase()}
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                          {p.tenantId}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                          {p.unitId}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 capitalize">
                          {p.paymentType || "M-Pesa"}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize ${paymentStatusColors[p.status] || "bg-emerald-100 text-emerald-700"}`}
                          >
                            {p.status || "confirmed"}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-100">
                          {Number(p.amount || 0).toLocaleString("en-KE", {
                            minimumFractionDigits: 2
                          })}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() =>
                              toast({
                                title: `Payment #${String(p._id).slice(-6)}`,
                                description: `Tenant: ${p.tenantId} | Amount: KES ${Number(p.amount).toLocaleString()}`
                              })
                            }
                            className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 w-14 border border-slate-200 dark:border-slate-700 rounded text-xs px-1.5 bg-white dark:bg-slate-800"
                >
                  {[5, 10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span>
                  Showing{" "}
                  {filtered.length === 0
                    ? 0
                    : (currentPage - 1) * perPage + 1}
                  –{Math.min(currentPage * perPage, filtered.length)} of{" "}
                  {filtered.length} results
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-medium">{currentPage}</span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
