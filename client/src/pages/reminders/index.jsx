import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Bell, Clock, Mail, MessageSquare, CheckCircle2, AlertCircle, Plus, 
  MoreHorizontal, Loader2, Send, Users, DollarSign, Trash2 
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { usePreferences } from "@/lib/currency";

function ReminderCard({ reminder, onSendNow, onDelete, isSending }) {
    const { t } = useTranslation();
    const { formatCurrency } = usePreferences();
    const statusColors = {
        pending: "bg-amber-500/15 text-amber-700 border-amber-500/20",
        sent: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
        overdue: "bg-rose-500/15 text-rose-700 border-rose-500/20"
    };
    const methodIcons = {
        email: <Mail className="w-4 h-4"/>,
        sms: <MessageSquare className="w-4 h-4"/>,
        push: <Bell className="w-4 h-4"/>
    };

    const dueDateFormatted = reminder.dueDate ? new Date(reminder.dueDate).toLocaleDateString() : 'N/A';

    return (
      <Card className="border-border/50 hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-gray-900 dark:text-white text-base">{reminder.title}</h4>
                <Badge variant="outline" className={statusColors[reminder.status] || statusColors.pending}>
                  {reminder.status ? t(reminder.status) : t('pending')}
                </Badge>
                {reminder.amountDue > 0 && (
                  <Badge className="bg-rose-500/10 text-rose-600 border border-rose-500/20 font-mono">
                    Balance: {formatCurrency(reminder.amountDue)}
                  </Badge>
                )}
              </div>

              {reminder.recipientName && (
                <div className="text-xs text-muted-foreground flex items-center gap-3">
                  <span>Recipient: <strong className="text-foreground">{reminder.recipientName}</strong></span>
                  {reminder.recipientEmail && <span>• {reminder.recipientEmail}</span>}
                  {reminder.recipientPhone && <span>• {reminder.recipientPhone}</span>}
                </div>
              )}

              <p className="text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg border border-border/40 font-mono text-xs">
                {reminder.description}
              </p>

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5"/> Due: {dueDateFormatted}
                </div>
                <div className="flex items-center gap-1 capitalize">
                  {methodIcons[reminder.method] || <Bell className="w-3.5 h-3.5"/>}
                  {reminder.method}
                </div>
                <div>Frequency: <span className="capitalize">{reminder.frequency}</span></div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {reminder.status !== 'sent' && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-1.5 h-8 text-primary border-primary/30 hover:bg-primary/10"
                  onClick={() => onSendNow(reminder._id || reminder.id)}
                  disabled={isSending}
                >
                  <Send className="w-3.5 h-3.5"/> Send Now
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4"/></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onSendNow(reminder._id || reminder.id)}>
                    <Send className="w-4 h-4 mr-2"/> Send Immediately
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(reminder._id || reminder.id)} className="text-rose-600">
                    <Trash2 className="w-4 h-4 mr-2"/> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
}

export default function RemindersPage() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const { formatCurrency } = usePreferences();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("all");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form state
    const [selectedTenantId, setSelectedTenantId] = useState("all_debtors");
    const [reminderMethod, setReminderMethod] = useState("email");
    const [reminderFrequency, setReminderFrequency] = useState("immediate");
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [sendImmediately, setSendImmediately] = useState(true);
    const [customNote, setCustomNote] = useState("");

    // Fetch existing reminders
    const { data: reminders = [] } = useQuery({
        queryKey: ["reminders"],
        queryFn: api.getReminders
    });

    // Fetch tenants with unpaid balances
    const { data: debtors = [], isLoading: debtorsLoading } = useQuery({
        queryKey: ["debtors"],
        queryFn: api.getDebtors
    });

    const selectedDebtor = debtors.find(d => (d.tenant._id || d.tenant.id) === selectedTenantId);

    // Mutations
    const createMutation = useMutation({
        mutationFn: api.addReminder,
        onSuccess: (data) => {
             queryClient.invalidateQueries({ queryKey: ["reminders"] });
             queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
             setIsDialogOpen(false);
             toast({ 
               title: "Reminder Processed! ✉️", 
               description: data.message || "Personalized reminders created and dispatched successfully." 
             });
        },
        onError: (err) => {
             toast({ variant: "destructive", title: "Error", description: err.message });
        }
    });

    const sendNowMutation = useMutation({
        mutationFn: api.sendReminderNow,
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ["reminders"] });
             queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
             toast({ title: "Sent! 🚀", description: "Personalized reminder dispatched successfully." });
        },
        onError: (err) => {
             toast({ variant: "destructive", title: "Sending Failed", description: err.message });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: api.deleteReminder,
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ["reminders"] });
             queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
             toast({ title: "Reminder Removed", description: "The reminder was successfully deleted." });
        }
    });

    const handleCreate = () => {
        createMutation.mutate({
            tenantId: selectedTenantId,
            type: "rent_due",
            method: reminderMethod,
            frequency: reminderFrequency,
            dueDate,
            sendImmediately,
            customNote: customNote.trim() || undefined
        });
    };

    const filteredReminders = activeTab === "all" ? reminders : reminders.filter(r => r.status === activeTab);

    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">
              {t('reminders')}
            </h2>
            <p className="text-muted-foreground mt-1">
              Send personalized payment reminders targeting tenants with unpaid rent or utility bills.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="shadow-lg hover:shadow-xl transition-all">
                  <Plus className="w-4 h-4 mr-2"/> Send Personalized Reminder
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-140 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Personalized Payment Reminder</DialogTitle>
                  <DialogDescription>
                    Automatically itemizes unpaid house rent and utility bills (water, garbage, parking, electricity) for each tenant.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  {/* Select Recipient: Only Unpaid Tenants */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Target Recipient</Label>
                    <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target tenant(s)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_debtors">
                          👥 All Unpaid Tenants ({debtors.length} tenants with pending balances)
                        </SelectItem>
                        {debtors.map(({ tenant, totalDue, rentDue, utilityDue }) => (
                          <SelectItem key={tenant._id || tenant.id} value={tenant._id || tenant.id}>
                            {tenant.name} (Unit {tenant.unitId?.unitNumber || 'N/A'}) — Owed: {formatCurrency(totalDue)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Debtor Breakdown Preview */}
                  {selectedDebtor && (
                    <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 space-y-2 text-xs">
                      <div className="flex justify-between items-center font-semibold text-rose-700 dark:text-rose-400 text-sm">
                        <span>Pending Breakdown: {selectedDebtor.tenant.name}</span>
                        <span>Total Due: {formatCurrency(selectedDebtor.totalDue)}</span>
                      </div>
                      <div className="space-y-1 text-muted-foreground font-mono">
                        {selectedDebtor.rentDue > 0 && (
                          <div className="flex justify-between">
                            <span>• House Rent:</span>
                            <span>{formatCurrency(selectedDebtor.rentDue)}</span>
                          </div>
                        )}
                        {selectedDebtor.unpaidUtilities?.map(u => (
                          <div key={u.name} className="flex justify-between">
                            <span>• {u.name}:</span>
                            <span>{formatCurrency(u.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Delivery Channel */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Delivery Method</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={reminderMethod === 'email' ? "default" : "outline"}
                        className="h-9 gap-2"
                        onClick={() => setReminderMethod('email')}
                      >
                        <Mail className="w-4 h-4"/> Email Notification
                      </Button>
                      <Button
                        type="button"
                        variant={reminderMethod === 'sms' ? "default" : "outline"}
                        className="h-9 gap-2"
                        onClick={() => setReminderMethod('sms')}
                      >
                        <MessageSquare className="w-4 h-4"/> SMS Message
                      </Button>
                    </div>
                  </div>

                  {/* Frequency & Due Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Schedule</Label>
                      <Select value={reminderFrequency} onValueChange={setReminderFrequency}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Send Immediately</SelectItem>
                          <SelectItem value="1day">1 Day Before Due</SelectItem>
                          <SelectItem value="3days">3 Days Before Due</SelectItem>
                          <SelectItem value="1week">1 Week Before Due</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Payment Deadline</Label>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Custom Note (Optional) */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      Custom Note <span className="text-muted-foreground font-normal">(optional override)</span>
                    </Label>
                    <Textarea
                      placeholder="Leave blank to use the automated breakdown of rent and utility bills..."
                      className="text-xs h-20"
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreate} 
                    disabled={createMutation.isPending || (debtors.length === 0 && selectedTenantId === 'all_debtors')}
                    className="font-medium gap-1.5"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin"/>
                    ) : (
                      <Send className="w-4 h-4"/>
                    )}
                    Dispatch Reminder
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Debtors Summary Banner */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-rose-500/5 border-rose-500/20">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                <Users className="w-6 h-6"/>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Unpaid Tenants</p>
                <h3 className="text-2xl font-bold text-rose-600">
                  {debtors.length} <span className="text-xs font-normal text-muted-foreground">tenants with balance</span>
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <DollarSign className="w-6 h-6"/>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Money Not Paid</p>
                <h3 className="text-2xl font-bold text-amber-600">
                  {formatCurrency(debtors.reduce((sum, d) => sum + d.totalDue, 0))}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Bell className="w-6 h-6"/>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Logged Reminders</p>
                <h3 className="text-2xl font-bold">
                  {reminders.length} <span className="text-xs font-normal text-muted-foreground">total alerts</span>
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reminders List Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="h-10">
            <TabsTrigger value="all">{t('all_reminders')} ({reminders.length})</TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4"/> {t('pending')} ({reminders.filter(r => r.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4"/> {t('sent')} ({reminders.filter(r => r.status === 'sent').length})
            </TabsTrigger>
            <TabsTrigger value="overdue" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4"/> {t('overdue')} ({reminders.filter(r => r.status === 'overdue').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredReminders.length === 0 ? (
              <Card className="border-border/50 p-12 text-center text-muted-foreground">
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-30"/>
                <p className="text-base font-medium">No {activeTab === 'all' ? '' : activeTab} reminders found.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click &quot;Send Personalized Reminder&quot; to notify tenants with pending rent or utilities.
                </p>
              </Card>
            ) : (
              filteredReminders.map((reminder) => (
                <ReminderCard 
                  key={reminder._id || reminder.id} 
                  reminder={reminder}
                  onSendNow={(id) => sendNowMutation.mutate(id)}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  isSending={sendNowMutation.isPending}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
}

