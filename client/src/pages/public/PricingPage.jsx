import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import PricingPlans, { PRICING_TIERS } from "@/components/public/PricingPlans";
import { Check, ShieldCheck, HelpCircle, PhoneCall, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function PricingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleSelectPlan = (planId, cycle = "monthly") => {
    if (user) {
      setLocation("/dashboard");
    } else {
      setLocation(`/login?mode=signup&plan=${planId}&cycle=${cycle}`);
    }
  };

  const featureComparison = [
    { name: "Automate Rent & Arrears Reminders", starter: true, basic: true, standard: true, premium: true, enterprise: true },
    { name: "Real-time M-Pesa Payment Matching", starter: true, basic: true, standard: true, premium: true, enterprise: true },
    { name: "Kenyan Standard Tenancy Agreement (PDF)", starter: true, basic: true, standard: true, premium: true, enterprise: true },
    { name: "Branded Digital Invoices & SMS Receipts", starter: true, basic: true, standard: true, premium: true, enterprise: true },
    { name: "Water & Power Sub-Meter Calculation", starter: false, basic: true, standard: true, premium: true, enterprise: true },
    { name: "Late Rent Penalty Engine", starter: false, basic: true, standard: true, premium: true, enterprise: true },
    { name: "Direct Daraja Webhook Payment Sync", starter: false, basic: false, standard: true, premium: true, enterprise: true },
    { name: "Landlord Remittance & Payout Sheets", starter: false, basic: false, standard: true, premium: true, enterprise: true },
    { name: "Bank Statement Parsing (KCB, Equity, Co-op)", starter: false, basic: false, standard: false, premium: true, enterprise: true },
    { name: "KRA eTIMS Export & Tax Reports", starter: false, basic: false, standard: false, premium: true, enterprise: true },
    { name: "Dedicated Account Manager & Phone SLA", starter: false, basic: false, standard: false, premium: false, enterprise: true }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">
      <PublicNavbar />

      {/* Hero Header */}
      <section className="py-14 sm:py-20 bg-linear-to-b from-blue-50/50 via-white to-white border-b border-slate-100">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-100 text-[#0069d4] text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Simple, Transparent Kenyan Pricing
            </span>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Plans Starting From <span className="text-[#007AFF]">KES 1,500</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-slate-600">
              Pick the right tier for your rental units. All plans include automated M-Pesa payment matching, WhatsApp notices, and Kenyan law-compliant lease generator.
            </p>
          </div>

          {/* Interactive Pricing Cards */}
          <div className="mt-12">
            <PricingPlans onSelectPlan={handleSelectPlan} />
          </div>
        </div>
      </section>

      {/* Complete Feature Matrix */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight sm:text-4xl">
              Compare Features Side by Side
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Everything you need to automate rental operations, from single bungalows to 200+ unit estates.
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200 shadow-sm">
            <table className="w-full text-left border-collapse min-w-162.5">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-600">
                  <th className="py-4 px-6">Feature</th>
                  <th className="py-4 px-4 text-center">Starter (1.5k)</th>
                  <th className="py-4 px-4 text-center">Basic (2.5k)</th>
                  <th className="py-4 px-4 text-center text-blue-600">Standard (4.5k)</th>
                  <th className="py-4 px-4 text-center">Premium (7k)</th>
                  <th className="py-4 px-4 text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {featureComparison.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6 font-medium text-slate-800">{row.name}</td>
                    <td className="py-3.5 px-4 text-center">{row.starter ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">—</span>}</td>
                    <td className="py-3.5 px-4 text-center">{row.basic ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">—</span>}</td>
                    <td className="py-3.5 px-4 text-center bg-blue-50/30">{row.standard ? <Check className="w-4 h-4 text-[#007AFF] font-bold mx-auto" /> : <span className="text-slate-300">—</span>}</td>
                    <td className="py-3.5 px-4 text-center">{row.premium ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">—</span>}</td>
                    <td className="py-3.5 px-4 text-center">{row.enterprise ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Frequently Asked Pricing Questions */}
      <section className="py-16 bg-slate-50 border-t border-slate-200">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 text-center mb-10">
            Frequently Asked Pricing Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
              <h4 className="font-bold text-slate-900 text-base mb-2">Can I upgrade or downgrade anytime?</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Yes. If your portfolio expands from 10 to 30 units, simply switch to the next tier in your settings. You will only pay the prorated difference.
              </p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
              <h4 className="font-bold text-slate-900 text-base mb-2">How do M-Pesa payments work?</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Tenants pay straight to your existing M-Pesa Till or Paybill number. MakaziFlow connects via Safaricom Daraja API to reconcile each payment with the tenant&apos;s unit instantly.
              </p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
              <h4 className="font-bold text-slate-900 text-base mb-2">Is there any setup or onboarding fee?</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Zero setup fee. All plans include 14 days of free trial and free Excel tenant portfolio migration assisted by our Nairobi support team.
              </p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
              <h4 className="font-bold text-slate-900 text-base mb-2">What payment methods do you accept?</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                We accept M-Pesa (Till/Paybill), Credit/Debit Cards, and direct Kenyan Bank Transfer (KCB, Equity, Stanbic, Co-op).
              </p>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
