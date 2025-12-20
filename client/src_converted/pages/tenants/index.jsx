import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Phone, Mail, FileText, MoreHorizontal, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// --- Add Tenant Dialog ---
const tenantSchema = z.object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email(),
    phone: z.string().min(10, "Phone is required"),
    nationalId: z.string().min(5, "ID is required"),
    unitId: z.string().min(1, "Unit is required"),
    leaseStart: z.string(),
});
function AddTenantDialog() {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { data: units } = useQuery({ queryKey: ["units"], queryFn: () => api.getUnits() });
    const vacantUnits = units?.filter(u => u.status === "vacant") || [];
    const form = useForm({
        resolver: zodResolver(tenantSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            nationalId: "",
            unitId: "",
            leaseStart: new Date().toISOString().split('T')[0]
        }
    });
    const mutation = useMutation({
        mutationFn: api.addTenant,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tenants"] });
            queryClient.invalidateQueries({ queryKey: ["units"] }); // Update unit status
            setOpen(false);
            form.reset();
            toast({ title: "Tenant Added", description: "New tenant registered successfully." });
        },
        onError: () => {
            toast({ variant: "destructive", title: "Error", description: "Failed to add tenant." });
        }
    });
    function onSubmit(values) {
        mutation.mutate({
            ...values,
            status: "active" // Default status for new tenants
        });
    }
    return (<Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-lg hover:shadow-xl transition-all">
            <Plus className="w-4 h-4 mr-2"/> Add Tenant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Register New Tenant</DialogTitle>
          <DialogDescription>
            Add details for a new tenant and assign them a unit.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                        <Input placeholder="John Doe" {...field}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>)}/>
                <FormField control={form.control} name="nationalId" render={({ field }) => (<FormItem>
                    <FormLabel>National ID</FormLabel>
                    <FormControl>
                        <Input placeholder="12345678" {...field}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>)}/>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (<FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>)}/>
                <FormField control={form.control} name="phone" render={({ field }) => (<FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                        <Input placeholder="+254..." {...field}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>)}/>
            </div>

            <FormField control={form.control} name="unitId" render={({ field }) => (<FormItem>
                  <FormLabel>Assign Unit</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a vacant unit"/>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vacantUnits.map(unit => (<SelectItem key={unit.id} value={unit.id}>
                              Unit {unit.unitNumber} - {unit.type} (${unit.rentAmount})
                          </SelectItem>))}
                      {vacantUnits.length === 0 && <SelectItem value="" disabled>No vacant units available</SelectItem>}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>)}/>
            
            <FormField control={form.control} name="leaseStart" render={({ field }) => (<FormItem>
                  <FormLabel>Lease Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>

            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Register Tenant
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>);
}
export default function TenantsPage() {
    const { data: tenants, isLoading } = useQuery({
        queryKey: ["tenants"],
        queryFn: api.getTenants,
    });
    return (<div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">Tenants</h2>
            <p className="text-muted-foreground mt-1">Directory of all current and past tenants.</p>
        </div>
        <AddTenantDialog />
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle>Tenant Directory</CardTitle>
                <div className="flex items-center gap-2">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                        <Input placeholder="Search name, phone..." className="pl-9 h-9"/>
                    </div>
                    <Button variant="outline" size="sm" className="h-9">
                        <Filter className="w-4 h-4 mr-2"/> Filter
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead>Tenant</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Unit Info</TableHead>
                        <TableHead>Lease Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (<TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">Loading tenants...</TableCell>
                        </TableRow>) : tenants?.map((tenant) => (<TableRow key={tenant.id} className="group cursor-pointer hover:bg-muted/50 transition-colors">
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9 border border-border">
                                        <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                                            {tenant.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-medium text-sm">{tenant.name}</div>
                                        <div className="text-xs text-muted-foreground">ID: {tenant.nationalId}</div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1 text-sm">
                                    <div className="flex items-center text-muted-foreground text-xs">
                                        <Mail className="w-3 h-3 mr-1.5"/> {tenant.email}
                                    </div>
                                    <div className="flex items-center text-muted-foreground text-xs">
                                        <Phone className="w-3 h-3 mr-1.5"/> {tenant.phone}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="font-mono text-xs bg-background">
                                    Unit {tenant.unitId.replace('un', '')}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'} className={tenant.status === 'active' ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-500/20" : ""}>
                                        {tenant.status === 'active' ? 'Active Lease' : 'Past Lease'}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">Since {tenant.leaseStart}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreHorizontal className="w-4 h-4"/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Options</DropdownMenuLabel>
                                        <DropdownMenuItem><FileText className="w-4 h-4 mr-2"/> View Lease</DropdownMenuItem>
                                        <DropdownMenuItem>Edit Details</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-red-600">Terminate Lease</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>);
}
