import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, FileText, Loader2, DollarSign, Calendar as CalendarIcon, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { usePreferences } from "@/lib/currency";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function ExpensesPage() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const { formatCurrency, formatDate } = usePreferences();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState("all");

    // Form State
    const [newExpense, setNewExpense] = useState({
        description: "",
        amount: "",
        category: "maintenance", // maintenance, utilities, repairs, taxes, other
        date: new Date().toISOString().split('T')[0],
        status: "paid"
    });

    const { data: expenses = [], isLoading } = useQuery({
        queryKey: ["expenses"],
        queryFn: api.getExpenses
    });

    const mutation = useMutation({
        mutationFn: api.addExpense,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] }); // Update dashboard
            queryClient.invalidateQueries({ queryKey: ["reports_data"] }); // Update reports
            setIsDialogOpen(false);
            setNewExpense({
                description: "",
                amount: "",
                category: "maintenance",
                date: new Date().toISOString().split('T')[0],
                status: "paid"
            });
            toast({ title: "Expense Recorded", description: "Expense has been added successfully." });
        },
        onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to add expense." })
    });

    const handleSubmit = () => {
        if (!newExpense.description || !newExpense.amount) {
            toast({ variant: "destructive", title: "Missing Fields", description: "Please fill in description and amount." });
            return;
        }
        mutation.mutate(newExpense);
    };

    const filteredExpenses = expenses.filter(expense => {
        const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const categoryColors = {
        maintenance: "bg-blue-100 text-blue-800",
        utilities: "bg-yellow-100 text-yellow-800",
        repairs: "bg-orange-100 text-orange-800",
        taxes: "bg-red-100 text-red-800",
        other: "bg-gray-100 text-gray-800"
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">{t('expenses')}</h2>
                    <p className="text-muted-foreground mt-1">{t('expenses_desc') || "Track and manage your property expenses."}</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="shadow-lg hover:shadow-xl transition-all">
                            <Plus className="w-4 h-4 mr-2" /> {t('add_expense') || "Record Expense"}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{t('add_expense') || "Record Expense"}</DialogTitle>
                            <DialogDescription>{t('add_expense_desc') || "Enter the details of the new expense."}</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>{t('description')}</Label>
                                <Input 
                                    placeholder="e.g., HVAC Repair" 
                                    value={newExpense.description} 
                                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>{t('amount')}</Label>
                                    <Input 
                                        type="number" 
                                        placeholder="0.00" 
                                        value={newExpense.amount} 
                                        onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>{t('date')}</Label>
                                    <Input 
                                        type="date" 
                                        value={newExpense.date} 
                                        onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('category')}</Label>
                                <Select value={newExpense.category} onValueChange={(val) => setNewExpense({...newExpense, category: val})}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="maintenance">{t('maintenance')}</SelectItem>
                                        <SelectItem value="utilities">{t('utilities') || "Utilities"}</SelectItem>
                                        <SelectItem value="repairs">{t('repairs') || "Repairs"}</SelectItem>
                                        <SelectItem value="taxes">{t('taxes') || "Taxes"}</SelectItem>
                                        <SelectItem value="other">{t('other')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSubmit} disabled={mutation.isPending}>
                                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} {t('save')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-border/50 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('total_expenses_month') || "This Month"}</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(expenses
                                .filter(e => e.date.startsWith(new Date().toISOString().slice(0, 7)))
                                .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)
                            )}
                        </div>
                    </CardContent>
                </Card>
                 <Card className="border-border/50 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('total_expenses_year') || "Year to Date"}</CardTitle>
                         <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                           {formatCurrency(expenses
                                .filter(e => e.date.startsWith(new Date().getFullYear().toString()))
                                .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-4">
                     <div className="flex items-center justify-between">
                        <CardTitle>{t('expenses_history') || "Expense History"}</CardTitle>
                        <div className="flex items-center gap-2">
                             <div className="relative w-64">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                                <Input 
                                    placeholder={t('search_placeholder') || "Search expenses..."} 
                                    className="pl-9 h-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-[150px] h-9">
                                    <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground"/>
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    <SelectItem value="maintenance">{t('maintenance')}</SelectItem>
                                    <SelectItem value="utilities">{t('utilities') || "Utilities"}</SelectItem>
                                    <SelectItem value="repairs">{t('repairs') || "Repairs"}</SelectItem>
                                    <SelectItem value="taxes">{t('taxes') || "Taxes"}</SelectItem>
                                    <SelectItem value="other">{t('other')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('date')}</TableHead>
                                <TableHead>{t('description')}</TableHead>
                                <TableHead>{t('category')}</TableHead>
                                <TableHead className="text-right">{t('amount')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredExpenses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        {t('no_expenses') || "No expenses found"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredExpenses.map((expense) => (
                                    <TableRow key={expense.id}>
                                        <TableCell>{formatDate(expense.date)}</TableCell>
                                        <TableCell className="font-medium">{expense.description}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={categoryColors[expense.category] || categoryColors.other}>
                                                {t(expense.category) || expense.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-rose-600">
                                            - {formatCurrency(expense.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
