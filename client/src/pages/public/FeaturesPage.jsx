import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import {
  CreditCard,
  FileText,
  Users,
  MessageSquare,
  Wrench,
  TrendingUp,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";

export default function FeaturesPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      setLocation("/dashboard");
    } else {
      setLocation("/login?mode=signup");
    }
  };

  const featureItems = [
    {
      num: "01",
      title: "Rent Utility/Fee Collection",
      desc: "We integrate with popular payment methods such as Mobile Money (M-Pesa Paybill & Till) and Banks. Then, payments are automatically recorded on our system and we alert you on the specific tenant who has paid. Eliminates headaches of tenants lying about payments or losing receipts.",
      bullets: [
        "Instant M-Pesa Paybill & Till auto-reconciliation",
        "Direct Bank transfer matching",
        "Automated tenant ledger posting"
      ],
      icon: <CreditCard className="w-6 h-6 text-blue-600" />,
      tag: "Automated Collections",
      badge: "Safaricom Daraja API Sync",
      image: "/features/feature-mpesa.jpg",
      reverse: false
    },
    {
      num: "02",
      title: "Invoice/Receipt Management",
      desc: "Go paperless with SMS & WhatsApp invoices and receipts. You can easily generate branded invoices and receipts on our platform bearing your property or company name and dispatch them to tenants instantly.",
      bullets: [
        "Corporate branded PDF receipts with company logo",
        "Automated SMS & WhatsApp payment notifications",
        "Itemized rent, deposit, and utilities breakdown"
      ],
      icon: <FileText className="w-6 h-6 text-blue-600" />,
      tag: "Paperless Billing",
      badge: "Kenyan Tenancy Law Compliant Lease",
      image: "/features/feature-invoices.jpg",
      reverse: true
    },
    {
      num: "03",
      title: "Updated Tenant Records",
      desc: "Digitized and accurate tenant records and account balances that are easy to sort through and maintain. Helps quickly resolve tenant disputes around account balances by keeping track of all tenant invoices and payments.",
      bullets: [
        "Centralized tenant directory with ID & KYC files",
        "Corporate lease agreements with digital signing",
        "Complete payment and arrears history logs"
      ],
      icon: <Users className="w-6 h-6 text-blue-600" />,
      tag: "Tenant Management",
      badge: "KYC & Digital Lease Records",
      image: "/features/feature-tenants.jpg",
      reverse: false
    },
    {
      num: "04",
      title: "SMS & WhatsApp Services",
      desc: "Easily communicate with tenants using SMS and WhatsApp on tenant balances, announcements, and so much more from the comfort of your home/office.",
      bullets: [
        "Scheduled payment reminders before due date",
        "Overdue payment follow-ups on autopilot",
        "Bulk estate announcements in 1 click"
      ],
      icon: <MessageSquare className="w-6 h-6 text-blue-600" />,
      tag: "Smart Communication",
      badge: "Verified WhatsApp & SMS Delivery",
      image: "/features/feature-whatsapp.jpg",
      reverse: true
    },
    {
      num: "05",
      title: "Automate Management Tasks",
      desc: "Save time by automating repetitive tasks such as reminding tenants to pay, recording payments, tracking work orders, and sending receipts. Allowing you to easily scale and manage more properties.",
      bullets: [
        "Tenant maintenance tickets & vendor dispatch",
        "Water & electricity sub-meter readings",
        "Move-in and move-out inspections"
      ],
      icon: <Wrench className="w-6 h-6 text-blue-600" />,
      tag: "Task Automation",
      badge: "Sub-Meter Calculator & Work Orders",
      image: "/features/feature-utilities.jpg",
      reverse: false
    },
    {
      num: "06",
      title: "Reports and Statements",
      desc: "Quickly generate tenant, property, and landlord statements with the click of a button. Real-time cashflow, occupancy rates, and tax calculations are always up to date.",
      bullets: [
        "1-Click landlord monthly remittance statements",
        "Profit & Loss and Expense breakdown reports",
        "Exportable Excel and PDF files for tax filing"
      ],
      icon: <TrendingUp className="w-6 h-6 text-blue-600" />,
      tag: "Financial Insights",
      badge: "Landlord Remittance & KRA eTIMS",
      image: null,
      reverse: true
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">
      <PublicNavbar />

      {/* Hero Banner */}
      <section className="bg-[#09152b] text-white py-16 sm:py-24 text-center px-4 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-64 bg-radial from-blue-600/20 via-cyan-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto space-y-4 relative z-10">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            Platform Features
          </h1>
          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Everything you need for property management and rent collection in one place — payments, records, communications, and reporting in sync at all times.
          </p>
        </div>
      </section>

      {/* Feature Alternating Sections */}
      <section className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20 sm:space-y-28">
        {featureItems.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: idx * 0.05 }}
            className={`grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center ${
              item.reverse ? "lg:grid-flow-dense" : ""
            }`}
          >
            {/* Visual Card / Illustration Frame */}
            <div
              className={`lg:col-span-5 ${
                item.reverse ? "lg:col-start-8" : ""
              }`}
            >
              {item.image ? (
                /* High-Res Product UI Screenshot Card */
                <div className="relative group overflow-hidden rounded-3xl shadow-xl transition-all duration-300 hover:shadow-2xl">
                  {/* Clean image — no top bar or overlays */}
                  <div className="relative overflow-hidden aspect-4/3">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105 rounded-3xl"
                      loading="lazy"
                    />
                  </div>
                </div>
              ) : (
                /* Feature 06: Bespoke Financial Dashboard Silhouette Card */
                <div className="relative group overflow-hidden rounded-3xl border border-slate-800 bg-[#09152b] shadow-2xl p-6 text-white text-left transition-all duration-300 hover:shadow-cyan-500/10">

                  {/* Metrics Summary */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                      <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Total Invoiced</div>
                      <div className="text-lg font-extrabold text-white mt-0.5">KES 1,840,000</div>
                      <div className="text-[11px] text-emerald-400 font-semibold mt-1">↑ 98.4% Collected</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-blue-950/50 border border-blue-800/50">
                      <div className="text-[11px] uppercase tracking-wider text-blue-300 font-bold">Net Remittance</div>
                      <div className="text-lg font-extrabold text-cyan-300 mt-0.5">KES 1,692,800</div>
                      <div className="text-[11px] text-blue-300 font-semibold mt-1">Paid to Owner</div>
                    </div>
                  </div>

                  {/* SVG Chart Silhouette */}
                  <div className="mt-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="font-semibold text-slate-300">Monthly Cashflow Trend</span>
                      <span className="text-emerald-400 font-bold">+14.2% MoM</span>
                    </div>
                    <svg className="w-full h-24" viewBox="0 0 320 80" fill="none">
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#007AFF" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#00D2B4" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,65 Q40,55 80,45 T160,35 T240,20 T320,10 L320,80 L0,80 Z"
                        fill="url(#chartGradient)"
                      />
                      <path
                        d="M0,65 Q40,55 80,45 T160,35 T240,20 T320,10"
                        stroke="#00D2B4"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <circle cx="80" cy="45" r="4" fill="#007AFF" stroke="#ffffff" strokeWidth="2" />
                      <circle cx="160" cy="35" r="4" fill="#007AFF" stroke="#ffffff" strokeWidth="2" />
                      <circle cx="240" cy="20" r="4" fill="#00D2B4" stroke="#ffffff" strokeWidth="2" />
                      <circle cx="320" cy="10" r="4" fill="#00D2B4" stroke="#ffffff" strokeWidth="2" />
                    </svg>
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>JUL</span><span>AUG</span><span>SEP</span><span>OCT</span><span>NOV</span><span>DEC</span>
                    </div>
                  </div>

                  {/* Remittance itemized tags */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">KRA eTIMS Tax Schedule</span>
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Audit Verified
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Content text */}
            <div
              className={`lg:col-span-7 space-y-5 ${
                item.reverse ? "lg:col-start-1" : ""
              }`}
            >
              <span className="text-xs font-bold text-blue-600 tracking-widest uppercase">
                FEATURE {item.num}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                {item.title}
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                {item.desc}
              </p>

              <div className="pt-2 space-y-2.5">
                {item.bullets.map((b, bIdx) => (
                  <div key={bIdx} className="flex items-center gap-2.5 text-sm sm:text-base font-medium text-slate-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center gap-4">
                <button
                  onClick={handleGetStarted}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1d1d1f] text-white hover:bg-slate-800 text-sm font-semibold transition cursor-pointer shadow-md"
                >
                  <span>Try It Free</span>
                  <ArrowRight className="w-4 h-4 text-cyan-400" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Pre-footer Call to Action */}
      <section className="bg-slate-50 border-t border-slate-200 py-16 text-center px-4">
        <div className="max-w-3xl mx-auto space-y-5">
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-950">
            Ready to experience effortless property management?
          </h3>
          <p className="text-base text-slate-600">
            Join over 550+ landlords and property managers using MakaziFlow across Kenya and Africa.
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
