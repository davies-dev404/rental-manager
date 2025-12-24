import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, FileText, Loader2, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePreferences } from "@/lib/currency";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function TaxCalculator() {
    const { t } = useTranslation();
    const { currency, formatCurrency } = usePreferences();
    const { toast } = useToast();
    const [grossRent, setGrossRent] = useState("");
    const [tax, setTax] = useState(null);

    // Auto-fetch data for current month
    const { data: reportData, isLoading } = useQuery({
        queryKey: ['kra_tax_report'],
        queryFn: () => api.getKraTaxReport()
    });

    useEffect(() => {
        if (reportData) {
            setGrossRent(reportData.grossRent);
            setTax(reportData.taxPayable);
        }
    }, [reportData]);

    const calculateTax = () => {
        const amount = parseFloat(grossRent);
        if (isNaN(amount)) return;
        // Standard MRI Rate is 7.5% of Gross Rent
        setTax(amount * 0.075);
    };

    const fileMutation = useMutation({
        mutationFn: api.fileKraReturn,
        onSuccess: () => {
             toast({
                title: "Return Filing Initiated",
                description: "The system has queued the return for filing. In a live system, this would connect to iTax via API."
             });
        },
        onError: (err) => {
            toast({ variant: "destructive", title: "Filing Failed", description: err.message });
        }
    });

    const handleFileReturn = () => {
        if (!grossRent) return;
        fileMutation.mutate({
            grossRent: parseFloat(grossRent),
            tax: tax,
            period: reportData?.month || new Date().toISOString().slice(0, 7)
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-primary"/>
                    {t('kra_tax_calculator') || "KRA Tax Calculator"}
                </CardTitle>
                <CardDescription>
                    {t('kra_tax_desc') || "Calculate your Monthly Rental Income (MRI) Tax (7.5% of Gross Rent)."}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-2">
                    <Label>{t('gross_rent_income') || "Gross Rent Income"}</Label>
                    <div className="relative">
                        <span className="absolute left-2.5 top-2.5 text-muted-foreground text-sm font-medium">{currency}</span>
                        <Input 
                            type="number" 
                            className="pl-12" 
                            placeholder="e.g. 50000"
                            value={grossRent}
                            onChange={(e) => setGrossRent(e.target.value)}
                        />
                        {isLoading && <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-muted-foreground"/>}
                    </div>
                </div>
                
                <Button onClick={calculateTax} className="w-full" variant="secondary">
                    {t('calculate_tax') || "Recalculate Tax"}
                </Button>

                {tax !== null && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border/50">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-muted-foreground">{t('tax_payable') || "Tax Payable (MRI)"}:</span>
                            <span className="text-xl font-bold text-primary">{formatCurrency(tax)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                            * {t('kra_disclaimer') || "This is an estimate based on the 7.5% MRI rate. Please consult a tax professional."}
                        </p>
                    </div>
                )}
                
                <div className="pt-2 grid gap-2">
                     <Button 
                        onClick={handleFileReturn} 
                        disabled={fileMutation.isPending || !tax} 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {fileMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <CheckCircle className="w-4 h-4 mr-2"/>}
                        {t('file_return_auto') || "Auto-File Return"}
                    </Button>

                    <Button variant="outline" className="w-full" asChild>
                        <a href="https://itax.kra.go.ke/" target="_blank" rel="noreferrer">
                            <FileText className="w-4 h-4 mr-2"/>
                            {t('file_returns_manual') || "File Manually on iTax"}
                        </a>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
