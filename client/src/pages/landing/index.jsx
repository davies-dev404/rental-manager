import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import SEO from "@/components/SEO";
import {
  Building2,
  Users,
  CheckCircle2,
  ArrowRight,
  Play,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  MessageSquare,
  CreditCard,
  FileText,
  DollarSign,
  TrendingUp,
  Wrench,
  Receipt,
  Star,
  PhoneCall,
  Calendar,
  Send,
  Zap,
  Lock,
  Clock,
  Layers,
  HelpCircle,
  X,
  Droplet,
  Trash2,
  PieChart,
  ShieldCheck,
  Search,
  Sparkles,
  Bot,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MakaziFlowShowcase from "@/components/public/MakaziFlowShowcase";
import PricingPlans from "@/components/public/PricingPlans";
import CountryPhoneInput from "@/components/public/CountryPhoneInput";
import { useToast } from "@/hooks/use-toast";

/**
 * Signature 4-pointed sparkle icon matching Savannah Informatics style:
 * Central 4-pointed concave diamond with accent starlets in vivid orange (#ff5722 / #ea580c).
 */
export function SavannahSparkle({ className = "w-3.5 h-3.5 text-[#ff5722]" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2C12.4 7.2 16.8 11.6 22 12C16.8 12.4 12.4 16.8 12 22C11.6 16.8 7.2 12.4 2 12C7.2 11.6 11.6 7.2 12 2Z"
        fill="currentColor"
      />
      <path
        d="M19.5 3.5C19.7 5 21 6.3 22.5 6.5C21 6.7 19.7 8 19.5 9.5C19.3 8 18 6.7 16.5 6.5C18 6.3 19.3 5 19.5 3.5Z"
        fill="currentColor"
      />
      <circle cx="4.5" cy="19.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Active audience tab for "Why Choose Us / Solutions"
  const [activeTab, setActiveTab] = useState("landlord");

  // Testimonial slider index
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  // Accordion open items for FAQs
  const [openFaqs, setOpenFaqs] = useState({ 0: true });

  // Schedule Demo form
  const [demoForm, setDemoForm] = useState({
    name: "",
    email: "",
    phone: "",
    countryCode: "KE",
    role: "landlord",
    units: "1-20",
    message: ""
  });
  const [isSubmittingDemo, setIsSubmittingDemo] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  // Quick MakaaziBot banner trigger helper
  const handleLaunchBot = (prompt = "") => {
    window.dispatchEvent(
      new CustomEvent("open-makaazibot", {
        detail: prompt ? { prompt } : {}
      })
    );
    const el = document.getElementById("open-ai-chat-btn");
    if (el) el.click();
  };

  // Navigation handlers
  const handleGetStarted = (plan = "") => {
    if (user) {
      setLocation("/dashboard");
    } else {
      setLocation(`/login?mode=signup${plan ? `&plan=${plan}` : ""}`);
    }
  };

  const handleSignIn = () => {
    if (user) {
      setLocation("/dashboard");
    } else {
      setLocation("/login");
    }
  };

  const toggleFaq = (idx) => {
    setOpenFaqs((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleDemoSubmit = (e) => {
    e.preventDefault();
    if (!demoForm.name.trim() || !demoForm.email.trim() || !demoForm.phone.trim()) {
      toast({
        variant: "destructive",
        title: "Required Fields Missing",
        description: "Please enter your name, email, and phone number."
      });
      return;
    }

    setIsSubmittingDemo(true);
    setTimeout(() => {
      setIsSubmittingDemo(false);
      setDemoSubmitted(true);
      toast({
        title: "Demo Request Received! 🎉",
        description: `Thank you, ${demoForm.name}. A MakaziFlow specialist will contact you on ${demoForm.phone} shortly.`
      });
    }, 700);
  };

  // Audience Tabs data
  const audienceTabs = [
    {
      id: "landlord",
      label: "Landlords",
      badge: "Individual & Multi-Property Owners",
      cards: [
        {
          icon: <BellIcon className="h-5 w-5" />,
          title: "Collect on time — automatically",
          description: "Reminders, receipts, and reconciliation run in the background so you do not have to chase payments or verify fake M-Pesa SMS."
        },
        {
          icon: <ChartIcon className="h-5 w-5" />,
          title: "Know who's paid (and who hasn't)",
          description: "Clear arrears views, exportable Excel reports, and quick filters keep you in complete control across every unit."
        },
        {
          icon: <Clock className="h-5 w-5" />,
          title: "Free your time",
          description: "Spend fewer hours on tedious manual administration and more on growing your rental property portfolio."
        }
      ]
    },
    {
      id: "manager",
      label: "Property Managers",
      badge: "Agencies & Portfolio Operators",
      cards: [
        {
          icon: <TrendingUp className="h-5 w-5" />,
          title: "Boost collections & cashflow",
          description: "Automate payment tracking, instant receipts, late penalties, and full audit trails across multiple client estates."
        },
        {
          icon: <FileText className="h-5 w-5" />,
          title: "Real-time landlord remittance reports",
          description: "One-click owner statements, deduction breakdowns, and sharable dashboards keep clients informed and happy."
        },
        {
          icon: <Layers className="h-5 w-5" />,
          title: "Scale without extra administrative hires",
          description: "Standardise estate processes, assign field caretakers with restricted permissions, and manage 5x more units."
        }
      ]
    },
    {
      id: "service",
      label: "Service Charge",
      badge: "Gated Communities & Estate Committees",
      cards: [
        {
          icon: <Receipt className="h-5 w-5" />,
          title: "Automated billing & receipts",
          description: "Generate and send SMS invoices and instant receipts for estate levies with no manual paperwork or lost slips."
        },
        {
          icon: <CreditCard className="h-5 w-5" />,
          title: "Integrated payments, auto-posted",
          description: "Card, mobile money, and bank payments sync back to member accounts automatically with zero double entry."
        },
        {
          icon: <PieChart className="h-5 w-5" />,
          title: "Clear balances & statements",
          description: "Real-time member records and one-click statements eliminate disputes and keep estates transparent."
        }
      ]
    },
    {
      id: "water",
      label: "Water Billing",
      badge: "Sub-Meter & Utility Providers",
      cards: [
        {
          icon: <Droplet className="h-5 w-5" />,
          title: "Meter-based invoices, automated",
          description: "Generate accurate bills from previous and current meter readings and send via SMS with no spreadsheet formulas."
        },
        {
          icon: <FileText className="h-5 w-5" />,
          title: "Instant SMS receipts",
          description: "Customers receive instant automated payment confirmation upon M-Pesa dispatch with live meter statements."
        },
        {
          icon: <ChartIcon className="h-5 w-5" />,
          title: "Balances & arrears at a glance",
          description: "See who has paid and who has not, export consumption summaries, and close the month without confusion."
        }
      ]
    },
    {
      id: "garbage",
      label: "Garbage Collection",
      badge: "Waste & Sanitation Operators",
      cards: [
        {
          icon: <Receipt className="h-5 w-5" />,
          title: "Automated monthly client billing",
          description: "Send recurring monthly collection invoices by SMS, track payments instantly, and reduce missed collections."
        },
        {
          icon: <CreditCard className="h-5 w-5" />,
          title: "Payments auto-posted",
          description: "Mobile money and bank payments sync back to accounts automatically with no manual ledger reconciliations."
        },
        {
          icon: <PieChart className="h-5 w-5" />,
          title: "Clear arrears & route reports",
          description: "Real-time client records and one-click collection sheets keep field collection teams fully aligned."
        }
      ]
    }
  ];

  const currentTabObj = audienceTabs.find((t) => t.id === activeTab) || audienceTabs[0];

  // Testimonials data
  const testimonials = [
    {
      quote: "Greatly built product with lots of use for a landlord who prefers to self-manage their properties. The team is very responsive and helpful. Glad to have found MakaziFlow!",
      name: "Elvis Ochieng",
      role: "Property Owner • Nairobi",
      initials: "EO",
      rating: 5
    },
    {
      quote: "Before MakaziFlow I used spreadsheets and manual invoicing, which made it tedious to trace utilities alongside rent. I needed invoicing and utility billing but MakaziFlow does a lot more.",
      name: "Laura Anindo",
      role: "Estate Manager • Kiambu",
      initials: "LA",
      rating: 5
    },
    {
      quote: "The best software for managing rent collection in Kenya. View statements, send balance reminders, and receive messages on your mobile device without chasing tenants.",
      name: "CPA Titus Onsase",
      role: "Financial Auditor & Landlord",
      initials: "TO",
      rating: 5
    },
    {
      quote: "Simple to use yet comprehensive and very reliable for property management. I would recommend it to real estate companies and independent landlords across East Africa.",
      name: "John Nangiro",
      role: "Director, Rift Properties",
      initials: "JN",
      rating: 5
    },
    {
      quote: "An efficient, excellent tool to help landlords and managers account for every coin. Safaricom M-Pesa automated posting is a true game changer.",
      name: "Tuikong Allan",
      role: "Residential Landlord • Eldoret",
      initials: "TA",
      rating: 5
    },
    {
      quote: "After using more than six platforms that were complex and ineffective, MakaziFlow simplified our entire operations. Thank you MakaziFlow Team!",
      name: "James Siambi",
      role: "Property Manager • Mombasa",
      initials: "JS",
      rating: 5
    }
  ];

  // Auto-advancing testimonials carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialIdx((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  // FAQs
  const faqs = [
    {
      q: "What is MakaziFlow?",
      a: "MakaziFlow is easy-to-use property management software for landlords and property managers in Kenya and across Africa. It automates rent collection, invoicing, tenant records, utility sub-metering, and communication to help you save time and maximize your rental income."
    },
    {
      q: "How does the Safaricom M-Pesa Daraja integration work?",
      a: "MakaziFlow connects securely with your existing M-Pesa Paybill or Buy Goods Till. Whenever a tenant pays rent, the transaction is automatically matched to their specific room or unit in seconds, issuing an instant branded SMS receipt and updating your ledger in real time."
    },
    {
      q: "Are the generated tenancy lease agreements compliant with Kenyan law?",
      a: "Yes. All digital tenancy agreements generated on MakaziFlow comply with standard Kenyan rental laws (including Landlord & Tenant Act requirements). Agreements feature landlord digital stamps, emergency contact clauses, utility obligations, and digital signature pages."
    },
    {
      q: "Is my data safe and backed up?",
      a: "Your data is protected by bank-grade 256-bit SSL encryption, granular role-based permissions, and automated cloud backups. Only authorized administrators and caretakers can access your property records."
    },
    {
      q: "Can I migrate my existing Excel data into MakaziFlow?",
      a: "Yes! MakaziFlow provides free 1-click Excel and CSV tenant/property migration. Our support specialists can also help you import your existing tenant rosters and arrears ledgers at no charge."
    },
    {
      q: "Do you provide support and on-site staff training?",
      a: "Yes, our Nairobi-based support team is available via email (support@makaziflow.com), WhatsApp, and phone (+254 711 000 555) from 8:00 AM to 7:00 PM (EAT). We also offer live Zoom and in-person staff onboarding."
    },
    {
      q: "Can I get a free trial before paying?",
      a: "Yes! Every new account comes with a full-featured 14-day free trial. No credit card is required to get started."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-950 font-sans antialiased selection:bg-[#2546e8] selection:text-white">
      <SEO
        title="MakaziFlow - Property Management Software in Kenya & Africa"
        canonicalPath="/"
        description="MakaziFlow is Kenya and Africa's premier automated property management software. Effortlessly manage tenants, automate M-Pesa rent reconciliation, track expenses, handle maintenance, and generate financial reports."
      />

      {/* ────────────────── 1. HEADER (Shared PublicNavbar) ────────────────── */}
      <PublicNavbar />

      {/* ────────────────── 2. HERO SECTION (Savannah Informatics Aesthetic) ────────────────── */}
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-[#f8faff] via-white to-white px-4 pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
        {/* Subtle decorative background gradient glows */}
        <div className="pointer-events-none absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-blue-100/40 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-0 h-80 w-80 rounded-full bg-indigo-50/50 blur-3xl" />

        <div className="mx-auto w-full max-w-7xl sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.1fr)]">
            
            {/* Left: Hero Copy and CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="min-w-0 text-center lg:text-left"
            >
              {/* Badges Container — Showcasing BOTH requested pill badges */}
              <div className="mb-6 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
                
                {/* 1. Solid Cobalt Blue Badge (User Screenshot #3) */}
                <div className="inline-flex items-center gap-2 rounded-full bg-[#2546e8] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:brightness-110 transition select-none">
                  <SavannahSparkle className="w-3.5 h-3.5 text-[#ff5722]" />
                  <span>MakaziFlow</span>
                </div>

                {/* 2. Light Periwinkle Badge with Orange Sparkle (User Screenshot #2) */}
                <div className="inline-flex items-center gap-2 rounded-full bg-[#eef1ff] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#2546e8] border border-[#d6defc] shadow-xs select-none">
                  <SavannahSparkle className="w-3.5 h-3.5 text-[#ff5722]" />
                  <span>WHO WE ARE</span>
                </div>

                {/* Status chip */}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Safaricom Daraja &amp; eTIMS Certified
                </span>
              </div>

              {/* Savannah-style Bold Typography */}
              <h1 className="text-[2.6rem] font-black tracking-[-0.04em] text-slate-950 sm:text-[3.3rem] sm:leading-[1.06] lg:text-[3.9rem] lg:leading-[1.03]">
                <span className="block text-slate-950">Smart Property Operations.</span>
                <span className="block bg-gradient-to-r from-[#2546e8] via-[#384ad3] to-[#00A99D] bg-clip-text text-transparent">
                  Effortless Rental Flow.
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-slate-600 sm:text-[1.15rem]">
                No more chasing late rent or reconciling fake M-Pesa receipts. MakaziFlow automates Safaricom Paybill collections, dispatches legal Kenyan PDF leases, calculates water sub-meters, and keeps your property records audit-ready.
              </p>

              {/* CTAs matching Savannah Informatics aesthetic */}
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
                <button
                  onClick={() => handleGetStarted()}
                  className="w-full sm:w-auto min-w-48 px-8 py-4 text-base font-bold rounded-full bg-[#2546e8] hover:bg-[#1d38c4] text-white active:scale-95 transition-all shadow-xl shadow-blue-600/25 cursor-pointer text-center flex items-center justify-center gap-2 group"
                >
                  <span>Start Free 14-Day Trial</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>

                <a
                  href="#contact-us"
                  className="w-full sm:w-auto min-w-40 px-8 py-4 text-base font-bold rounded-full border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 transition-all text-center cursor-pointer shadow-xs"
                >
                  Schedule Demo
                </a>
              </div>

              {/* Trust checklist */}
              <div className="mt-8 pt-6 border-t border-slate-200/80 flex flex-wrap items-center justify-center gap-5 text-xs text-slate-600 font-medium lg:justify-start">
                <span className="flex items-center gap-1.5 text-slate-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-[#2546e8]" />
                  Instant M-Pesa Daraja Sync
                </span>
                <span className="flex items-center gap-1.5 text-slate-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-[#2546e8]" />
                  Kenyan Tenancy Law PDF Leases
                </span>
                <span className="flex items-center gap-1.5 text-slate-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-[#2546e8]" />
                  Free 1-Click Excel Migration
                </span>
              </div>
            </motion.div>

            {/* Right: Bespoke MakaziFlow Product Cinema & Interactive Tour */}
            <div className="min-w-0">
              <MakaziFlowShowcase onGetStarted={() => handleGetStarted()} />
            </div>

          </div>
        </div>
      </section>

      {/* ────────────────── 3. MAKAAZIBOT INTERACTIVE BANNER (User Screenshot #1) ────────────────── */}
      <section className="bg-white px-4 py-4 sm:px-6 lg:px-8 border-b border-slate-100">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 border-l-[#00A99D] flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:shadow-md">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-bold text-xs sm:text-sm text-slate-900">
                  Stuck on something? Ask MakaaziBot
                </span>
                <button
                  type="button"
                  onClick={() => handleLaunchBot()}
                  className="text-xs text-[#2546e8] hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Ask MakaaziBot</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                <span className="italic">Try</span>
                <button
                  type="button"
                  onClick={() => handleLaunchBot("How do I add a payment?")}
                  className="text-[#2546e8] hover:underline bg-[#eef1ff] px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer"
                >
                  &ldquo;How do I add a payment?&rdquo;
                </button>
                <span className="text-slate-400">or</span>
                <button
                  type="button"
                  onClick={() => handleLaunchBot("How do I remove a tenant who has left?")}
                  className="text-[#2546e8] hover:underline bg-[#eef1ff] px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer"
                >
                  &ldquo;How do I remove a tenant who has left?&rdquo;
                </button>
                <button
                  type="button"
                  onClick={() => handleLaunchBot("How do I connect my Safaricom M-Pesa Paybill?")}
                  className="text-[#2546e8] hover:underline bg-[#eef1ff] px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer hidden lg:inline-block"
                >
                  &ldquo;How do I connect M-Pesa Paybill?&rdquo;
                </button>
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleLaunchBot()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2546e8] px-4 py-2 text-xs font-bold text-white hover:bg-[#1d38c4] transition shadow-xs cursor-pointer shrink-0"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Open MakaaziBot</span>
            </button>
          </div>
        </div>
      </section>

      {/* ────────────────── 4. "WHO WE ARE" SECTION (Savannah Informatics Signature) ────────────────── */}
      <section id="who-we-are" className="py-16 sm:py-24 border-b border-slate-200 bg-gradient-to-b from-white via-[#f9faff] to-white scroll-mt-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="mx-auto max-w-3xl text-center mb-14">
            {/* Exact Pill Badge from Screenshot #2 */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#eef1ff] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#2546e8] border border-[#d6defc] shadow-xs select-none">
              <SavannahSparkle className="w-3.5 h-3.5 text-[#ff5722]" />
              <span>WHO WE ARE</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950">
              Powering Kenya&apos;s Next-Generation Property Infrastructure
            </h2>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-600">
              Just as modern digital healthcare and telecommunications transform everyday lives, MakaziFlow bridges property owners, property managers, and tenants with seamless financial rails and automated compliance across Kenya.
            </p>
          </div>

          {/* 4 Impact Metric Cards — Savannah Informatics Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:shadow-md transition text-center flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-[#eef1ff] text-[#2546e8] flex items-center justify-center mb-3">
                <CreditCard className="w-6 h-6" />
              </div>
              <p className="text-3xl sm:text-4xl font-black text-slate-950">KES 500M+</p>
              <p className="mt-1 text-xs font-bold text-[#2546e8] uppercase tracking-wider">Processed Volume</p>
              <p className="mt-2 text-xs text-slate-500">Auto-reconciled via Safaricom M-Pesa with 0% manual errors.</p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:shadow-md transition text-center flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-[#eef1ff] text-[#2546e8] flex items-center justify-center mb-3">
                <Building2 className="w-6 h-6" />
              </div>
              <p className="text-3xl sm:text-4xl font-black text-slate-950">550+</p>
              <p className="mt-1 text-xs font-bold text-[#2546e8] uppercase tracking-wider">Estates &amp; Landlords</p>
              <p className="mt-2 text-xs text-slate-500">Active real estate portfolios operating smoothly on MakaziFlow.</p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:shadow-md transition text-center flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-[#eef1ff] text-[#2546e8] flex items-center justify-center mb-3">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-3xl sm:text-4xl font-black text-slate-950">20,000+</p>
              <p className="mt-1 text-xs font-bold text-[#2546e8] uppercase tracking-wider">Tenants Managed</p>
              <p className="mt-2 text-xs text-slate-500">Across Nairobi, Mombasa, Kisumu, Nakuru, Eldoret &amp; beyond.</p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:shadow-md transition text-center flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-[#eef1ff] text-[#2546e8] flex items-center justify-center mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <p className="text-3xl sm:text-4xl font-black text-slate-950">99.98%</p>
              <p className="mt-1 text-xs font-bold text-[#2546e8] uppercase tracking-wider">Platform Uptime</p>
              <p className="mt-2 text-xs text-slate-500">Bank-grade data encryption, hourly cloud backups, zero downtime.</p>
            </div>

          </div>

          {/* Savannah Informatics Ecosystem / Strategic Integrations Bar */}
          <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
            <p className="text-center text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
              Integrated With Kenya&apos;s Financial &amp; Regulatory Infrastructure
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-80 grayscale hover:grayscale-0 transition-all">
              <div className="flex items-center gap-2 font-black text-slate-800 text-sm sm:text-base">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                Safaricom M-Pesa Daraja
              </div>
              <div className="flex items-center gap-2 font-black text-slate-800 text-sm sm:text-base">
                <span className="h-3 w-3 rounded-full bg-blue-600" />
                Equity Bank EazzyBiz
              </div>
              <div className="flex items-center gap-2 font-black text-slate-800 text-sm sm:text-base">
                <span className="h-3 w-3 rounded-full bg-green-700" />
                KCB Buni Connect
              </div>
              <div className="flex items-center gap-2 font-black text-slate-800 text-sm sm:text-base">
                <span className="h-3 w-3 rounded-full bg-red-600" />
                KRA eTIMS Tax Compliant
              </div>
              <div className="flex items-center gap-2 font-black text-slate-800 text-sm sm:text-base">
                <span className="h-3 w-3 rounded-full bg-indigo-600" />
                Co-operative Bank API
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ────────────────── 5. "OUR PRODUCTS" / PLATFORM SUITE ────────────────── */}
      <section id="features" className="py-16 sm:py-24 border-b border-slate-200 bg-white scroll-mt-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="mx-auto max-w-3xl text-center mb-16">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#eef1ff] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#2546e8] border border-[#d6defc] shadow-xs select-none">
              <SavannahSparkle className="w-3.5 h-3.5 text-[#ff5722]" />
              <span>OUR PLATFORM</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950">
              An Integrated Operating System For Rental Properties
            </h2>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-600">
              Built ground-up for the Kenyan rental economy. Replace paper receipts and messy WhatsApp chats with six intelligent modules.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            
            {/* 1. M-Pesa Daraja Payment Sync */}
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              whileHover={{ y: -6 }}
              className="rounded-3xl border border-slate-200/90 bg-white p-7 text-left shadow-[0_12px_40px_rgba(15,23,42,0.05)] hover:shadow-xl transition-all border-b-4 border-b-[#2546e8] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#eef1ff] text-[#2546e8] flex items-center justify-center shadow-xs">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">01</span>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-wider mb-2">
                  Zero Manual Reconciliation
                </div>
                <h3 className="text-xl font-bold leading-snug text-slate-950">
                  Instant M-Pesa &amp; Bank Sync
                </h3>
                <p className="mt-2.5 text-[0.95rem] leading-relaxed text-slate-600">
                  Connect your existing M-Pesa Paybill or Buy Goods Till via Safaricom Daraja API. Tenant balances update automatically upon payment with instant branded SMS receipts.
                </p>

                {/* Feature Image Thumbnail */}
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 shadow-xs relative aspect-16/10 bg-slate-900 group">
                  <img
                    src="/features/feature-mpesa.jpg"
                    alt="Instant M-Pesa & Bank Sync"
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent pointer-events-none" />
                  <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-slate-900/85 px-2 py-0.5 rounded backdrop-blur-xs">
                    M-Pesa Auto-Posting
                  </span>
                </div>
              </div>
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Till, Paybill &amp; Banks</span>
                <span className="text-emerald-600 font-bold">100% Real-Time</span>
              </div>
            </motion.article>

            {/* 2. Kenyan Legal Tenancy Leases */}
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.08 }}
              whileHover={{ y: -6 }}
              className="rounded-3xl border border-slate-200/90 bg-white p-7 text-left shadow-[0_12px_40px_rgba(15,23,42,0.05)] hover:shadow-xl transition-all border-b-4 border-b-[#00A99D] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#e6fbf9] text-[#00A99D] flex items-center justify-center shadow-xs">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">02</span>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider mb-2">
                  Kenyan Tenancy Law Compliant
                </div>
                <h3 className="text-xl font-bold leading-snug text-slate-950">
                  Digital Corporate Leases &amp; Stamp
                </h3>
                <p className="mt-2.5 text-[0.95rem] leading-relaxed text-slate-600">
                  Generate professional residential and commercial tenancy agreements bearing your registered company name, landlord digital seal, and signature pages.
                </p>

                {/* Feature Image Thumbnail */}
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 shadow-xs relative aspect-16/10 bg-slate-900 group">
                  <img
                    src="/features/feature-invoices.jpg"
                    alt="Digital Corporate Leases & Stamp"
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent pointer-events-none" />
                  <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-slate-900/85 px-2 py-0.5 rounded backdrop-blur-xs">
                    Signed PDF Agreement
                  </span>
                </div>
              </div>
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Instant PDF Generation</span>
                <span className="text-blue-600 font-bold">Print &amp; E-Sign Ready</span>
              </div>
            </motion.article>

            {/* 3. Water & Utility Sub-Meter Billing */}
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.16 }}
              whileHover={{ y: -6 }}
              className="rounded-3xl border border-slate-200/90 bg-white p-7 text-left shadow-[0_12px_40px_rgba(15,23,42,0.05)] hover:shadow-xl transition-all border-b-4 border-b-cyan-500 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center shadow-xs">
                    <Droplet className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">03</span>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-800 text-[11px] font-bold uppercase tracking-wider mb-2">
                  Cubic Meter Sub-Billing
                </div>
                <h3 className="text-xl font-bold leading-snug text-slate-950">
                  Automated Water &amp; Power Billing
                </h3>
                <p className="mt-2.5 text-[0.95rem] leading-relaxed text-slate-600">
                  Enter previous and current meter readings; MakaziFlow computes exact consumption and appends it to the tenant&apos;s monthly rent invoice automatically.
                </p>

                {/* Feature Image Thumbnail */}
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 shadow-xs relative aspect-16/10 bg-slate-900 group">
                  <img
                    src="/features/feature-utilities.jpg"
                    alt="Automated Water & Power Billing"
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent pointer-events-none" />
                  <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-slate-900/85 px-2 py-0.5 rounded backdrop-blur-xs">
                    Sub-Meter Calculator
                  </span>
                </div>
              </div>
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Water, Power &amp; Service Charge</span>
                <span className="text-cyan-700 font-bold">Auto-Appended</span>
              </div>
            </motion.article>

            {/* 4. Automated Tenant WhatsApp Notices */}
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.24 }}
              whileHover={{ y: -6 }}
              className="rounded-3xl border border-slate-200/90 bg-white p-7 text-left shadow-[0_12px_40px_rgba(15,23,42,0.05)] hover:shadow-xl transition-all border-b-4 border-b-emerald-500 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">04</span>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-2">
                  WhatsApp &amp; SMS Integration
                </div>
                <h3 className="text-xl font-bold leading-snug text-slate-950">
                  Automated Tenant Reminders
                </h3>
                <p className="mt-2.5 text-[0.95rem] leading-relaxed text-slate-600">
                  Send polite rent reminders on the 1st and 5th of every month. Tenants receive clear breakdowns via WhatsApp &amp; SMS with direct M-Pesa payment options.
                </p>

                {/* Feature Image Thumbnail */}
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 shadow-xs relative aspect-16/10 bg-slate-900 group">
                  <img
                    src="/features/feature-whatsapp.jpg"
                    alt="Automated Tenant Reminders"
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent pointer-events-none" />
                  <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-slate-900/85 px-2 py-0.5 rounded backdrop-blur-xs">
                    Verified WhatsApp Bot
                  </span>
                </div>
              </div>
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Higher Collection Rates</span>
                <span className="text-emerald-600 font-bold">95%+ On-Time Rent</span>
              </div>
            </motion.article>

            {/* 5. Caretaker & Staff Role Permissions */}
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.32 }}
              whileHover={{ y: -6 }}
              className="rounded-3xl border border-slate-200/90 bg-white p-7 text-left shadow-[0_12px_40px_rgba(15,23,42,0.05)] hover:shadow-xl transition-all border-b-4 border-b-indigo-500 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                    <Users className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">05</span>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 text-[11px] font-bold uppercase tracking-wider mb-2">
                  Staff Role Segregation
                </div>
                <h3 className="text-xl font-bold leading-snug text-slate-950">
                  Tenant KYC &amp; Staff Controls
                </h3>
                <p className="mt-2.5 text-[0.95rem] leading-relaxed text-slate-600">
                  Centralized tenant profiles and digital lease directories. Empower ground caretakers to log maintenance and meter readings without exposing owner financials.
                </p>

                {/* Feature Image Thumbnail */}
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 shadow-xs relative aspect-16/10 bg-slate-900 group">
                  <img
                    src="/features/feature-tenants.jpg"
                    alt="Tenant KYC & Staff Controls"
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent pointer-events-none" />
                  <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-slate-900/85 px-2 py-0.5 rounded backdrop-blur-xs">
                    Tenant KYC Profile
                  </span>
                </div>
              </div>
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Multi-User Access Control</span>
                <span className="text-indigo-600 font-bold">Safe &amp; Secure</span>
              </div>
            </motion.article>

            {/* 6. Monthly Remittance & Tax Reports */}
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.4 }}
              whileHover={{ y: -6 }}
              className="rounded-3xl border border-slate-200/90 bg-white p-7 text-left shadow-[0_12px_40px_rgba(15,23,42,0.05)] hover:shadow-xl transition-all border-b-4 border-b-[#2546e8] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#eef1ff] text-[#2546e8] flex items-center justify-center shadow-xs">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">06</span>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold uppercase tracking-wider mb-2">
                  Owner Payouts &amp; Audit Ready
                </div>
                <h3 className="text-xl font-bold leading-snug text-slate-950">
                  Landlord Remittance &amp; Tax Exports
                </h3>
                <p className="mt-2.5 text-[0.95rem] leading-relaxed text-slate-600">
                  Generate professional landlord remittance statements with one click, showing gross rent, management fees, expenses, and net payout ready for KRA eTIMS.
                </p>

                {/* Cashflow Mini Visual */}
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 shadow-xs relative aspect-16/10 bg-[#09152b] p-3 text-white flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-mono">Gross Rent</span>
                    <span className="text-cyan-300 font-bold">KES 1,840,000</span>
                  </div>
                  <svg className="w-full h-12" viewBox="0 0 200 40" fill="none">
                    <path
                      d="M0,35 Q30,30 60,22 T120,16 T160,8 T200,4"
                      stroke="#00D2B4"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle cx="200" cy="4" r="3" fill="#00D2B4" />
                  </svg>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                    <span>Landlord Net Payout</span>
                    <span className="text-emerald-400 font-bold">KES 1,692,800</span>
                  </div>
                </div>
              </div>
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Excel &amp; PDF Exports</span>
                <span className="text-[#2546e8] font-bold">Audit-Ready</span>
              </div>
            </motion.article>

          </div>
        </div>
      </section>

      {/* ────────────────── 6. "WHO WE SERVE" (Interactive Audience Switcher) ────────────────── */}
      <section id="why-choose-us" className="py-16 sm:py-24 border-b border-slate-200 bg-[#f8faff] scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          
          <div className="mx-auto max-w-3xl text-center mb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#eef1ff] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#2546e8] border border-[#d6defc] shadow-xs select-none">
              <SavannahSparkle className="w-3.5 h-3.5 text-[#ff5722]" />
              <span>WHO WE SERVE</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950">
              Tailored Solutions For Every Stakeholder
            </h2>
            <p className="mt-3 text-base sm:text-lg text-slate-600">
              Select your role to explore the tailored operational benefits engineered for your daily workflow.
            </p>
          </div>

          {/* Savannah-style Audience Tabs */}
          <div className="mx-auto flex flex-wrap items-center justify-center gap-2.5 sm:gap-3" role="tablist">
            {audienceTabs.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-5 py-2.5 text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? "bg-[#2546e8] text-white shadow-md shadow-blue-600/25"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isSelected ? "bg-white" : "bg-slate-300"
                    }`}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Audience Cards Grid */}
          <div className="mt-12">
            <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
              {currentTabObj.cards.map((card, idx) => (
                <motion.article
                  key={idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.08 }}
                  whileHover={{ y: -6 }}
                  className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-[0_10px_35px_rgba(15,23,42,0.05)] hover:shadow-xl transition-all flex flex-col justify-between border-t-4 border-t-[#2546e8]"
                >
                  <div>
                    <div className="mb-5 inline-grid h-14 w-14 place-items-center rounded-2xl bg-[#eef1ff] text-[#2546e8] shadow-xs">
                      {card.icon}
                    </div>
                    <h4 className="text-xl font-bold leading-snug text-slate-950">
                      {card.title}
                    </h4>
                    <p className="mt-3.5 text-[1.02rem] leading-relaxed text-slate-600">
                      {card.description}
                    </p>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>

          {/* Bottom tab CTA */}
          <div className="mt-10 text-center">
            <button
              onClick={() => handleGetStarted()}
              className="inline-flex items-center gap-2 rounded-full bg-[#2546e8] hover:bg-[#1d38c4] px-7 py-3.5 text-sm font-bold text-white transition cursor-pointer shadow-md shadow-blue-600/20"
            >
              <span>Get started for {currentTabObj.label}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* ────────────────── 7. PRICING & PLANS (Starting from KES 1,500) ────────────────── */}
      <section id="pricing" className="py-16 sm:py-24 border-b border-slate-200 bg-white scroll-mt-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="mx-auto max-w-4xl text-center mb-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#eef1ff] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#2546e8] border border-[#d6defc] shadow-xs select-none">
              <SavannahSparkle className="w-3.5 h-3.5 text-[#ff5722]" />
              <span>TRANSPARENT PRICING</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950">
              Plans Starting From <span className="text-[#2546e8]">KES 1,500</span> / Month
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-base sm:text-lg leading-relaxed text-slate-600">
              Straightforward pricing tailored for Kenyan landlords and management companies. Every plan includes automated M-Pesa Daraja reconciliation, Kenyan PDF lease generation, and tenant SMS alerts.
            </p>
          </div>

          {/* Pricing Component with Unit Selector and Annual Discount */}
          <PricingPlans onSelectPlan={(plan, cycle) => handleGetStarted(plan, cycle)} />

        </div>
      </section>

      {/* ────────────────── 8. CLIENT TESTIMONIALS (Auto-Gliding Carousel) ────────────────── */}
      <section className="py-16 sm:py-24 border-b border-slate-200 bg-gradient-to-b from-[#f8faff] to-white">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col items-center gap-3 text-center mb-12">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#eef1ff] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#2546e8] border border-[#d6defc] shadow-xs select-none">
              <SavannahSparkle className="w-3.5 h-3.5 text-[#ff5722]" />
              <span>CLIENT STORIES</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
              Trusted By Landlords &amp; Managers Across Kenya
            </h2>
            <p className="text-base text-slate-600 max-w-xl">
              Discover how landlords eliminate arrears and save hours of manual admin every single month.
            </p>
          </div>

          {/* Testimonial Active Display Card with Auto-Gliding Carousel */}
          <div className="max-w-3xl mx-auto overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.article
                key={testimonialIdx}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="flex flex-col rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-[0_10px_35px_rgba(15,23,42,0.06)] min-h-56"
              >
                <div className="mb-4 flex items-center gap-1 text-[0.95rem] text-amber-400">
                  {[...Array(testimonials[testimonialIdx].rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-base sm:text-xl leading-[1.65] text-slate-900 font-medium italic">
                  &ldquo;{testimonials[testimonialIdx].quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3 pt-5 border-t border-slate-100">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-[#2546e8] text-sm font-bold text-white shrink-0 shadow-sm">
                    {testimonials[testimonialIdx].initials}
                  </div>
                  <div>
                    <p className="font-bold text-slate-950 text-base">
                      {testimonials[testimonialIdx].name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {testimonials[testimonialIdx].role}
                    </p>
                  </div>
                </div>
              </motion.article>
            </AnimatePresence>

            {/* Progress indicator dots */}
            <div className="mt-6 flex justify-center gap-2">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTestimonialIdx(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                    testimonialIdx === idx ? "w-8 bg-[#2546e8]" : "w-2.5 bg-slate-300 hover:bg-slate-400"
                  }`}
                  aria-label={`Go to testimonial ${idx + 1}`}
                />
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ────────────────── 9. FAQS ACCORDION ────────────────── */}
      <section id="faqs" className="py-16 sm:py-24 border-b border-slate-200 bg-white scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          
          <div className="mx-auto max-w-3xl text-center mb-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#eef1ff] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#2546e8] border border-[#d6defc] shadow-xs select-none">
              <SavannahSparkle className="w-3.5 h-3.5 text-[#ff5722]" />
              <span>FREQUENTLY ASKED QUESTIONS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
              Got Questions? We&apos;ve Got Answers.
            </h2>
            <p className="mt-2 text-base text-slate-600">
              Everything you need to know about setting up MakaziFlow for your properties.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = !!openFaqs[idx];
              return (
                <article
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer hover:bg-slate-50/70 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span className="text-[1.05rem] font-bold text-slate-950">
                      {faq.q}
                    </span>
                    <span
                      className={`flex h-6 w-6 items-center justify-center text-slate-600 transition-transform duration-200 shrink-0 ${
                        isOpen ? "rotate-180 text-[#2546e8]" : ""
                      }`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 px-6 py-5 text-[0.98rem] leading-7 text-slate-600 bg-slate-50/50">
                      {faq.a}
                    </div>
                  )}
                </article>
              );
            })}
          </div>

        </div>
      </section>

      {/* ────────────────── 10. SCHEDULE DEMO FORM & CONSULTATION ────────────────── */}
      <section id="contact-us" className="py-16 sm:py-24 border-b border-slate-200 bg-[#f8faff] scroll-mt-20">
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#eef1ff] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#2546e8] border border-[#d6defc] shadow-xs select-none">
              <SavannahSparkle className="w-3.5 h-3.5 text-[#ff5722]" />
              <span>GET IN TOUCH</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
              Schedule A Live Personalized Demo
            </h2>
            <p className="mt-2 text-base text-slate-600 max-w-lg mx-auto">
              Our Nairobi product specialists will walk you through automated M-Pesa setup, lease generation, and Excel data migration.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-lg shadow-slate-200/50">
            {demoSubmitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-bold">
                  ✓
                </div>
                <h3 className="text-2xl font-bold text-slate-950">
                  Demo Request Confirmed!
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Thank you, <strong>{demoForm.name}</strong>. A MakaziFlow onboarding specialist will contact you on <strong>{demoForm.phone}</strong> shortly to arrange your personalized walkthrough.
                </p>
                <div className="pt-3">
                  <button
                    onClick={() => handleGetStarted()}
                    className="px-8 py-3.5 text-sm font-bold rounded-full bg-[#2546e8] hover:bg-[#1d38c4] text-white transition cursor-pointer shadow-md shadow-blue-600/25"
                  >
                    Start Free Trial Now
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="grid gap-4">
                
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Samuel Mutua"
                    value={demoForm.name}
                    onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none placeholder:text-slate-400 transition focus:border-[#2546e8] focus:ring-2 focus:ring-[#2546e8]/20"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. samuel@example.com"
                    value={demoForm.email}
                    onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none placeholder:text-slate-400 transition focus:border-[#2546e8] focus:ring-2 focus:ring-[#2546e8]/20"
                  />
                </div>

                {/* Phone number with country code selector — world flags */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Phone Number (M-Pesa / WhatsApp)
                  </label>
                  <CountryPhoneInput
                    phone={demoForm.phone}
                    countryCode={demoForm.countryCode}
                    onChangePhone={(phone) => setDemoForm({ ...demoForm, phone })}
                    onChangeCountry={(countryCode) => setDemoForm({ ...demoForm, countryCode })}
                    required
                    placeholder="0712 345678"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    I am a ...
                  </label>
                  <select
                    value={demoForm.role}
                    onChange={(e) => setDemoForm({ ...demoForm, role: e.target.value })}
                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-[#2546e8] focus:ring-2 focus:ring-[#2546e8]/20 cursor-pointer"
                  >
                    <option value="landlord">Landlord (Individual / Multi-Unit Owner)</option>
                    <option value="property manager">Property Management Company / Agency</option>
                    <option value="service charge biller">Gated Community / Estate Committee</option>
                    <option value="water billing company">Water Billing Company / Sub-Meter Operator</option>
                    <option value="garbage collection company">Garbage &amp; Sanitation Operator</option>
                    <option value="accountant">Real Estate Accountant / Auditor</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Number of Units */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Number of Units or Tenants
                  </label>
                  <select
                    value={demoForm.units}
                    onChange={(e) => setDemoForm({ ...demoForm, units: e.target.value })}
                    className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-[#2546e8] focus:ring-2 focus:ring-[#2546e8]/20 cursor-pointer"
                  >
                    <option value="1-20">1 - 20 Units</option>
                    <option value="21-50">21 - 50 Units</option>
                    <option value="50-200">50 - 200 Units</option>
                    <option value="200+">200+ Units (Enterprise Portfolio)</option>
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Specific Requirements or Questions (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tell us about your properties or current management challenges..."
                    value={demoForm.message}
                    onChange={(e) => setDemoForm({ ...demoForm, message: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 outline-none placeholder:text-slate-400 transition focus:border-[#2546e8] focus:ring-2 focus:ring-[#2546e8]/20"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmittingDemo}
                  className="mt-2 inline-flex min-h-12 items-center justify-center rounded-full bg-[#2546e8] hover:bg-[#1d38c4] px-8 text-base font-bold text-white transition disabled:opacity-60 cursor-pointer shadow-lg shadow-blue-600/25"
                >
                  {isSubmittingDemo ? "Submitting Request..." : "Request Live Demo"}
                </button>
              </form>
            )}
          </div>

        </div>
      </section>

      {/* ────────────────── 11. FOOTER (Shared PublicFooter) ────────────────── */}
      <PublicFooter />

    </div>
  );
}

// Helper Bell icon
function BellIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22ZM20 17H4l1.67-1.67A3 3 0 0 0 7 13V9a5 5 0 0 1 10 0v4c0 .8.32 1.56.88 2.12L20 17Z" />
    </svg>
  );
}

// Helper Chart icon
function ChartIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M4 19h16v2H4v-2Zm1-7h3v5H5v-5Zm5-4h3v9h-3V8Zm5 2h3v7h-3v-7Z" />
    </svg>
  );
}
