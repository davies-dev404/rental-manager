import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trackOnboardingLead, trackInitiateCheckout } from "@/lib/metaPixel";
import {
  Building2,
  Users,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  PlayCircle,
  CreditCard,
  Zap,
  Building,
  KeyRound,
  FileText,
  DollarSign,
  ChevronRight,
  RefreshCw
} from "lucide-react";

export default function OnboardingWizard({ onComplete }) {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState("landlord");
  const [unitsCount, setUnitsCount] = useState(15);
  const [billingCycle, setBillingCycle] = useState("monthly"); // "monthly" | "annual"
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pricing calculation based on units count
  const calculatePricing = (units) => {
    let monthlyPrice = 1500;
    let tier = "Starter Tier";

    if (units <= 10) {
      monthlyPrice = 1500;
      tier = "Starter Portfolio";
    } else if (units <= 30) {
      monthlyPrice = 3000;
      tier = "Growth Portfolio";
    } else if (units <= 70) {
      monthlyPrice = 6000;
      tier = "Professional Portfolio";
    } else if (units <= 150) {
      monthlyPrice = 10000;
      tier = "Commercial Portfolio";
    } else {
      monthlyPrice = 15000;
      tier = "Enterprise Portfolio";
    }

    const annualPrice = Math.round(monthlyPrice * 12 * 0.8); // 20% discount
    return {
      tier,
      monthly: monthlyPrice,
      annual: annualPrice,
      activePrice: billingCycle === "monthly" ? monthlyPrice : annualPrice
    };
  };

  const pricing = calculatePricing(unitsCount);

  // Handle Finishing Onboarding
  const handleFinish = async (mode) => {
    setIsSubmitting(true);
    try {
      // 1. Meta Pixel Lead Tracking
      trackOnboardingLead(selectedRole, unitsCount, pricing.tier);
      if (mode === "live") {
        trackInitiateCheckout(pricing.tier, pricing.activePrice);
      }

      // 2. Submit to backend API
      const response = await api.submitOnboarding({
        role: selectedRole,
        unitsCount: unitsCount,
        subscriptionTier: pricing.tier,
        mode: mode // 'demo' or 'live'
      });

      // 3. Update localStorage session
      const stored = localStorage.getItem("rental_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        const updated = {
          ...parsed,
          hasCompletedOnboarding: true,
          onboardingRole: selectedRole,
          unitsCount: unitsCount,
          subscriptionTier: pricing.tier,
          isDemoMode: mode === "demo"
        };
        localStorage.setItem("rental_user", JSON.stringify(updated));
        if (updateProfile) {
          updateProfile(updated).catch(() => {});
        }
      }

      toast({
        title: mode === "demo" ? "Demo Mode Activated! 🚀" : "Workspace Activated! 🎉",
        description:
          mode === "demo"
            ? "Your account is now seeded with sample Kenyan properties, tenants, and M-Pesa payments (MakaziFlow Sample Mode)."
            : "Your live rental management workspace is ready."
      });

      if (onComplete) {
        onComplete(mode);
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error("Onboarding error:", err);
      // Fallback: update local storage so user isn't stuck
      const stored = localStorage.getItem("rental_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.hasCompletedOnboarding = true;
        parsed.isDemoMode = mode === "demo";
        localStorage.setItem("rental_user", JSON.stringify(parsed));
      }
      toast({
        title: mode === "demo" ? "Demo Mode Initialized" : "Welcome to MakaziFlow",
        description: "Your workspace has been prepared."
      });
      if (onComplete) onComplete(mode);
      else window.location.reload();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Banner */}
        <div className="bg-[#0b1065] text-white p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-outfit font-extrabold text-2xl tracking-tight">
                  Makazi<span className="text-[#00a99d]">Flow</span>
                </span>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] font-semibold uppercase tracking-wider">
                  Quick Setup
                </Badge>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm">
                Welcome, {user?.name || "Landlord"}! Let's tailor your rental management workspace in just 2 minutes.
              </p>
            </div>

            {/* Step Counter */}
            <div className="flex items-center gap-2 self-start sm:self-auto bg-white/10 px-3 py-1.5 rounded-full border border-white/15 text-xs font-medium">
              <span className={`w-2 h-2 rounded-full ${step >= 1 ? "bg-[#00a99d]" : "bg-white/30"}`} />
              <span>Step {step} of 3</span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* ────────────────── STEP 1: ROLE SELECTION ────────────────── */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  How will you be using MakaziFlow?
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Select your primary role so we can configure permissions, reports, and dashboards.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Landlord Card */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("landlord")}
                  className={`p-5 rounded-xl border text-left transition-all relative ${
                    selectedRole === "landlord"
                      ? "border-[#0b1065] bg-blue-50/60 dark:bg-blue-950/30 shadow-md ring-2 ring-[#0b1065]/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                  }`}
                >
                  {selectedRole === "landlord" && (
                    <CheckCircle2 className="w-5 h-5 text-[#0b1065] dark:text-blue-400 absolute top-4 right-4" />
                  )}
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-[#0b1065] dark:text-blue-300 mb-3">
                    <Building className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Landlord</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    I own properties and want automated rent collection, tenant tracking, and profit reports.
                  </p>
                </button>

                {/* Property Manager Card */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("manager")}
                  className={`p-5 rounded-xl border text-left transition-all relative ${
                    selectedRole === "manager"
                      ? "border-[#0b1065] bg-blue-50/60 dark:bg-blue-950/30 shadow-md ring-2 ring-[#0b1065]/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                  }`}
                >
                  {selectedRole === "manager" && (
                    <CheckCircle2 className="w-5 h-5 text-[#0b1065] dark:text-blue-400 absolute top-4 right-4" />
                  )}
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300 mb-3">
                    <Users className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Property Manager / Agency</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    I manage buildings on behalf of property owners, handle commissions, and dispatch statements.
                  </p>
                </button>

                {/* Caretaker Card */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("caretaker")}
                  className={`p-5 rounded-xl border text-left transition-all relative ${
                    selectedRole === "caretaker"
                      ? "border-[#0b1065] bg-blue-50/60 dark:bg-blue-950/30 shadow-md ring-2 ring-[#0b1065]/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                  }`}
                >
                  {selectedRole === "caretaker" && (
                    <CheckCircle2 className="w-5 h-5 text-[#0b1065] dark:text-blue-400 absolute top-4 right-4" />
                  )}
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-300 mb-3">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Caretaker / Officer</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    I manage on-site tasks, water/power meter logging, repairs, and tenant move-in/move-out.
                  </p>
                </button>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  onClick={() => setStep(2)}
                  className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs font-semibold px-6 h-10 shadow-sm cursor-pointer"
                >
                  Next: Portfolio Size & Pricing <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* ────────────────── STEP 2: UNITS & SUBSCRIPTION CALCULATOR ────────────────── */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  How many units are you going to manage?
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  We calculate your subscription amount transparently based on your portfolio size.
                </p>
              </div>

              {/* Units Presets */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Quick Select or Type Units:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {[
                    { label: "1 - 10 Units", value: 10 },
                    { label: "11 - 25 Units", value: 25 },
                    { label: "26 - 50 Units", value: 50 },
                    { label: "51 - 100 Units", value: 100 },
                    { label: "150+ Units", value: 180 }
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setUnitsCount(preset.value)}
                      className={`py-2.5 px-3 rounded-lg border text-xs font-semibold transition-all ${
                        unitsCount === preset.value
                          ? "bg-[#0b1065] text-white border-[#0b1065] shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom Number Input & Slider */}
                <div className="pt-2 flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="250"
                    value={unitsCount}
                    onChange={(e) => setUnitsCount(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0b1065]"
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={unitsCount}
                      onChange={(e) => setUnitsCount(Math.max(1, Number(e.target.value)))}
                      className="w-20 px-2.5 py-1.5 text-center font-bold text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                    />
                    <span className="text-xs text-muted-foreground">Units</span>
                  </div>
                </div>
              </div>

              {/* Pricing Breakdown Card */}
              <div className="border border-blue-200 dark:border-blue-900 bg-linear-to-br from-blue-50/70 to-teal-50/40 dark:from-blue-950/30 dark:to-teal-950/20 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase font-extrabold tracking-wider text-blue-700 dark:text-blue-300">
                        {pricing.tier}
                      </span>
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                        Up to {unitsCount} Units
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Includes M-Pesa automated reconciliation, SMS receipts, KRA eTIMS, and tenant ledgers.
                    </p>
                  </div>

                  {/* Monthly / Annual Toggle */}
                  <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setBillingCycle("monthly")}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        billingCycle === "monthly"
                          ? "bg-[#0b1065] text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle("annual")}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                        billingCycle === "annual"
                          ? "bg-[#0b1065] text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Annual <span className="text-[10px] text-emerald-600 font-bold">-20%</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-100 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#0d2240] dark:text-white">
                      KES {pricing.activePrice.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / {billingCycle === "monthly" ? "month" : "year (billed annually)"}
                    </span>
                  </div>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ 30-Day Money-Back Guarantee
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="text-xs h-10 px-4"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs font-semibold px-6 h-10 shadow-sm cursor-pointer"
                >
                  Next: Choose Workspace Mode <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* ────────────────── STEP 3: WORKSPACE MODE (DEMO VS LIVE) ────────────────── */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  How would you like to get started?
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose Demo Mode to explore with pre-filled sample Kenyan properties, or start Live.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Option B: DEMO MODE (Recommended) */}
                <div className="border-2 border-[#00a99d] bg-linear-to-b from-[#00a99d]/5 to-transparent rounded-2xl p-6 flex flex-col justify-between space-y-5 relative shadow-md">
                  <div className="absolute -top-3 left-6 bg-[#00a99d] text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    Recommended to Explore
                  </div>

                  <div className="space-y-3 pt-1">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-[#00a99d] flex items-center justify-center">
                      <PlayCircle className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      Explore in Demo Mode
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Pre-populates your account with realistic sample Kenyan rental data (Kilimani, Westlands & Roysambu), tenant leases, M-Pesa payments, and arrears.
                    </p>
                    <ul className="text-xs space-y-1.5 text-slate-700 dark:text-slate-300 font-medium pt-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00a99d] shrink-0" />
                        <span>3 pre-configured Kenyan apartment properties</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00a99d] shrink-0" />
                        <span>7 active tenants with M-Pesa payment receipts</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00a99d] shrink-0" />
                        <span>Reset or switch to live mode anytime with 1 click</span>
                      </li>
                    </ul>
                  </div>

                  <Button
                    onClick={() => handleFinish("demo")}
                    disabled={isSubmitting}
                    className="w-full bg-[#00a99d] hover:bg-[#008f85] text-white font-bold text-xs h-11 shadow-md cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Seeding Demo Portfolio…
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4" /> Start in Demo Mode (MakaziFlow)
                      </span>
                    )}
                  </Button>
                </div>

                {/* Option A: LIVE SUBSCRIPTION */}
                <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-6 flex flex-col justify-between space-y-5">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-[#0b1065] dark:text-blue-300 flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      Start Clean & Subscribe
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Enter your live workspace directly with a fresh, empty portfolio ready to add your real properties, units, and tenants.
                    </p>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                        <span>Selected Plan:</span>
                        <span>{pricing.tier} ({unitsCount} Units)</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Amount:</span>
                        <span className="font-semibold text-blue-600">
                          KES {pricing.activePrice.toLocaleString()} / {billingCycle === "monthly" ? "mo" : "yr"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => handleFinish("live")}
                    disabled={isSubmitting}
                    className="w-full border-[#0b1065] text-[#0b1065] hover:bg-blue-50 dark:border-blue-400 dark:text-blue-300 font-bold text-xs h-11 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Preparing Workspace…
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <span>Proceed to Live Workspace</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="text-xs h-10 px-4"
                >
                  Back
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  You can change your plan or toggle demo data anytime from Settings.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
