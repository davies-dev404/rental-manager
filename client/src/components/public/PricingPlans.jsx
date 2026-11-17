import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ArrowRight,
  Sparkles,
  Zap,
  Building2,
  ShieldCheck,
  Clock,
  Layers,
  HelpCircle,
  Smartphone,
  ChevronDown,
  CheckCircle2
} from "lucide-react";

export const PRICING_TIERS = [
  {
    id: "starter",
    name: "Starter",
    badge: "Solo Landlords",
    unitsRange: "Up to 5 units",
    minUnits: 1,
    maxUnits: 5,
    monthlyPrice: 1500,
    annualPrice: 1200,
    accentColor: "border-slate-200 hover:border-blue-400",
    headerBg: "bg-slate-50",
    buttonClass: "bg-[#1d1d1f] text-white hover:bg-slate-800",
    popular: false,
    highlight: "Great for individual landlords managing plots & bungalows across Kenya.",
    features: [
      "Up to 5 rental units",
      "Pesaflow M-Pesa, Paybill & Card collection",
      "Automated tenant email & SMS reminders",
      "Official PDF receipts & invoices",
      "Tenant balance tracking & statements",
      "1 Staff / Caretaker login"
    ]
  },
  {
    id: "basic",
    name: "Basic",
    badge: "Small Plots",
    unitsRange: "Up to 10 units",
    minUnits: 1,
    maxUnits: 10,
    monthlyPrice: 2500,
    annualPrice: 2000,
    accentColor: "border-slate-200 hover:border-cyan-400",
    headerBg: "bg-slate-50",
    buttonClass: "bg-[#1d1d1f] text-white hover:bg-slate-800",
    popular: false,
    highlight: "Built for residential apartment blocks with 6 to 10 units.",
    features: [
      "Up to 10 rental units",
      "Everything in Starter, plus:",
      "Water & electricity sub-meter billing",
      "Automated late payment penalty tracking",
      "Bulk monthly rent invoice generation",
      "2 Caretaker logins"
    ]
  },
  {
    id: "growth",
    name: "Growth",
    badge: "Most Popular",
    unitsRange: "Up to 25 units",
    minUnits: 1,
    maxUnits: 25,
    monthlyPrice: 4500,
    annualPrice: 3600,
    accentColor: "border-[#007AFF] shadow-xl shadow-blue-500/10 ring-2 ring-[#007AFF]/20",
    headerBg: "bg-linear-to-r from-blue-50 to-cyan-50",
    buttonClass: "bg-linear-to-r from-[#0069d4] to-[#007AFF] text-white hover:brightness-110 shadow-lg shadow-blue-500/25",
    popular: true,
    highlight: "Chosen by growing Kenyan property managers scaling multi-block portfolios.",
    features: [
      "Up to 25 rental units",
      "Everything in Basic, plus:",
      "Centralized Pesaflow M-Pesa, Card & Bank sync",
      "Automated reconciliation & arrears ledger",
      "KRA MRI & tax reporting tools",
      "5 Staff logins with permission controls"
    ]
  },
  {
    id: "professional",
    name: "Professional",
    badge: "Property Agencies",
    unitsRange: "Up to 50 units",
    minUnits: 1,
    maxUnits: 50,
    monthlyPrice: 7000,
    annualPrice: 5600,
    accentColor: "border-slate-200 hover:border-emerald-400",
    headerBg: "bg-slate-50",
    buttonClass: "bg-[#1d1d1f] text-white hover:bg-slate-800",
    popular: false,
    highlight: "Designed for real estate agencies managing up to 50 units.",
    features: [
      "Up to 50 rental units",
      "Everything in Growth, plus:",
      "KRA eTIMS OSCU/VSCU submission tracking",
      "Tenant Self-Service Online Pay Portal",
      "Detailed P&L and owner statements",
      "Priority Kenyan support desk"
    ]
  },
  {
    id: "business",
    name: "Business",
    badge: "Large Estates",
    unitsRange: "Up to 100 units",
    minUnits: 1,
    maxUnits: 100,
    monthlyPrice: 12000,
    annualPrice: 9600,
    accentColor: "border-slate-200 hover:border-purple-400",
    headerBg: "bg-slate-50",
    buttonClass: "bg-[#1d1d1f] text-white hover:bg-slate-800",
    popular: false,
    highlight: "Comprehensive automation for established residential estates up to 100 units.",
    features: [
      "Up to 100 rental units",
      "Everything in Professional, plus:",
      "Multi-bank adapter integration support",
      "Dedicated onboarding specialist",
      "Full financial & subscription audit logs"
    ]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    badge: "Custom Scale",
    unitsRange: "Custom Units",
    minUnits: 101,
    maxUnits: 99999,
    monthlyPrice: 20000,
    annualPrice: 16000,
    accentColor: "border-slate-200 hover:border-indigo-400",
    headerBg: "bg-slate-50",
    buttonClass: "bg-slate-900 text-white hover:bg-slate-800",
    popular: false,
    highlight: "Tailored for commercial complexes, institutional developers & SACCOs.",
    features: [
      "Custom / Unlimited rental units",
      "Everything in Business, plus:",
      "Custom API webhooks & ERP integrations",
      "Unlimited caretaker & accountant logins",
      "Dedicated Kenyan account manager",
      "Formal SLA & 99.9% uptime guarantee"
    ]
  }
];

