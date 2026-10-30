import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import {
  TrendingUp,
  FileText,
  Layers,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Building2,
  ShieldCheck
} from "lucide-react";

export default function PropertyManagersPage() {
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
            For Property Management Companies &amp; Agencies
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            Scale Your Agency Without Adding Overhead
          </h1>
          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Manage multiple client portfolios, automate monthly landlord remittance statements, and manage 5x more units with the same team.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleGetStarted}
              className="px-8 py-3.5 text-base font-semibold rounded-full bg-white text-[#1f1f22] hover:bg-slate-100 transition shadow-lg cursor-pointer"
            >
              Get Started Free
            </button>
            <a
              href="/#contact-us"
              className="px-7 py-3.5 text-base font-medium rounded-full border border-white/20 hover:bg-white/10 transition text-white"
            >
              Schedule an Agency Demo
            </a>
          </div>
        </div>
      </section>

      {/* Agency Benefits Section */}
      <section className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950">
            Engineered for Modern Property Managers
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Powerful multi-client accounting, role permissions, and branded reporting in one unified hub.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-950 mb-3">
                Boost collections
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                Automate payment tracking, receipts, penalties, and audit trails across portfolios. Instant M-Pesa matching leaves zero room for discrepancies.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-blue-600 flex items-center gap-1">
              <span>Automatic M-Pesa &amp; Bank Reconciliations</span>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-950 mb-3">
                Real-time landlord reports
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                One-click statements and sharable dashboards keep clients informed and happy. Deduct management fees and utility bills before net disbursement.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-blue-600 flex items-center gap-1">
              <span>Automated Owner Remittance Statements</span>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-950 mb-3">
                Scale without extra hires
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                Standardise processes and manage 5 times more units with the same team. Grant role-based accounts to caretakers, accountants, and field staff.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-blue-600 flex items-center gap-1">
              <span>Unlimited User Accounts &amp; Permissions</span>
            </div>
          </article>
        </div>
      </section>

      {/* Pre-footer Call to Action */}
      <section className="bg-slate-50 border-t border-slate-200 py-16 text-center px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-950">
            Ready to upgrade your property management operations?
          </h3>
          <p className="text-slate-600">
            Book a 15-minute consultation or start your 14-day free trial right now.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleGetStarted}
              className="px-8 py-3.5 text-base font-semibold rounded-full bg-[#1d1d1f] text-white hover:bg-slate-800 transition cursor-pointer shadow-md inline-flex items-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
            </button>
            <a
              href="/#contact-us"
              className="px-7 py-3.5 text-base font-semibold rounded-full border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 transition cursor-pointer"
            >
              Schedule Live Demo
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
