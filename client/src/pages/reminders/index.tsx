import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Bell, Clock, Mail, MessageSquare, CheckCircle2, AlertCircle, Plus, MoreHorizontal
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const reminders = [
  {
    id: "r1",
    type: "rent_due",
    title: "Rent Due Reminder",
    description: "Unit A101 - John Doe",
    dueDate: "2024-06-01",
    status: "pending",
    method: "email",
    frequency: "3 days before"
  },
  {
    id: "r2",
    type: "overdue",
    title: "Overdue Rent Alert",
    description: "Unit B101 - Bob Smith",
    dueDate: "2024-05-20",
    status: "overdue",
    method: "sms",
    frequency: "Immediate"
  },
  {
    id: "r3",
    type: "payment_received",
    title: "Payment Confirmation",
    description: "Unit A102 - $25,000 received",
    dueDate: "2024-05-28",
    status: "sent",
    method: "email",
    frequency: "On payment"
  },
  {
    id: "r4",
    type: "maintenance",
    title: "Maintenance Scheduled",
    description: "Unit C205 - Plumbing repair",
    dueDate: "2024-06-05",
    status: "pending",
    method: "sms",
    frequency: "1 day before"
  },
];

function ReminderCard({ reminder }: any) {
  const statusColors = {
    pending: "bg-amber-500/15 text-amber-700 border-amber-500/20",
    sent: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
    overdue: "bg-rose-500/15 text-rose-700 border-rose-500/20"
  };

  const methodIcons = {
    email: <Mail className="w-4 h-4" />,
    sms: <MessageSquare className="w-4 h-4" />,
    push: <Bell className="w-4 h-4" />
  };

  return (
    <Card className="border-border/50 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">{reminder.title}</h4>
              <Badge variant="outline" className={statusColors[reminder.status as keyof typeof statusColors]}>
                {reminder.status.charAt(0).toUpperCase() + reminder.status.slice(1)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{reminder.description}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {reminder.dueDate}
              </div>
              <div className="flex items-center gap-1">
                {methodIcons[reminder.method as keyof typeof methodIcons]}
                {reminder.method.toUpperCase()}
              </div>
              <div>Every {reminder.frequency}</div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem>Edit Reminder</DropdownMenuItem>
              <DropdownMenuItem>Send Now</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

export default function RemindersPage() {
  const [activeTab, setActiveTab] = useState("all");

  const filteredReminders = activeTab === "all" ? reminders : reminders.filter(r => r.status === activeTab);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">Reminders</h2>
          <p className="text-muted-foreground mt-1">Manage rent reminders, alerts, and automated notifications.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="shadow-lg hover:shadow-xl transition-all">
              <Plus className="w-4 h-4 mr-2" /> Create Reminder
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Reminder</DialogTitle>
              <DialogDescription>Set up automatic reminders for rent payments and events.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Reminder Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent_due">Rent Due Reminder</SelectItem>
                    <SelectItem value="overdue">Overdue Rent Alert</SelectItem>
                    <SelectItem value="maintenance">Maintenance Scheduled</SelectItem>
                    <SelectItem value="inspection">Inspection Reminder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Send Via</Label>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-9">
                    <Mail className="w-4 h-4 mr-2" /> Email
                  </Button>
                  <Button variant="outline" className="flex-1 h-9">
                    <MessageSquare className="w-4 h-4 mr-2" /> SMS
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="1day">1 Day Before</SelectItem>
                    <SelectItem value="3days">3 Days Before</SelectItem>
                    <SelectItem value="1week">1 Week Before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button>Create Reminder</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="h-10">
          <TabsTrigger value="all">All Reminders</TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" /> Pending
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Sent
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Overdue
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredReminders.map(reminder => (
            <ReminderCard key={reminder.id} reminder={reminder} />
          ))}
        </TabsContent>
      </Tabs>

      {/* Notification Settings */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Email Service Configuration</CardTitle>
          <CardDescription>Configure email and SMS settings for notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Email Provider</h4>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-10 justify-start">
                <Mail className="w-4 h-4 mr-2" /> Gmail / Google
              </Button>
              <Button variant="outline" className="h-10 justify-start">
                <Mail className="w-4 h-4 mr-2" /> SendGrid
              </Button>
              <Button variant="outline" className="h-10 justify-start">
                <Mail className="w-4 h-4 mr-2" /> Mailgun
              </Button>
              <Button variant="outline" className="h-10 justify-start">
                <Mail className="w-4 h-4 mr-2" /> SMTP
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium text-sm">SMS Provider</h4>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-10 justify-start">
                <MessageSquare className="w-4 h-4 mr-2" /> Twilio
              </Button>
              <Button variant="outline" className="h-10 justify-start">
                <MessageSquare className="w-4 h-4 mr-2" /> Lipa na M-Pesa
              </Button>
              <Button variant="outline" className="h-10 justify-start">
                <MessageSquare className="w-4 h-4 mr-2" /> Nexmo/Vonage
              </Button>
              <Button variant="outline" className="h-10 justify-start">
                <MessageSquare className="w-4 h-4 mr-2" /> AWS SNS
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/20">
          <Button>Configure Services</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