export default function PricingPlans({ onSelectPlan }) {
  const [billingCycle, setBillingCycle] = useState("monthly"); // "monthly" | "annual"
  const [selectedUnitsFilter, setSelectedUnitsFilter] = useState("all");

  const filterOptions = [
    { label: "All Plans", value: "all" },
    { label: "1 – 5 Units (Starter)", value: "starter" },
    { label: "Up to 10 Units (Basic)", value: "basic" },
    { label: "Up to 25 Units (Growth)", value: "growth" },
    { label: "Up to 50 Units (Professional)", value: "professional" },
    { label: "Up to 100 Units (Business)", value: "business" },
    { label: "100+ Units (Enterprise)", value: "enterprise" }
  ];

  const handleSelect = (tier) => {
    if (onSelectPlan) {
      onSelectPlan(tier.id, billingCycle);
    } else {
      window.location.href = `/login?mode=signup&plan=${tier.id}&cycle=${billingCycle}`;
    }
  };

  return (
    <div className="w-full">
      {/* Interactive Controls Bar: Billing Toggle & Unit Range Quick Filter */}
      <div className="flex flex-col items-center justify-center gap-6 mb-12">
        {/* Monthly vs Annual Switch */}
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-white p-1.5 shadow-xs">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              billingCycle === "monthly"
                ? "bg-[#09152b] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("annual")}
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              billingCycle === "annual"
                ? "bg-[#007AFF] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            <span>Annual Billing</span>
            <span className="rounded-full bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
              Save 20%
            </span>
          </button>
        </div>

        {/* Quick Filter: How many units do you manage? */}
        <div className="w-full max-w-3xl">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Choose by your current unit count:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedUnitsFilter(opt.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                  selectedUnitsFilter === opt.value
                    ? "bg-[#007AFF] text-white border-[#007AFF] shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {PRICING_TIERS.map((tier, idx) => {
          const isFilterMatch =
            selectedUnitsFilter === "all" || selectedUnitsFilter === tier.id;
          const displayPrice =
            billingCycle === "monthly" ? tier.monthlyPrice : tier.annualPrice;

          return (
            <motion.article
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              whileHover={{ y: -8, scale: 1.015 }}
              className={`relative flex flex-col justify-between rounded-3xl bg-white border p-6 sm:p-7 transition-all duration-300 ${
                tier.accentColor
              } ${isFilterMatch ? "opacity-100 ring-2 ring-blue-500/10" : "opacity-60"} shadow-lg`}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-linear-to-r from-[#0069d4] to-[#007AFF] text-white text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Most Popular
                </div>
              )}

              <div>
                {/* Header Tag */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                    {tier.badge}
                  </span>
                  <span className="text-xs font-semibold text-blue-600 font-mono">
                    {tier.unitsRange}
                  </span>
                </div>

                <h3 className="text-2xl font-black text-slate-950 tracking-tight">
                  {tier.name}
                </h3>

                {/* Price Display */}
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-xs font-semibold text-slate-500">KES</span>
                  <span className="text-4xl font-extrabold tracking-tight text-slate-950">
                    {tier.id === "enterprise" && billingCycle === "monthly"
                      ? "12,000"
                      : displayPrice.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500">/mo</span>
                </div>

                {billingCycle === "annual" && (
                  <p className="mt-1 text-[11px] text-emerald-600 font-semibold">
                    Billed annually (Save KES {(tier.monthlyPrice - tier.annualPrice) * 12}/yr)
                  </p>
                )}

                <p className="mt-3 text-xs leading-relaxed text-slate-600 border-b border-slate-100 pb-4">
                  {tier.highlight}
                </p>

                {/* Feature List */}
                <ul className="mt-5 space-y-2.5 text-xs text-slate-700">
                  {tier.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5">
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-100 text-emerald-600 shrink-0 mt-0.5">
                        <Check className="h-2.5 w-2.5 stroke-3" />
                      </span>
                      <span className={fIdx === 0 ? "font-bold text-slate-900" : ""}>
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleSelect(tier)}
                  className={`w-full py-3 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${tier.buttonClass}`}
                >
                  <span>Choose {tier.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* Trust & Guarantee Banner */}
      <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50/80 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#007AFF]/10 text-[#007AFF] shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-950">
              30-Day Risk-Free Guarantee &amp; Free Onboarding
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Every plan includes a free 14-day trial. Our Nairobi support team will help you import your existing tenant Excel sheets for free.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-semibold text-slate-500">Need a custom quote?</span>
          <a
            href="tel:0790264792"
            className="px-4 py-2 rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-800 hover:bg-slate-100 transition"
          >
            Call Sales: 0790264792
          </a>
        </div>
      </div>
    </div>
  );
}
