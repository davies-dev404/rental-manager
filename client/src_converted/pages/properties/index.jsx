import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/mock-data";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Building, Home, MoreHorizontal, Loader2, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
// --- Property Card ---
function PropertyCard({ property }) {
    const { data: units } = useQuery({
        queryKey: ["units", property.id],
        queryFn: () => api.getUnits(property.id)
    });
    const vacantCount = units?.filter(u => u.status === "vacant").length || 0;
    return (<Card className="group overflow-hidden border-border/50 shadow-sm hover:shadow-lg transition-all hover:border-primary/20">
            <div className="h-40 bg-muted relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"/>
                <img src={property.image || `https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`} alt={property.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                <div className="absolute bottom-3 left-4 z-20 text-white">
                    <h3 className="font-bold text-lg">{property.name}</h3>
                    <div className="flex items-center text-xs opacity-90">
                        <MapPin className="w-3 h-3 mr-1"/>
                        {property.address}
                    </div>
                </div>
            </div>
            <CardContent className="p-4 pt-5">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Total Units</span>
                        <div className="flex items-center font-medium">
                            <Building className="w-4 h-4 mr-2 text-primary"/>
                            {units?.length || 0}
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Vacant</span>
                        <div className="flex items-center font-medium">
                            <Home className="w-4 h-4 mr-2 text-emerald-500"/>
                            {vacantCount}
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-4 border-t bg-muted/20 flex justify-between items-center">
                <Button variant="outline" size="sm" className="w-full mr-2">Manage Units</Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4"/></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>Edit Property</DropdownMenuItem>
                        <DropdownMenuItem>Assign Caretaker</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardFooter>
        </Card>);
}
// --- Add Property Dialog ---
const propertySchema = z.object({
    name: z.string().min(2, "Name is required"),
    address: z.string().min(5, "Address is required"),
    image: z.string().optional(),
});
function AddPropertyDialog() {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const form = useForm({
        resolver: zodResolver(propertySchema),
        defaultValues: {
            name: "",
            address: "",
            image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
        }
    });
    const mutation = useMutation({
        mutationFn: api.addProperty,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["properties"] });
            setOpen(false);
            form.reset();
            toast({ title: "Property Added", description: "New property has been listed successfully." });
        },
        onError: () => {
            toast({ variant: "destructive", title: "Error", description: "Failed to add property." });
        }
    });
    function onSubmit(values) {
        mutation.mutate(values);
    }
    return (<Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-lg hover:shadow-xl transition-all">
            <Plus className="w-4 h-4 mr-2"/> Add Property
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Property</DialogTitle>
          <DialogDescription>
            Enter the details of the new property here.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem>
                  <FormLabel>Property Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Sunrise Apartments" {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>
            <FormField control={form.control} name="address" render={({ field }) => (<FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 123 Main St, Nairobi" {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>
             <FormField control={form.control} name="image" render={({ field }) => (<FormItem>
                  <FormLabel>Image URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Create Property
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>);
}
// --- Main Page ---
export default function PropertiesPage() {
    const { data: properties, isLoading } = useQuery({
        queryKey: ["properties"],
        queryFn: api.getProperties,
    });
    const [sortBy, setSortBy] = useState("name");
    const sortedProperties = properties ? [...properties].sort((a, b) => {
        if (sortBy === "name") {
            return a.name.localeCompare(b.name);
        }
        return 0;
    }) : [];
    return (<div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">Properties</h2>
            <p className="text-muted-foreground mt-1">Manage your buildings and units.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value)}>
            <SelectTrigger className="w-40 h-10">
              <ArrowUpDown className="w-4 h-4 mr-2"/>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="units">Sort by Units</SelectItem>
            </SelectContent>
          </Select>
          <AddPropertyDialog />
        </div>
      </div>

      {isLoading ? (<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 w-full rounded-xl"/>)}
        </div>) : (<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedProperties.map(prop => (<PropertyCard key={prop.id} property={prop}/>))}
        </div>)}
    </div>);
}
