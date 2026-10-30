import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import {
  CreditCard,
  Smartphone,
  Receipt,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Clock,
  Sparkles
} from "lucide-react";

export default function LandlordPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      setLocation("/dashboard");
    } else {
      setLocation("/login?mode=signup");
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="bg-[#09152b] text-white py-16 sm:py-24 text-center px-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/20 text-cyan-300 text-xs font-semibold uppercase tracking-wider border border-blue-400/20">
            <Sparkles className="w-3.5 h-3.5" />
            For Self-Managing Landlords
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            Manage Your Rentals on Autopilot
          </h1>
          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Eliminate late rent excuses, automate M-Pesa reconciliations, and get full control over your rental income without manual paperwork.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleGetStarted}
              className="px-8 py-3.5 text-base font-semibold rounded-full bg-white text-[#1f1f22] hover:bg-slate-100 transition shadow-lg cursor-pointer"
            >
              Start Free Trial
            </button>
            <a
              href="#landlord-benefits"
              className="px-7 py-3.5 text-base font-medium rounded-full border border-white/20 hover:bg-white/10 transition text-white"
            >
              Explore Landlord Benefits
            </a>
          </div>
        </div>
      </section>

      {/* Core Landlord Pillars */}
      <section id="landlord-benefits" className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950">
            Why Hundreds of Landlords Choose MakaziFlow
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Everything designed to save your time and maximize rental yield.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-950 mb-3">
                Collect on time — automatically
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                Reminders, receipts, and reconciliation run in the background so you do not have to chase payments. Tenants pay via M-Pesa Paybill, Till, or Bank.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-blue-600 flex items-center gap-1">
              <span>Automated M-Pesa C2B &amp; STK Push</span>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-950 mb-3">
                Know who&apos;s paid (and who hasn&apos;t)
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                Clear arrears views, exportable reports, and quick filters keep you in complete control of your financial position every single month.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-blue-600 flex items-center gap-1">
              <span>Live Balances &amp; Statement Export</span>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-950 mb-3">
                Free your time
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                Spend fewer hours on administrative headaches and more time acquiring properties and growing your passive rental income.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-blue-600 flex items-center gap-1">
              <span>Save 15+ Hours Every Month</span>
            </div>
          </article>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-50 border-t border-slate-200 py-16 text-center px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-950">
            Start managing your properties like a pro
          </h3>
          <p className="text-slate-600">
            All plans include a 14-day free trial. Setup takes less than 3 minutes.
          </p>
          <div className="pt-2">
            <button
              onClick={handleGetStarted}
              className="px-8 py-3.5 text-base font-semibold rounded-full bg-[#1d1d1f] text-white hover:bg-slate-800 transition cursor-pointer shadow-md inline-flex items-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
