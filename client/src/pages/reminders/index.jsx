import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Bell, Clock, Mail, MessageSquare, CheckCircle2, AlertCircle, Plus, MoreHorizontal, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

function ReminderCard({ reminder }) {
    const { t } = useTranslation();
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
    return (<Card className="border-border/50 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">{reminder.title}</h4>
              <Badge variant="outline" className={statusColors[reminder.status] || statusColors.pending}>
                {reminder.status ? t(reminder.status) : t('pending')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{reminder.description}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3"/> {reminder.dueDate}
              </div>
              <div className="flex items-center gap-1">
                {methodIcons[reminder.method] || <Bell className="w-4 h-4"/>}
                {t(reminder.method)}
              </div>
              <div>{t('every')} {t(reminder.frequency)}</div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4"/></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
              <DropdownMenuItem>{t('edit_reminder')}</DropdownMenuItem>
              <DropdownMenuItem>{t('send_now')}</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">{t('delete')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>);
}

export default function RemindersPage() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("all");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newReminder, setNewReminder] = useState({ 
        type: "rent_due", 
        method: "email", 
        frequency: "3days", 
        title: "New Reminder", 
        description: "",
        dueDate: new Date().toISOString().split('T')[0]
    });

    const { data: reminders = [] } = useQuery({
        queryKey: ["reminders"],
        queryFn: api.getReminders
    });

    const mutation = useMutation({
        mutationFn: api.addReminder,
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ["reminders"] });
             setIsDialogOpen(false);
             toast({ title: t('reminder_created') || "Reminder Created", description: t('automation_set_success') || "Automation set successfully." });
        }
    });

    const handleCreate = () => {
        mutation.mutate(newReminder);
    };

    const filteredReminders = activeTab === "all" ? reminders : reminders.filter(r => r.status === activeTab);
    return (<div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">{t('reminders')}</h2>
          <p className="text-muted-foreground mt-1">{t('reminders_desc')}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg hover:shadow-xl transition-all">
              <Plus className="w-4 h-4 mr-2"/> {t('create_reminder')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('create_new_reminder')}</DialogTitle>
              <DialogDescription>{t('reminder_desc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('reminder_title')}</Label>
                <Select value={newReminder.type} onValueChange={(val) => setNewReminder({...newReminder, type: val, title: "New Reminder ("+val+")"})}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('select_type')}/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent_due">{t('rent_due_reminder')}</SelectItem>
                    <SelectItem value="overdue">{t('overdue_rent_alert')}</SelectItem>
                    <SelectItem value="maintenance">{t('maintenance_scheduled')}</SelectItem>
                    <SelectItem value="inspection">{t('inspection_reminder')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('send_via')}</Label>
                <div className="flex gap-2">
                  <Button variant={newReminder.method === 'email' ? "default" : "outline"} className="flex-1 h-9" onClick={() => setNewReminder({...newReminder, method: 'email'})}>
                    <Mail className="w-4 h-4 mr-2"/> {t('email')}
                  </Button>
                  <Button variant={newReminder.method === 'sms' ? "default" : "outline"} className="flex-1 h-9" onClick={() => setNewReminder({...newReminder, method: 'sms'})}>
                    <MessageSquare className="w-4 h-4 mr-2"/> {t('sms')}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('frequency')}</Label>
                <Select value={newReminder.frequency} onValueChange={(val) => setNewReminder({...newReminder, frequency: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('select_frequency')}/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">{t('immediate')}</SelectItem>
                    <SelectItem value="1day">{t('1_day_before')}</SelectItem>
                    <SelectItem value="3days">{t('3_days_before')}</SelectItem>
                    <SelectItem value="1week">{t('1_week_before')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={mutation.isPending}>
                    {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {t('create_reminder')}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="h-10">
          <TabsTrigger value="all">{t('all_reminders')}</TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4"/> {t('pending')}
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4"/> {t('sent')}
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4"/> {t('overdue')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredReminders.map((reminder, i) => (<ReminderCard key={reminder._id || reminder.id || i} reminder={reminder}/>))}
        </TabsContent>
      </Tabs>

      {/* Notification Settings removed as it belongs in Settings page */}

    </div>);
}
