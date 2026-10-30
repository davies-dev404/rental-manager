import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
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
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MakaziFlowShowcase from "@/components/public/MakaziFlowShowcase";
import PricingPlans from "@/components/public/PricingPlans";
import CountryPhoneInput from "@/components/public/CountryPhoneInput";
import { useToast } from "@/hooks/use-toast";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Active audience tab for "Why Choose Us"
  const [activeTab, setActiveTab] = useState("landlord");

  // Testimonial slider index
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  // Accordion open items for FAQs
  const [openFaqs, setOpenFaqs] = useState({ 0: true });

  // YouTube video player state
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);

  // Usecases dropdown state in navbar
  const [isUsecasesOpen, setIsUsecasesOpen] = useState(false);

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

  // Audience Tabs data matching the exact HTML code
  const audienceTabs = [
    {
      id: "landlord",
      label: "Landlord",
      cards: [
        {
          icon: <BellIcon className="h-5 w-5" />,
          title: "Collect on time — automatically",
          description: "Reminders, receipts, and reconciliation run in the background so you do not have to chase payments."
        },
        {
          icon: <ChartIcon className="h-5 w-5" />,
          title: "Know who's paid (and who hasn't)",
          description: "Clear arrears views, exportable reports, and quick filters keep you in control."
        },
        {
          icon: <Clock className="h-5 w-5" />,
          title: "Free your time",
          description: "Spend fewer hours on admin and more on growing your rental income."
        }
      ]
    },
    {
      id: "manager",
      label: "Property Manager",
      cards: [
        {
          icon: <TrendingUp className="h-5 w-5" />,
          title: "Boost collections",
          description: "Automate payment tracking, receipts, penalties, and audit trails across portfolios."
        },
        {
          icon: <FileText className="h-5 w-5" />,
          title: "Real-time landlord reports",
          description: "One-click statements and sharable dashboards keep clients informed and happy."
        },
        {
          icon: <Layers className="h-5 w-5" />,
          title: "Scale without extra hires",
          description: "Standardise processes and manage 5 times more units with the same team."
        }
      ]
    },
    {
      id: "service",
      label: "Service Charge",
      cards: [
        {
          icon: <Receipt className="h-5 w-5" />,
          title: "Automated billing & receipts",
          description: "Generate and send SMS invoices and instant receipts for estate levies with no manual paperwork."
        },
        {
          icon: <CreditCard className="h-5 w-5" />,
          title: "Integrated payments, auto-posted",
          description: "Card, mobile money, and bank payments sync back to member accounts automatically with no double entry."
        },
        {
          icon: <PieChart className="h-5 w-5" />,
          title: "Clear balances & statements",
          description: "Real-time member records and one-click statements reduce disputes and keep estates transparent."
        }
      ]
    },
    {
      id: "water",
      label: "Water Billing",
      cards: [
        {
          icon: <Droplet className="h-5 w-5" />,
          title: "Meter-based invoices, automated",
          description: "Generate accurate bills from readings and send via SMS with no spreadsheets or manual entry."
        },
        {
          icon: <FileText className="h-5 w-5" />,
          title: "Instant SMS receipts",
          description: "Customers get receipts automatically after payment and you see updates in real time."
        },
        {
          icon: <ChartIcon className="h-5 w-5" />,
          title: "Balances & arrears at a glance",
          description: "See who has paid and who has not, export reports, and close the month without confusion."
        }
      ]
    },
    {
      id: "garbage",
      label: "Garbage Collection",
      cards: [
        {
          icon: <Receipt className="h-5 w-5" />,
          title: "Automated client billing",
          description: "Send monthly invoices by SMS, track payments instantly, and reduce missed collections."
        },
        {
          icon: <CreditCard className="h-5 w-5" />,
          title: "Payments auto-posted",
          description: "Mobile money and bank payments sync back to accounts automatically with no double entry."
        },
        {
          icon: <PieChart className="h-5 w-5" />,
          title: "Clear arrears & reports",
          description: "Real-time client records and one-click reports keep teams aligned and month-end easy."
        }
      ]
    }
  ];

  const currentTabObj = audienceTabs.find((t) => t.id === activeTab) || audienceTabs[0];

  // Testimonials data matching exact quotes from the HTML
  const testimonials = [
    {
      quote: "Greatly built product with lots of use for a landlord who prefers to self-manage their properties. The team is very responsive and helpful. Glad to have found MakaziFlow!",
      name: "Elvis Ochieng",
      role: "1 year ago",
      initials: "EO",
      rating: 5
    },
    {
      quote: "Before MakaziFlow I used spreadsheets and manual invoicing, which made it tedious to trace utilities alongside rent. I needed invoicing and utility billing but MakaziFlow does a lot more.",
      name: "Laura Anindo",
      role: "2 years ago",
      initials: "LA",
      rating: 5
    },
    {
      quote: "The best software for managing rent collection. View statements, send balance reminders, and receive messages on your mobile device.",
      name: "CpaTitus Onsase",
      role: "2 years ago",
      initials: "TO",
      rating: 5
    },
    {
      quote: "Simple to use yet comprehensive and very reliable for property management. I would recommend it to real estate companies and landlords.",
      name: "John Nangiro",
      role: "1 year ago",
      initials: "JN",
      rating: 4
    },
    {
      quote: "An efficient, excellent tool to help landlords and managers account for every coin. A game changer indeed.",
      name: "Tuikong Allan",
      role: "2 years ago",
      initials: "TA",
      rating: 5
    },
    {
      quote: "After using more than six platforms that were complex and ineffective, MakaziFlow simplified my operations. Thank you MakaziFlow Team!",
      name: "James Siambi",
      role: "1 year ago",
      initials: "JS",
      rating: 5
    },
    {
      quote: "Wonderful experience so far. The system is user-friendly and support is effective and efficient.",
      name: "Vicky Gatobu",
      role: "2 years ago",
      initials: "VG",
      rating: 5
    }
  ];

  // Auto-advancing testimonials carousel (moves automatically without buttons)
  useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialIdx((prev) => (prev + 1) % testimonials.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  // FAQs exact data from the HTML
  const faqs = [
    {
      q: "What is MakaziFlow?",
      a: "MakaziFlow is easy-to-use property management software for landlords and property managers in Kenya and across Africa. It automates rent collection, invoicing, tenant records and communication to help you save time and maximize your rental income."
    },
    {
      q: "Is the software easy to use?",
      a: "Yes, our software is designed to be easy to use for landlords, property managers, and their tenants alike. The intuitive interface and user-friendly features make it simple to navigate and manage all aspects of your properties."
    },
    {
      q: "Do I have to pay for any upgrades done in the system?",
      a: "You do not have to pay for any upgrades made to the system. We continuously improve the software at no cost to you."
    },
    {
      q: "Is my data safe?",
      a: "Your data is safe. All data transmitted is SSL encrypted and all data is password protected so that only you and your authorized users have access to your data. We also hold backups on your data so that you never loose your data."
    },
    {
      q: "Do you provide support?",
      a: "Yes, we provide support through email (support@makaziflow.com) and phone (+254 711 000 555). You may contact us anytime between 8am-7pm (GMT+3, Kenyan time). Our team also offers training on how to use the system."
    },
    {
      q: "Can I get a free trial?",
      a: "Yes, we offer a free trial of our property management software so you can experience its benefits firsthand. Sign up for a free trial today and see how it can transform the way you manage your rentals."
    },
    {
      q: "Does the system have any downtimes?",
      a: "The system has no downtimes. We have backups for every part of our system so that there will be no interruption in service."
    },
    {
      q: "Can I communicate with tenants through the system?",
      a: "Yes you can communicate with tenants through the system to send announcements or send invoices and receipts."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-950 font-sans antialiased selection:bg-[#007AFF] selection:text-white">
      
      {/* ────────────────── 1. HEADER (Shared PublicNavbar) ────────────────── */}
      <PublicNavbar />

      {/* ────────────────── 2. HERO SECTION ────────────────── */}
      <section className="border-b border-slate-200 bg-linear-to-b from-blue-50/40 via-white to-white px-4 py-12 sm:py-16 lg:py-20">
        <div className="mx-auto w-full max-w-7xl sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)]">
            
            {/* Left: Hero Copy and CTAs */}
            <motion.div
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="min-w-0 text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-[#0069d4] text-xs font-bold uppercase tracking-wider mb-5">
                <span>Kenyan Real Estate On Autopilot</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF]" />
                <span className="text-emerald-700 font-extrabold">Plans from KES 1,500/mo</span>
              </div>

              <h1 className="text-[2.6rem] font-black tracking-[-0.04em] text-slate-950 sm:text-[3.3rem] sm:leading-[1.05] lg:text-[3.9rem] lg:leading-[1.02]">
                <span className="block text-slate-950">Smart Property Operations.</span>
                <span className="block bg-linear-to-r from-[#0069d4] via-[#007AFF] to-[#00A99D] bg-clip-text text-transparent">
                  Effortless Rental Flow.
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-[1.05rem] leading-8 text-slate-600 sm:text-[1.15rem]">
                No more chasing late rent or reconciling fake M-Pesa receipts. MakaziFlow automates Paybill collections, dispatches legal Kenyan PDF leases, calculates water sub-meters, and keeps your records audit-ready.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center lg:justify-start gap-4 sm:flex-row sm:gap-5">
                <button
                  onClick={() => handleGetStarted()}
                  className="w-full sm:w-auto min-w-44 px-8 py-4 text-base font-bold rounded-full bg-linear-to-r from-[#0069d4] to-[#007AFF] text-white hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-blue-500/25 cursor-pointer text-center flex items-center justify-center gap-2"
                >
                  <span>Start Free 14-Day Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="#pricing"
                  className="w-full sm:w-auto min-w-38 px-8 py-4 text-base font-bold rounded-full border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 transition-all text-center cursor-pointer shadow-xs"
                >
                  View Plans &amp; Pricing
                </a>
              </div>

              {/* Trust badges */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  M-Pesa Daraja Integration
                </span>
                <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Kenyan Tenancy Law PDF Leases
                </span>
                <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Free Excel Data Migration
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

      {/* ────────────────── 3. TRUSTED ACROSS AFRICA ────────────────── */}
      <section className="border-t border-slate-200 bg-white py-10 sm:py-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <h3 className="text-center text-[1.8rem] sm:text-[2.2rem] font-semibold tracking-tight text-slate-950">
            Trusted Across Africa
          </h3>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <article className="inline-flex items-center gap-2 rounded-full bg-[#e6f0fa] px-5 py-2.5 text-[0.98rem] sm:text-[1.05rem] font-semibold text-[#0069d4] shadow-[0_2px_4px_rgba(0,0,0,0.06)]">
              <span aria-hidden="true">✅</span>
              <span>550+ Landlords &amp; PMs</span>
            </article>

            <article className="inline-flex items-center gap-2 rounded-full bg-[#e6f0fa] px-5 py-2.5 text-[0.98rem] sm:text-[1.05rem] font-semibold text-[#0069d4] shadow-[0_2px_4px_rgba(0,0,0,0.06)]">
              <span aria-hidden="true">🏘️</span>
              <span>1,000+ Properties</span>
            </article>

            <article className="inline-flex items-center gap-2 rounded-full bg-[#e6f0fa] px-5 py-2.5 text-[0.98rem] sm:text-[1.05rem] font-semibold text-[#0069d4] shadow-[0_2px_4px_rgba(0,0,0,0.06)]">
              <span aria-hidden="true">👥</span>
              <span>20,000+ Tenants Managed</span>
            </article>
          </div>
        </div>
      </section>

      {/* ────────────────── 4. WHY CHOOSE US (Audience Tabs) ────────────────── */}
      <section id="why-choose-us" className="border-t border-slate-200 bg-white py-14 sm:py-18 scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          
          <h3 className="text-center text-[1.9rem] sm:text-[2.3rem] font-semibold tracking-tight text-slate-950">
            Why Choose Us
          </h3>
          <p className="mx-auto mt-3 max-w-3xl text-center text-[1.05rem] leading-8 text-slate-600 sm:text-[1.12rem]">
            Pick your role to see the benefits that matter most to you.
          </p>

          {/* Audience Tab Buttons */}
          <div className="mx-auto mt-8 flex max-w-6xl flex-wrap items-center justify-center gap-2.5 sm:gap-3" role="tablist">
            {audienceTabs.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-4 sm:px-5 py-2.5 sm:py-3 text-[0.92rem] sm:text-base font-medium transition cursor-pointer flex items-center ${
                    isSelected
                      ? "bg-[#0069d4] text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <span
                    className={`mr-2 inline-block h-2 w-2 rounded-full ${
                      isSelected ? "bg-white" : "bg-current opacity-40"
                    }`}
                  />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Audience Cards Grid (Huge Cards & Motion) */}
          <div className="mt-12">
            <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
              {currentTabObj.cards.map((card, idx) => (
                <motion.article
                  key={idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.08 }}
                  whileHover={{ y: -6, scale: 1.015 }}
                  className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-[0_10px_35px_rgba(15,23,42,0.06)] hover:shadow-xl transition-all flex flex-col justify-between border-t-4 border-t-[#007AFF]"
                >
                  <div>
                    <div className="mb-5 inline-grid h-14 w-14 place-items-center rounded-2xl bg-linear-to-tr from-blue-100 to-cyan-50 text-[#0069d4] shadow-xs">
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
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              <span>Get started for {currentTabObj.label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>

      {/* ────────────────── 5. CORE CAPABILITIES (Huge Cards & Framer Motion) ────────────────── */}
      <section id="features" className="py-20 sm:py-28 border-t border-slate-200 bg-white scroll-mt-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="mx-auto max-w-3xl text-center mb-16">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-100 text-[#0069d4] text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Engineered For African Real Estate
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950">
              Run Your Entire Portfolio On Autopilot
            </h2>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-600">
              Tailored for Kenyan estates and landlords: instant M-Pesa reconciliation, legal Kenyan PDF leases, caretaker permissions, and sub-meter water billing.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            
            {/* 1. M-Pesa Daraja Payment Sync */}
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="rounded-3xl border border-slate-200/90 bg-white p-7 text-left shadow-[0_12px_40px_rgba(15,23,42,0.06)] hover:shadow-2xl transition-all border-b-4 border-b-[#007AFF] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-linear-to-tr from-[#0069d4] to-[#00A99D] text-white flex items-center justify-center shadow-md">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-400">01</span>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-wider mb-2">
                  Zero Manual Reconciliation
                </div>
                <h3 className="text-xl font-bold leading-snug text-slate-950">
                  Instant M-Pesa &amp; Bank Sync
                </h3>
                <p className="mt-2.5 text-[0.95rem] leading-relaxed text-slate-600">
                  Connect your existing M-Pesa Paybill or Buy Goods Till via Safaricom Daraja API. Tenant balances update automatically upon payment with instant SMS receipts.
                </p>

                {/* Feature Image Thumbnail */}
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 shadow-xs relative aspect-16/10 bg-slate-900 group">
                  <img
                    src="/features/feature-mpesa.jpg"
                    alt="Instant M-Pesa & Bank Sync"
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-slate-950/60 to-transparent pointer-events-none" />
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
              whileHover={{ y: -8, scale: 1.02 }}
              className="rounded-3xl border border-slate-200/90 bg-white p-7 text-left shadow-[0_12px_40px_rgba(15,23,42,0.06)] hover:shadow-2xl transition-all border-b-4 border-b-[#00A99D] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-linear-to-tr from-[#00A99D] to-teal-400 text-white flex items-center justify-center shadow-md">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-400">02</span>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider mb-2">
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
                  <div className="absolute inset-0 bg-linear-to-t from-slate-950/60 to-transparent pointer-events-none" />
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
              whileHover={{ y: -8, scale: 1.02 }}
              className="rounded-3xl border border-slate-200/90 bg-white p-7 text-left shadow-[0_12px_40px_rgba(15,23,42,0.06)] hover:shadow-2xl transition-all border-b-4 border-b-cyan-500 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-linear-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center shadow-md">
                    <Droplet className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-400">03</span>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-cyan-50 text-cyan-800 text-[11px] font-bold uppercase tracking-wider mb-2">
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
                  <div className="absolute inset-0 bg-linear-to-t from-slate-950/60 to-transparent pointer-events-none" />
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
              whileHover={{ y: -8, scale: 1.02 }}
              className="rounded-3xl border border-slate-200/90 bg-white p-7 text-left shadow-[0_12px_40px_rgba(15,23,42,0.06)] hover:shadow-2xl transition-all border-b-4 border-b-emerald-500 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-linear-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-400">04</span>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-2">
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
                  <div className="absolute inset-0 bg-linear-to-t from-slate-950/60 to-transparent pointer-events-none" />
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
              whileHover={{ y: -8, scale: 1.02 }}
              className="rounded-3xl border border-slate-200/90 bg-white p-7 text-left shadow-[0_12px_40px_rgba(15,23,42,0.06)] hover:shadow-2xl transition-all border-b-4 border-b-indigo-500 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-linear-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-md">
                    <Users className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-400">05</span>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-800 text-[11px] font-bold uppercase tracking-wider mb-2">
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
                  <div className="absolute inset-0 bg-linear-to-t from-slate-950/60 to-transparent pointer-events-none" />
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
              whileHover={{ y: -8, scale: 1.02 }}
              className="rounded-3xl border border-slate-200/90 bg-white p-7 text-left shadow-[0_12px_40px_rgba(15,23,42,0.06)] hover:shadow-2xl transition-all border-b-4 border-b-[#0069d4] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-linear-to-tr from-[#0069d4] to-blue-600 text-white flex items-center justify-center shadow-md">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-400">06</span>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[11px] font-bold uppercase tracking-wider mb-2">
                  Owner Payouts &amp; Audit Ready
                </div>
                <h3 className="text-xl font-bold leading-snug text-slate-950">
                  Landlord Remittance &amp; Tax Exports
                </h3>
                <p className="mt-2.5 text-[0.95rem] leading-relaxed text-slate-600">
                  Generate professional landlord remittance statements with one click, showing gross rent, management fees, expenses, and net payout ready for KRA eTIMS.
                </p>

                {/* Silhouette / Cashflow Mini Visual */}
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
                <span className="text-blue-600 font-bold">Audit-Ready</span>
              </div>
            </motion.article>

          </div>
        </div>
      </section>

      {/* ────────────────── 6. TESTIMONIALS SLIDER ────────────────── */}
      <section className="py-16 sm:py-20 border-t border-slate-200 bg-slate-50/50">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950">
              What our users are saying
            </h2>
            <p className="text-sm text-slate-500 max-w-xl">
              Hear directly from landlords and property managers who streamlined their operations with MakaziFlow.
            </p>
          </div>

          {/* Testimonial Active Display Card with Auto-Gliding Carousel */}
          <div className="mt-8 max-w-3xl mx-auto overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.article
                key={testimonialIdx}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 sm:p-9 shadow-[0_8px_32px_rgba(15,23,42,0.06)] min-h-50"
              >
                <div className="mb-3 flex items-center gap-1 text-[0.95rem] text-amber-400">
                  {[...Array(testimonials[testimonialIdx].rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-base sm:text-lg leading-[1.65] text-slate-900 italic">
                  &ldquo;{testimonials[testimonialIdx].quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-slate-100 text-sm font-bold text-slate-600 shrink-0">
                    {testimonials[testimonialIdx].initials}
                  </div>
                  <div>
                    <p className="font-bold text-slate-950 text-sm sm:text-base">
                      {testimonials[testimonialIdx].name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {testimonials[testimonialIdx].role}
                    </p>
                  </div>
                </div>
              </motion.article>
            </AnimatePresence>

            {/* Subtle progress indicator dots */}
            <div className="mt-6 flex justify-center gap-2">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTestimonialIdx(idx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    testimonialIdx === idx ? "w-7 bg-[#0069d4]" : "w-2 bg-slate-300 hover:bg-slate-400"
                  }`}
                  aria-label={`Go to testimonial ${idx + 1}`}
                />
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ────────────────── 7. PRICING & PLANS (Starting from KES 1,500) ────────────────── */}
      <section id="pricing" className="py-16 sm:py-24 border-t border-slate-200 bg-linear-to-b from-white via-blue-50/20 to-white scroll-mt-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="mx-auto max-w-4xl text-center mb-12">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-[#0069d4] text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Fair &amp; Affordable Kenyan Pricing
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950">
              Plans Starting From <span className="text-[#007AFF]">KES 1,500</span> / Month
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-base sm:text-lg leading-relaxed text-slate-600">
              Choose your unit range below. All plans include automated M-Pesa reconciliation, tenant WhatsApp reminders, and Kenyan standard tenancy lease generator.
            </p>
          </div>

          {/* Interactive Pricing Component with Unit Selector and Annual Discount */}
          <PricingPlans onSelectPlan={(plan, cycle) => handleGetStarted(plan, cycle)} />

        </div>
      </section>

      {/* ────────────────── 8. CALL TO ACTION BANNER ────────────────── */}
      <section className="border-t border-slate-200 bg-white py-16 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            
            <h2 className="text-[2rem] sm:text-[2.85rem] font-semibold leading-tight tracking-tight text-slate-950">
              <span>It&apos;s Time to </span>
              <span style={{ color: "#007AFF" }}>Earn More</span>
              <span> From Your Rentals</span>
            </h2>

            <p className="mx-auto mt-4 max-w-3xl text-[1.12rem] leading-8 text-slate-700">
              Stop juggling spreadsheets and paperwork. Start growing your rental income today.
            </p>

            <p className="mx-auto mt-6 max-w-3xl text-[1.35rem] sm:text-[1.75rem] font-semibold leading-[1.55] text-slate-950">
              <span style={{ color: "#007AFF" }}>80%</span> of our users report a{" "}
              <span style={{ color: "#007AFF" }}>20%+</span> increase in rent collection within{" "}
              <span style={{ color: "#007AFF" }}>3 months</span>. Don&apos;t just take our word for it, try it today.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                onClick={() => handleGetStarted()}
                className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold rounded-full bg-[#1d1d1f] text-white hover:bg-slate-800 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                Get Started Free
              </button>

              <a
                href="#contact-us"
                className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold rounded-full border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
              >
                View Demo
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ────────────────── 9. FAQS ACCORDION ────────────────── */}
      <section id="faqs" className="py-16 sm:py-20 border-t border-slate-200 bg-white scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950">
              FAQs
            </h2>
          </div>

          <div className="mt-12 max-w-4xl mx-auto space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = !!openFaqs[idx];
              return (
                <article
                  key={idx}
                  className="rounded-[1.25rem] border border-slate-200 bg-white shadow-2xs overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer hover:bg-slate-50/50 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span className="text-[1.05rem] font-medium text-slate-950">
                      {faq.q}
                    </span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center text-slate-700 transition-transform duration-200 shrink-0 ${
                        isOpen ? "rotate-180 text-blue-600" : ""
                      }`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-200 px-6 py-5 text-[0.98rem] leading-7 text-slate-600 bg-slate-50/40">
                      {faq.a}
                    </div>
                  )}
                </article>
              );
            })}
          </div>

        </div>
      </section>

      {/* ────────────────── 10. SCHEDULE DEMO FORM ────────────────── */}
      <section id="contact-us" className="py-16 sm:py-20 border-t border-slate-200 bg-white scroll-mt-20">
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950">
              Schedule Demo
            </h2>
            <p className="mt-2 text-base text-slate-600">
              Feel free to reach out for any inquiries.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/80 bg-slate-50/60 p-6 sm:p-10 shadow-xs">
            {demoSubmitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-bold">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Demo Request Confirmed!
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Thank you, <strong>{demoForm.name}</strong>. Our team will contact you at <strong>{demoForm.phone}</strong> shortly to arrange your live personalized tour.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => handleGetStarted()}
                    className="px-6 py-2.5 text-xs font-bold rounded-full bg-[#1d1d1f] text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    Enter Software Now
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="grid gap-4">
                
                {/* Name */}
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={demoForm.name}
                  onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                  className="min-h-13 w-full rounded-2xl border border-slate-300/70 bg-white px-4 text-base text-slate-950 outline-none placeholder:text-slate-500 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />

                {/* Email */}
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={demoForm.email}
                  onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                  className="min-h-13 w-full rounded-2xl border border-slate-300/70 bg-white px-4 text-base text-slate-950 outline-none placeholder:text-slate-500 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />

                {/* Phone number with country code selector — world flags */}
                <CountryPhoneInput
                  phone={demoForm.phone}
                  countryCode={demoForm.countryCode}
                  onChangePhone={(phone) => setDemoForm({ ...demoForm, phone })}
                  onChangeCountry={(countryCode) => setDemoForm({ ...demoForm, countryCode })}
                  required
                  placeholder="0712 345678"
                />

                {/* Role */}
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">I am a ...</p>
                  <select
                    value={demoForm.role}
                    onChange={(e) => setDemoForm({ ...demoForm, role: e.target.value })}
                    className="min-h-13 w-full rounded-2xl border border-slate-300/70 bg-white px-4 text-base text-slate-950 outline-none placeholder:text-slate-500 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 cursor-pointer"
                  >
                    <option value="landlord">Landlord</option>
                    <option value="property manager">Property Manager</option>
                    <option value="student">Student</option>
                    <option value="accountant">Accountant</option>
                    <option value="water billing company">Water Billing Company</option>
                    <option value="service charge biller">Service Charge Biller</option>
                    <option value="garbage collection company">Garbage Collection Company</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Number of Units */}
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    Number of Rental Units or Customers
                  </p>
                  <select
                    value={demoForm.units}
                    onChange={(e) => setDemoForm({ ...demoForm, units: e.target.value })}
                    className="min-h-13 w-full rounded-2xl border border-slate-300/70 bg-white px-4 text-base text-slate-950 outline-none placeholder:text-slate-500 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 cursor-pointer"
                  >
                    <option value="1-20">1-20</option>
                    <option value="21-50">21-50</option>
                    <option value="50-200">50-200</option>
                    <option value="200+">200+</option>
                  </select>
                </div>

                {/* Message */}
                <textarea
                  rows={4}
                  placeholder="Your Message"
                  value={demoForm.message}
                  onChange={(e) => setDemoForm({ ...demoForm, message: e.target.value })}
                  className="rounded-2xl border border-slate-300/70 bg-white px-4 py-3.5 text-base text-slate-950 outline-none placeholder:text-slate-500 transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmittingDemo}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#1d1d1f] px-8 text-base font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 cursor-pointer shadow-md mt-2"
                >
                  {isSubmittingDemo ? "Submitting..." : "Submit"}
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
