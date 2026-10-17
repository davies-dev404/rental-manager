import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Send, Upload, DollarSign, Smartphone, Users, Building, ShieldCheck, FileSpreadsheet, Wrench } from "lucide-react";

export function ActionModals({ modalType, onClose, initialData = {} }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { data: properties = [] } = useQuery({
    queryKey: ["properties"],
    queryFn: api.getProperties
  });

  // Form states
  const [formData, setFormData] = useState({
    tenant: initialData.name || "",
    unit: initialData.unit || "",
    amount: initialData.amount || "",
    date: new Date().toISOString().split("T")[0],
    method: "M-Pesa",
    reference: "QA" + Math.floor(10000000 + Math.random() * 90000000),
    utilityType: "Water",
    prevReading: "",
    currReading: "",
    rate: "",
    phone: initialData.phone || "",
    message: initialData.name 
      ? `Dear ${initialData.name}, your rent arrears for Unit ${initialData.unit} is KES ${Number(initialData.amount || 0).toLocaleString()}. Please pay via M-Pesa.`
      : "Dear Tenant, please settle your pending rent balance for this month. Thank you.",
    smsPackage: "1000",
    teamEmail: "",
    teamRole: "Caretaker",
    propertyName: "",
    unitsCount: "0"
  });

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = (actionTitle, successDesc, customEvent = null, customData = null) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({
        title: actionTitle,
        description: successDesc
      });
      if (customEvent) {
        window.dispatchEvent(new CustomEvent(customEvent, { detail: customData }));
      }
      onClose();
    }, 500);
  };

  if (!modalType) return null;

  return (
    <Dialog open={!!modalType} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-125 max-h-[90vh] overflow-y-auto">
        {/* Record Payment */}
        {modalType === "record_payment" && (
          <div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Record Payment
              </DialogTitle>
              <DialogDescription>
                Record rent or utility payment received from a tenant.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Unit / House Number</Label>
                  <Input
                    placeholder="e.g. G1, 1B"
                    value={formData.unit}
                    onChange={(e) => handleChange("unit", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tenant Name</Label>
                  <Input
                    placeholder="Tenant full name"
                    value={formData.tenant}
                    onChange={(e) => handleChange("tenant", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Amount (KES)</Label>
                  <Input
                    type="number"
                    placeholder="Amount in KES"
                    value={formData.amount}
                    onChange={(e) => handleChange("amount", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleChange("date", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Payment Mode</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
                    value={formData.method}
                    onChange={(e) => handleChange("method", e.target.value)}
                  >
                    <option value="M-Pesa">M-Pesa</option>
                    <option value="Bank Transfer">Bank Transfer / EFT</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Transaction Reference</Label>
                  <Input
                    placeholder="e.g. QA84729182"
                    value={formData.reference}
                    onChange={(e) => handleChange("reference", e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
                onClick={() =>
                  handleSubmit(
                    "Payment Recorded",
                    `Successfully recorded KES ${formData.amount || "0.00"} for Unit ${formData.unit || "N/A"}.`
                  )
                }
              >
                {loading ? "Recording..." : "Save Payment"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Send Reminders (Bulk or Single) */}
        {(modalType === "send_reminders" || modalType === "remind_tenant") && (
          <div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                {modalType === "remind_tenant" ? `Remind Tenant: ${formData.tenant || "Tenant"}` : "Send Arrears Reminders"}
              </DialogTitle>
              <DialogDescription>
                {modalType === "remind_tenant"
                  ? `Dispatch automated rent reminder to Unit ${formData.unit}.`
                  : "Send automated SMS reminders to all 13 tenants with outstanding arrears."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1.5">
                <Label>Destination Phone / Channel</Label>
                <Input
                  value={modalType === "remind_tenant" ? formData.phone : "All 13 Debtors (SMS Gateway)"}
                  disabled={modalType !== "remind_tenant"}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>SMS Message Content</Label>
                <textarea
                  rows={4}
                  className="w-full rounded-md border border-input bg-background p-3 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.message}
                  onChange={(e) => handleChange("message", e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Estimated SMS count: {modalType === "remind_tenant" ? "1 SMS" : "13 SMS credits"}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
                onClick={() =>
                  handleSubmit(
                    "Reminders Sent",
                    modalType === "remind_tenant"
                      ? `Reminder dispatched to ${formData.tenant} (${formData.phone}).`
                      : "Successfully queued 13 SMS reminders to all overdue tenants."
                  )
                }
              >
                {loading ? "Sending..." : "Send Reminders"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Add Utilities */}
        {modalType === "add_utilities" && (
          <div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Add Utilities Bill</DialogTitle>
              <DialogDescription>Record meter readings or fixed utility charges.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Utility Type</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
                    value={formData.utilityType}
                    onChange={(e) => handleChange("utilityType", e.target.value)}
                  >
                    <option value="Water">Water (Metered)</option>
                    <option value="Electricity">Electricity / Token</option>
                    <option value="Garbage">Garbage Collection</option>
                    <option value="Service Charge">Service Charge</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Unit</Label>
                  <Input
                    placeholder="e.g. G1"
                    value={formData.unit}
                    onChange={(e) => handleChange("unit", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Prev Reading</Label>
                  <Input
                    value={formData.prevReading}
                    onChange={(e) => handleChange("prevReading", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Current Reading</Label>
                  <Input
                    value={formData.currReading}
                    onChange={(e) => handleChange("currReading", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Rate / Unit</Label>
                  <Input
                    value={formData.rate}
                    onChange={(e) => handleChange("rate", e.target.value)}
                  />
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg flex justify-between items-center text-sm font-medium">
                <span>Calculated Amount:</span>
                <span className="text-blue-600 font-bold">
                  KES {((Number(formData.currReading || 0) - Number(formData.prevReading || 0)) * Number(formData.rate || 0)).toLocaleString()}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
                onClick={() => {
                  const utilityRecord = {
                    date: new Date().toISOString().split("T")[0],
                    property: formData.propertyName || (properties[0]?.name || "General Property"),
                    unit: formData.unit || "All",
                    item: formData.utilityType || "Water",
                    previousReading: formData.prevReading || "0",
                    currentReading: formData.currReading || "0",
                    invoiceNumber: "INV-UTL-" + Math.floor(1000 + Math.random() * 9000)
                  };
                  handleSubmit(
                    "Utility Added",
                    `Recorded ${formData.utilityType} bill for Unit ${formData.unit || "All"}.`,
                    "dwello_utility_added",
                    utilityRecord
                  );
                }}
              >
                Save Utility
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Add Invoice */}
        {modalType === "add_invoice" && (
          <div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Create New Invoice</DialogTitle>
              <DialogDescription>Generate a custom bill or penalty for a tenant.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Unit</Label>
                  <Input
                    placeholder="e.g. 1B"
                    value={formData.unit}
                    onChange={(e) => handleChange("unit", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Invoice Type</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs">
                    <option>Rent Invoice</option>
                    <option>Water Bill</option>
                    <option>Electricity Bill</option>
                    <option>Late Fee / Penalty</option>
                    <option>Damage Repair</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Amount (KES)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 25000"
                    value={formData.amount}
                    onChange={(e) => handleChange("amount", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Due Date</Label>
                  <Input type="date" value={formData.date} onChange={(e) => handleChange("date", e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleSubmit("Invoice Created", `Invoice of KES ${formData.amount || "0"} generated.`)}
              >
                Create Invoice
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Bulk Add Invoices */}
        {modalType === "bulk_add_invoices" && (
          <div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Bulk Generate Invoices</DialogTitle>
              <DialogDescription>
                Automatically generate invoices for all 13 occupied units for this billing period.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3 text-sm">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg text-blue-900 dark:text-blue-200">
                <p className="font-semibold">Ready to bill 13 Units:</p>
                <p className="text-xs mt-1">Total expected gross rent: <strong>KES 78,850.00</strong></p>
                <p className="text-xs">Invoice Due Date: <strong>05th of the month</strong></p>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="sendSmsNotification" defaultChecked className="rounded border-input text-blue-600" />
                <Label htmlFor="sendSmsNotification">Send SMS invoice notification to tenants upon creation</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleSubmit("Bulk Invoices Generated", "Generated 13 rent invoices successfully.")}
              >
                Generate 13 Invoices
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Upload Bank Statement */}
        {modalType === "upload_bank_statement" && (
          <div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Upload Bank or M-Pesa Statement
              </DialogTitle>
              <DialogDescription>
                Upload Excel or CSV statement to auto-reconcile tenant rent payments.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center flex flex-col items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
                <Upload className="w-10 h-10 text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Click to browse or drag and drop statement file
                </p>
                <p className="text-xs text-muted-foreground mt-1">Supported formats: .XLSX, .CSV, .PDF</p>
              </div>
              <p className="text-xs text-slate-500">
                MakaaziHub matches transactions using tenant M-Pesa codes, account numbers, and phone numbers automatically.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleSubmit("Statement Processed", "Imported statement. 18 transactions matched.")}
              >
                Process & Reconcile
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Add Tenant */}
        {modalType === "add_tenant" && (
          <div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Add Tenant</DialogTitle>
              <DialogDescription>Onboard a new tenant and assign them to a unit.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input placeholder="e.g. John Doe" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone Number</Label>
                  <Input placeholder="+254 7XX XXX XXX" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>National ID / Passport</Label>
                  <Input placeholder="e.g. 32415678" />
                </div>
                <div className="space-y-1.5">
                  <Label>Assign Unit</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs">
                    <option>Unit 2B (Vacant - KES 18,000)</option>
                    <option>Unit 3C (Vacant - KES 22,000)</option>
                    <option>Unit 4A (Vacant - KES 20,000)</option>
                    <option>Unit 5B (Vacant - KES 15,000)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Monthly Rent (KES)</Label>
                  <Input type="number" defaultValue="20000" />
                </div>
                <div className="space-y-1.5">
                  <Label>Deposit (KES)</Label>
                  <Input type="number" defaultValue="20000" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleSubmit("Tenant Added", "New tenant successfully onboarded and assigned to unit.")}
              >
                Save Tenant
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Add Unit */}
        {modalType === "add_unit" && (
          <div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Add Property Unit</DialogTitle>
              <DialogDescription>Add a new rental unit or apartment.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Unit Label / Door No.</Label>
                  <Input placeholder="e.g. 2C, B4" />
                </div>
                <div className="space-y-1.5">
                  <Label>Bedrooms / Type</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs">
                    <option>1 Bedroom</option>
                    <option>2 Bedrooms</option>
                    <option>3 Bedrooms</option>
                    <option>Studio / Bedsitter</option>
                    <option>Commercial Space</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Monthly Rent (KES)</Label>
                  <Input type="number" placeholder="25000" />
                </div>
                <div className="space-y-1.5">
                  <Label>Deposit (KES)</Label>
                  <Input type="number" placeholder="25000" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleSubmit("Unit Created", "New unit added to your property inventory.")}
              >
                Create Unit
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Add Property */}
        {modalType === "add_property" && (
          <div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Add Property</DialogTitle>
              <DialogDescription>Register a new residential or commercial building.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1.5">
                <Label>Property Name</Label>
                <Input placeholder="e.g. Sunset Heights Apartments" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Location / Address</Label>
                  <Input placeholder="e.g. Kilimani, Nairobi" />
                </div>
                <div className="space-y-1.5">
                  <Label>Total Units Count</Label>
                  <Input type="number" defaultValue="20" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleSubmit("Property Created", "New property building established.")}
              >
                Save Property
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Shift Tenant */}
        {modalType === "shift_tenant" && (
          <div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Shift Tenant</DialogTitle>
              <DialogDescription>Transfer a tenant from their current unit to a vacant unit.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1.5">
                <Label>Select Tenant</Label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs">
                  <option>Catherine Wabweire (Unit G1)</option>
                  <option>Elizabeth Mwangi (Unit G4)</option>
                  <option>Robert Kimani (Unit 1B)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Transfer To Vacant Unit</Label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs">
                  <option>Unit 2B (Vacant)</option>
                  <option>Unit 3C (Vacant)</option>
                  <option>Unit 4A (Vacant)</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleSubmit("Tenant Shifted", "Tenant moved to new unit. Deposit and balance transferred.")}
              >
                Complete Shift
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Send Broadcast Message */}
        {modalType === "send_message" && (
          <div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Send Announcement / SMS</DialogTitle>
              <DialogDescription>Broadcast a notice or SMS alert to all tenants.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1.5">
                <Label>Audience</Label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs">
                  <option>All Active Tenants (13 tenants)</option>
                  <option>Tenants with Arrears Only (13 tenants)</option>
                  <option>Specific Building</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Message</Label>
                <textarea
                  rows={4}
                  className="w-full rounded-md border border-input bg-background p-3 text-sm shadow-xs focus:ring-1 focus:ring-blue-500"
                  defaultValue="Notice: Water maintenance will be scheduled for tomorrow between 10am and 2pm. Management."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleSubmit("Message Broadcast", "SMS notice sent to 13 tenants successfully.")}
              >
                Send Message
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Add To Team */}
        {modalType === "add_to_team" && (
          <div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Add To Team</DialogTitle>
              <DialogDescription>Grant property manager, accountant, or caretaker access.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1.5">
                <Label>Email Address</Label>
                <Input placeholder="colleague@domain.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Role Permissions</Label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs">
                  <option>Property Manager (Full Access)</option>
                  <option>Caretaker (Read Units & Log Readings)</option>
                  <option>Accountant (Financials & Reports)</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleSubmit("Invitation Sent", "Team member invitation email sent.")}
              >
                Send Invitation
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Pay Subscription */}
        {modalType === "pay_subscription" && (
          <div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Renew MakaaziHub Subscription
              </DialogTitle>
              <DialogDescription>
                Your current subscription expires on 24/10/2026.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div className="border rounded-xl p-4 bg-blue-50/50 dark:bg-blue-950/20">
                <p className="font-semibold text-sm">Standard Tier - Up to 25 Units</p>
                <p className="text-xs text-muted-foreground mt-1">Includes SMS notifications, M-Pesa automated reconciliation & reports.</p>
                <p className="text-lg font-bold text-blue-600 mt-2">KES 2,500 / month</p>
              </div>
              <div className="space-y-1.5">
                <Label>M-Pesa Phone Number for STK Push</Label>
                <Input placeholder="07XXXXXXXX" defaultValue="0712345678" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleSubmit("STK Push Sent", "Please check your phone and enter your M-Pesa PIN.")}
              >
                Pay with M-Pesa
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Buy SMS */}
        {modalType === "buy_sms" && (
          <div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                Top Up SMS Balance
              </DialogTitle>
              <DialogDescription>Purchase branded SMS credits for payment reminders and receipts.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="border p-3 rounded-lg hover:border-blue-500 cursor-pointer bg-blue-50/30">
                  <p className="font-bold">500 SMS</p>
                  <p className="text-xs text-muted-foreground">KES 1,000</p>
                </div>
                <div className="border-2 border-blue-600 p-3 rounded-lg cursor-pointer bg-blue-50">
                  <p className="font-bold text-blue-600">1,000 SMS</p>
                  <p className="text-xs text-blue-800">KES 1,800</p>
                </div>
                <div className="border p-3 rounded-lg hover:border-blue-500 cursor-pointer bg-blue-50/30">
                  <p className="font-bold">5,000 SMS</p>
                  <p className="text-xs text-muted-foreground">KES 7,500</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>M-Pesa Phone Number</Label>
                <Input defaultValue="0712345678" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleSubmit("SMS Bundle Purchased", "1,000 SMS credits credited to your account.")}
              >
                Top Up via M-Pesa
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Maintenance Request Modal */}
        {modalType === "maintenance" && (
          <div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-500" />
                Log Maintenance Request
              </DialogTitle>
              <DialogDescription>
                Track repair issues, contractor assignments, and costs.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Unit / Location</Label>
                  <Input placeholder="e.g. Unit 2B or Compound" />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs">
                    <option>Plumbing / Leakage</option>
                    <option>Electrical / Lighting</option>
                    <option>Carpentry / Locks</option>
                    <option>Painting / Masonry</option>
                    <option>Roofing / Drainage</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs">
                    <option>Medium</option>
                    <option>High</option>
                    <option>Urgent / Emergency</option>
                    <option>Low</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Estimated Cost (KES)</Label>
                  <Input type="number" placeholder="e.g. 4500" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Issue Description</Label>
                <textarea
                  rows={3}
                  placeholder="Describe repair details..."
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm shadow-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleSubmit("Maintenance Logged", "Maintenance ticket created and assigned.")}
              >
                Log Ticket
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Property Grouping Modal */}
        {modalType === "property_grouping" && (
          <div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                Property Grouping & Portfolios
              </DialogTitle>
              <DialogDescription>
                Group multiple properties by zone, estate, or landlord.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1.5">
                <Label>Group / Portfolio Name</Label>
                <Input placeholder="e.g. Nairobi West Portfolio or Kilimani Cluster" />
              </div>
              <div className="space-y-1.5">
                <Label>Assigned Properties</Label>
                <div className="border rounded-md p-3 space-y-2 text-xs max-h-36 overflow-y-auto">
                  {properties.length === 0 ? (
                    <p className="text-slate-400 italic">No properties found. Add properties first.</p>
                  ) : (
                    properties.map((p) => (
                      <label key={p._id || p.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded border-input text-blue-600" />
                        <span>{p.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleSubmit("Group Created", "Property portfolio cluster established.")}
              >
                Save Grouping
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Add Maintenance Request */}
        {modalType === "maintenance" && (
          <div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Add Maintenance Request</DialogTitle>
              <DialogDescription>Submit a new repair or maintenance ticket for a property or unit.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1.5">
                <Label>Short Summary</Label>
                <Input
                  placeholder="e.g. Broken water pipe in bathroom"
                  value={formData.summary || ""}
                  onChange={(e) => handleChange("summary", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Property Name</Label>
                  <Input
                    placeholder="e.g. Makaazi Heights"
                    value={formData.propertyName || ""}
                    onChange={(e) => handleChange("propertyName", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Unit ID / Name</Label>
                  <Input
                    placeholder="e.g. A3"
                    value={formData.unit || ""}
                    onChange={(e) => handleChange("unit", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
                    value={formData.category || "Plumbing"}
                    onChange={(e) => handleChange("category", e.target.value)}
                  >
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Carpentry">Carpentry</option>
                    <option value="Painting">Painting</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
                    value={formData.status || "open"}
                    onChange={(e) => handleChange("status", e.target.value)}
                  >
                    <option value="open">Open</option>
                    <option value="in progress">In Progress</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Estimated Expense</Label>
                  <Input
                    placeholder="e.g. 2,500"
                    value={formData.expense || ""}
                    onChange={(e) => handleChange("expense", e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="bg-[#0b1065] hover:bg-[#161c8a] text-white"
                disabled={loading}
                onClick={() => {
                  const reqRecord = {
                    summary: formData.summary || "General repair request",
                    propertyName: formData.propertyName || (properties[0]?.name || "General Property"),
                    unit: formData.unit || "N/A",
                    status: formData.status || "open",
                    category: formData.category || "Plumbing",
                    expense: formData.expense ? `${formData.expense} KES` : "0.00 KES",
                    date: new Date().toISOString().split("T")[0]
                  };
                  handleSubmit(
                    "Maintenance Request Added",
                    `Ticket created for ${reqRecord.propertyName} - Unit ${reqRecord.unit}.`,
                    "dwello_maintenance_added",
                    reqRecord
                  );
                }}
              >
                Save Maintenance
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* View Details / Insights */}
        {modalType === "view_insights" && (
          <div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{initialData.title || "Portfolio Insights"}</DialogTitle>
              <DialogDescription>{initialData.desc || "In-depth overview and performance metrics."}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3 text-sm">
              {initialData.type === "arrears" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Top overdue accounts:</p>
                  <div className="border rounded-lg divide-y text-xs">
                    <div className="p-2.5 flex justify-between">
                      <span>Catherine Wabweire (Unit G1)</span>
                      <span className="font-semibold text-rose-600">60,915.00 KES</span>
                    </div>
                    <div className="p-2.5 flex justify-between">
                      <span>Elizabeth Mwangi (Unit G4)</span>
                      <span className="font-semibold text-rose-600">58,700.00 KES</span>
                    </div>
                    <div className="p-2.5 flex justify-between">
                      <span>Robert Kimani (Unit 1B)</span>
                      <span className="font-semibold text-rose-600">57,900.00 KES</span>
                    </div>
                  </div>
                </div>
              )}

              {initialData.type === "occupancy" && (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                    <span>Occupied Units:</span>
                    <span className="font-bold">13 Units (76%)</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                    <span>Vacant Units:</span>
                    <span className="font-bold">4 Units (24%)</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                    <span>Average Rent / Unit:</span>
                    <span className="font-bold">KES 20,500</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
