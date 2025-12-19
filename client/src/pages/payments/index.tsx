import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Payment } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Download, CheckCircle2, Clock, AlertCircle, Loader2, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const getStatusColor = (status: Payment["status"]) => {
    switch (status) {
        case "paid": return "bg-emerald-500/15 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/25";
        case "partial": return "bg-amber-500/15 text-amber-700 border-amber-500/20 hover:bg-amber-500/25";
        case "overdue": return "bg-rose-500/15 text-rose-700 border-rose-500/20 hover:bg-rose-500/25";
        default: return "bg-gray-500/15 text-gray-700 border-gray-500/20";
    }
};

const getStatusIcon = (status: Payment["status"]) => {
    switch (status) {
        case "paid": return <CheckCircle2 className="w-3 h-3 mr-1" />;
        case "partial": return <Clock className="w-3 h-3 mr-1" />;
        case "overdue": return <AlertCircle className="w-3 h-3 mr-1" />;
        default: return null;
    }
};

// --- Record Payment Dialog ---
const paymentSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  date: z.string(),
  method: z.enum(["cash", "bank", "mobile_money", "lipa_na_mpesa"]),
  status: z.enum(["paid", "partial"]),
  monthCovered: z.string(),
});

function RecordPaymentDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: tenants } = useQuery({ queryKey: ["tenants"], queryFn: api.getTenants });

  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      tenantId: "",
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      method: "mobile_money",
      status: "paid",
      monthCovered: new Date().toISOString().slice(0, 7)
    }
  });

  const mutation = useMutation({
    mutationFn: api.recordPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setOpen(false);
      form.reset();
      toast({ title: "Payment Recorded", description: "Transaction has been logged successfully." });
    },
    onError: () => {
       toast({ variant: "destructive", title: "Error", description: "Failed to record payment." });
    }
  });

  function onSubmit(values: z.infer<typeof paymentSchema>) {
    const tenant = tenants?.find(t => t.id === values.tenantId);
    if (!tenant) return;

    mutation.mutate({
        ...values,
        unitId: tenant.unitId
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-lg hover:shadow-xl transition-all">
            <Plus className="w-4 h-4 mr-2" /> Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Log a rent payment from a tenant.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tenantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tenant" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tenants?.map(tenant => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                              {tenant.name} (Unit {tenant.unitId.replace('un','')})
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                        <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                 <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="lipa_na_mpesa">Lipa na M-Pesa</SelectItem>
                            <SelectItem value="mobile_money">Mobile Money</SelectItem>
                            <SelectItem value="bank">Bank Transfer</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="paid">Full Payment</SelectItem>
                            <SelectItem value="partial">Partial Payment</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Record
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default function PaymentsPage() {
  const { data: payments, isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: api.getPayments,
  });

  const [sortBy, setSortBy] = useState<"date" | "amount" | "status">("date");

  const sortedPayments = payments ? [...payments].sort((a, b) => {
    switch (sortBy) {
      case "date":
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case "amount":
        return b.amount - a.amount;
      case "status":
        return a.status.localeCompare(b.status);
      default:
        return 0;
    }
  }) : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">Payments</h2>
            <p className="text-muted-foreground mt-1">Track rent collection and payment history.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" className="shadow-sm">
                <Download className="w-4 h-4 mr-2" /> Export Report
            </Button>
            <RecordPaymentDialog />
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle>Transaction History</CardTitle>
                <div className="flex items-center gap-2">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Search transaction..." className="pl-9 h-9" />
                    </div>
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                        <SelectTrigger className="w-44 h-9">
                            <ArrowUpDown className="w-4 h-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date">Sort by Date</SelectItem>
                            <SelectItem value="amount">Sort by Amount</SelectItem>
                            <SelectItem value="status">Sort by Status</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead>Date</TableHead>
                        <TableHead>Tenant ID</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">Loading payments...</TableCell>
                        </TableRow>
                    ) : sortedPayments.map((payment) => (
                        <TableRow key={payment.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="font-medium text-sm">{payment.date}</TableCell>
                            <TableCell className="text-muted-foreground text-xs uppercase tracking-wide">
                                {payment.tenantId}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="bg-background">{payment.unitId}</Badge>
                            </TableCell>
                            <TableCell className="font-bold text-gray-900 dark:text-white">
                                ${payment.amount.toLocaleString()}
                            </TableCell>
                            <TableCell className="capitalize text-sm text-muted-foreground">
                                {payment.method.replace('_', ' ')}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className={getStatusColor(payment.status)}>
                                    {getStatusIcon(payment.status)}
                                    <span className="capitalize">{payment.status}</span>
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm" className="text-xs">Receipt</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
