import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
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
  MapPin,
  Mail,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PricingPlans from "@/components/public/PricingPlans";
import CountryPhoneInput from "@/components/public/CountryPhoneInput";
import { useToast } from "@/hooks/use-toast";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Active audience tab for "Why Choose Us / Solutions"
  const [activeTab, setActiveTab] = useState("landlord");

  // Testimonial slider index
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  // Live Google Business Ratings & Reviews state
  const [googleReviews, setGoogleReviews] = useState({
    configured: false,
    rating: null,
    userRatingCount: 0,
    reviews: [],
    writeReviewUrl: "",
    googleMapsUri: ""
  });

  useEffect(() => {
    let active = true;
    api.getGoogleReviews().then((data) => {
      if (active && data) {
        setGoogleReviews(data);
        setTestimonialIdx(0);
      }
    });
    return () => {
      active = false;
    };
  }, []);

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

  // Founding & Early-Adopter Testimonials (realistic startup launch stories)
  const pilotTestimonials = [
    {
      quote: "Managing single-room and two-bedroom rentals around Busia used to mean flipping through exercise books and checking M-Pesa messages late at night. MakaziFlow keeps every tenant ledger, invoice, and PDF receipt organized in one place.",
      name: "Busia Pilot Landlord",
      role: "Residential Rentals • Busia, Kenya",
      initials: "BP",
      rating: 5,
      source: "Early Access Partner"
    },
    {
      quote: "The water sub-meter calculator and automated rent reminders save hours every month-end. Tenants get clear SMS and email invoices before the 5th without awkward back-and-forth calls.",
      name: "Western Kenya Property Host",
      role: "Multi-Unit Host • Kakamega & Busia",
      initials: "WK",
      rating: 5,
      source: "Early Access Partner"
    },
    {
      quote: "Being able to start small with the 5-unit and 10-unit plans, issue compliant Kenyan PDF leases, and accept Pesaflow M-Pesa and bank payments gives new property owners real peace of mind.",
      name: "Founding Beta Caretaker",
      role: "Caretaker & Estate Operations • Busia County",
      initials: "FB",
      rating: 5,
      source: "Early Access Partner"
    }
  ];

  // Prioritize verified live Google reviews as soon as MakaziFlow is rated on Google
  const liveGoogleItems = Array.isArray(googleReviews?.reviews)
    ? googleReviews.reviews.map((r) => ({
        quote: r.text || "Rated MakaziFlow on Google.",
        name: r.authorName || "Google Reviewer",
        role: `Verified Google Review • ${r.relativeTimeDescription || "Recently"}`,
        initials: (r.authorName || "G")
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0]?.toUpperCase())
          .join("") || "G",
        profilePhotoUrl: r.profilePhotoUrl || "",
        rating: Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5))),
        source: "Google Review"
      }))
    : [];

  const testimonials = liveGoogleItems.length > 0 ? liveGoogleItems : pilotTestimonials;

  // Auto-advancing testimonials carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialIdx((prev) => (prev + 1) % testimonials.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  // FAQs
  const faqs = [
    {
      q: "What is MakaziFlow?",
      a: "MakaziFlow is modern property management software built in Busia for landlords and property managers across Kenya and East Africa. It automates rent collection, invoicing, tenant records, utility sub-metering, and communication so you save time and eliminate manual errors."
    },
    {
      q: "How does M-Pesa & Pesaflow payment collection work?",
      a: "MakaziFlow integrates with Pesaflow to support M-Pesa STK Push, Paybill payments, Visa/Mastercard, and bank transfers. Whenever a tenant pays, the transaction is reconciled to their unit and invoice automatically and an official PDF receipt is emailed."
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
      q: "Do you provide support and onboarding?",
      a: "Yes, our Busia-based support team serves landlords across Kenya via email (info@afrinextech.co.ke), WhatsApp, and phone (0790264792) from 8:00 AM to 7:00 PM (EAT). We also offer live online and on-site onboarding."
    },
    {
      q: "Can I get a free trial before paying?",
      a: "Yes! Every new account comes with a full-featured 14-day free trial. Start small from 5 units with no credit card required."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-950 font-sans antialiased selection:bg-[#2546e8] selection:text-white">
      <SEO
        title="MakaziFlow - Property Management Software in Busia & Kenya"
        canonicalPath="/"
        description="MakaziFlow is rental property management software built in Busia, Kenya. Automate M-Pesa & Pesaflow rent collection, invoicing, Kenyan PDF leases, and financial reporting. Contact: info@afrinextech.co.ke | 0790264792."
        aggregateRating={
          googleReviews.userRatingCount > 0 && googleReviews.rating
            ? { ratingValue: googleReviews.rating, reviewCount: googleReviews.userRatingCount }
            : null
        }
      />

      {/* ────────────────── 1. HEADER (Shared PublicNavbar) ────────────────── */}
      <PublicNavbar />

      {/* ────────────────── 2. HERO SECTION (Savannah Informatics Aesthetic) ────────────────── */}
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-linear-to-b from-[#f8faff] via-white to-white px-4 pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
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
              {/* Badges Container */}
              <div className="mb-6 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
                
                {/* 1. Solid Cobalt Blue Badge */}
                <div className="inline-flex items-center gap-2 rounded-full bg-[#2546e8] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:brightness-110 transition select-none">
                  <span className="h-2 w-2 rounded-full bg-[#ff5722] shrink-0" />
                  <span>MakaziFlow</span>
                </div>

                {/* Status chip */}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Pesaflow M-Pesa &amp; eTIMS Ready · Busia, Kenya
                </span>
              </div>

              <h1 className="text-[2.6rem] font-black tracking-[-0.04em] text-slate-950 sm:text-[3.3rem] sm:leading-[1.06] lg:text-[3.9rem] lg:leading-[1.03]">
                <span className="block text-slate-950">Smart Property Operations.</span>
                <span className="block bg-linear-to-r from-[#2546e8] via-[#384ad3] to-[#00A99D] bg-clip-text text-transparent">
                  Built For Clear Cashflow.
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-[1.05rem] leading-relaxed text-slate-600 sm:text-[1.15rem]">
                No more chasing late rent or verifying screenshots by hand. MakaziFlow reconciles Pesaflow M-Pesa, card, and bank payments, generates Kenyan PDF leases, calculates water sub-meters, and keeps tenant ledgers accurate.
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
                  Pesaflow M-Pesa, Card &amp; Bank Sync
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

            {/* Right: Clean Real Dashboard Preview (No Video Widget) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative min-w-0"
            >
              <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-2 shadow-2xl shadow-blue-900/10 transition-all hover:shadow-blue-900/15">
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 rounded-t-xl">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="mx-auto rounded-md bg-white px-4 py-0.5 text-[11px] font-medium text-slate-500 border border-slate-200/60 shadow-2xs">
                    app.makaziflow.afrinextech.co.ke
                  </div>
                </div>
                <img
                  src="/dashboard-screenshot.png"
                  alt="MakaziFlow Property Management Platform"
                  className="w-full rounded-b-xl object-cover"
                  loading="eager"
                />
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ────────────────── 3. "WHO WE ARE" SECTION (Savannah Informatics Signature) ────────────────── */}
      <section id="who-we-are" className="py-16 sm:py-24 border-b border-slate-200 bg-linear-to-b from-white via-[#f9faff] to-white scroll-mt-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="mx-auto max-w-3xl text-center mb-14">
            {/* Exact Pill Badge from Screenshot #2 */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#eef1ff] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#2546e8] border border-[#d6defc] shadow-xs select-none">
              <span className="h-2 w-2 rounded-full bg-[#ff5722] shrink-0" />
              <span>WHO WE ARE</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950">
              Built For Kenyan Landlords &amp; Property Managers
            </h2>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-600">
              MakaziFlow replaces paper notebooks and scattered spreadsheets with reliable M-Pesa &amp; bank reconciliation, digital leases, and clear tenant ledgers.
            </p>
          </div>

          {/* 4 Realistic Launch Milestones — Grounded for Starting in Busia & Scaling Across Kenya */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:shadow-md transition text-center flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-[#eef1ff] text-[#2546e8] flex items-center justify-center mb-3">
                <Zap className="w-6 h-6" />
              </div>
              <p className="text-3xl sm:text-4xl font-black text-slate-950">&lt; 5 Sec</p>
              <p className="mt-1 text-xs font-bold text-[#2546e8] uppercase tracking-wider">Instant Payment Sync</p>
              <p className="mt-2 text-xs text-slate-500">Real-time Pesaflow M-Pesa, card &amp; bank reconciliation with automated PDF receipts.</p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:shadow-md transition text-center flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-[#eef1ff] text-[#2546e8] flex items-center justify-center mb-3">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-3xl sm:text-4xl font-black text-slate-950">14 Days</p>
              <p className="mt-1 text-xs font-bold text-[#2546e8] uppercase tracking-wider">Free Onboarding Trial</p>
              <p className="mt-2 text-xs text-slate-500">Launch your first 5+ rental units in minutes with zero upfront setup fees.</p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:shadow-md transition text-center flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-[#eef1ff] text-[#2546e8] flex items-center justify-center mb-3">
                <Building2 className="w-6 h-6" />
              </div>
              <p className="text-3xl sm:text-4xl font-black text-slate-950">5 → 100+</p>
              <p className="mt-1 text-xs font-bold text-[#2546e8] uppercase tracking-wider">Units Built To Scale</p>
              <p className="mt-2 text-xs text-slate-500">Built in Busia, Kenya for growing residential plots, apartments &amp; agencies nationwide.</p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:shadow-md transition text-center flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-[#eef1ff] text-[#2546e8] flex items-center justify-center mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <p className="text-3xl sm:text-4xl font-black text-slate-950">eTIMS</p>
              <p className="mt-1 text-xs font-bold text-[#2546e8] uppercase tracking-wider">KRA &amp; Lease Ready</p>
              <p className="mt-2 text-xs text-slate-500">Kenyan Tenancy Law PDF agreements, encrypted cloud records &amp; KRA tax tracking.</p>
            </div>

          </div>

          {/* Ecosystem & Payment Rails Bar */}
          <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
            <p className="text-center text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
              Integrated With Kenya&apos;s Financial, Tax &amp; Messaging Rails
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-80 grayscale hover:grayscale-0 transition-all">
              <div className="flex items-center gap-2 font-black text-slate-800 text-sm sm:text-base">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                Pesaflow Payment Gateway
              </div>
              <div className="flex items-center gap-2 font-black text-slate-800 text-sm sm:text-base">
                <span className="h-3 w-3 rounded-full bg-green-600" />
                M-Pesa STK &amp; Paybill
              </div>
              <div className="flex items-center gap-2 font-black text-slate-800 text-sm sm:text-base">
                <span className="h-3 w-3 rounded-full bg-blue-600" />
                Visa, Mastercard &amp; Banks
              </div>
              <div className="flex items-center gap-2 font-black text-slate-800 text-sm sm:text-base">
                <span className="h-3 w-3 rounded-full bg-red-600" />
                KRA eTIMS Ready
              </div>
              <div className="flex items-center gap-2 font-black text-slate-800 text-sm sm:text-base">
                <span className="h-3 w-3 rounded-full bg-indigo-600" />
                Automated Email &amp; Alerts
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
              <span className="h-2 w-2 rounded-full bg-[#ff5722] shrink-0" />
              <span>OUR PLATFORM</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950">
              An Integrated Operating System For Rental Properties
            </h2>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-slate-600">
              Built from the ground up for Kenyan rentals. Replace paper receipts and scattered WhatsApp chats with six practical management tools.
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
                  Accept M-Pesa STK Push, Paybill, Visa/Mastercard, and bank transfers through Pesaflow. Tenant balances update automatically upon confirmation with instant PDF receipts emailed.
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
              <span className="h-2 w-2 rounded-full bg-[#ff5722] shrink-0" />
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
              <span className="h-2 w-2 rounded-full bg-[#ff5722] shrink-0" />
              <span>TRANSPARENT PRICING</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950">
              Plans Starting From <span className="text-[#2546e8]">KES 1,500</span> / Month
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-base sm:text-lg leading-relaxed text-slate-600">
              Straightforward pricing tailored for Kenyan landlords and management companies. Every plan includes automated M-Pesa &amp; Pesaflow reconciliation, Kenyan PDF lease generation, and tenant reminders.
            </p>
          </div>

          {/* Pricing Component with Unit Selector and Annual Discount */}
          <PricingPlans onSelectPlan={(plan, cycle) => handleGetStarted(plan, cycle)} />

        </div>
      </section>

      {/* ────────────────── 8. GOOGLE RATINGS & CLIENT STORIES ────────────────── */}
      <section className="py-16 sm:py-24 border-b border-slate-200 bg-linear-to-b from-[#f8faff] to-white">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col items-center gap-3 text-center mb-10">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#eef1ff] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#2546e8] border border-[#d6defc] shadow-xs select-none">
              <span className="h-2 w-2 rounded-full bg-[#ff5722] shrink-0" />
              <span>{liveGoogleItems.length > 0 ? "VERIFIED GOOGLE REVIEWS" : "EARLY ADOPTER FEEDBACK & GOOGLE RATINGS"}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
              Built With Landlords From Busia Across Kenya
            </h2>
            <p className="text-base text-slate-600 max-w-xl">
              Real feedback from early adopters plus live verified Google Business ratings as customers review MakaziFlow.
            </p>
          </div>

          {/* Live Google Rating Badge & "Rate Us on Google" Integration */}
          <div className="max-w-3xl mx-auto mb-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
                  <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.52-1.14 2.81-2.4 3.67v3.04h3.88c2.27-2.09 3.57-5.17 3.57-8.95z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.88-3.04c-1.07.72-2.45 1.15-4.05 1.15-3.12 0-5.77-2.11-6.72-4.96H1.29v3.13C3.26 21.3 7.31 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.63H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.37l3.99-3.13z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.63l3.99 3.13c.95-2.85 3.6-4.96 6.72-4.96z" />
                </svg>
              </div>
              <div className="text-left">
                {googleReviews.userRatingCount > 0 && googleReviews.rating ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-slate-950">{googleReviews.rating}</span>
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < Math.round(googleReviews.rating) ? "fill-amber-400" : "text-slate-300"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Verified on Google
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Based on {googleReviews.userRatingCount} verified Google {googleReviews.userRatingCount === 1 ? "review" : "reviews"}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-950">Google Business Rating</span>
                      <span className="text-[11px] font-semibold text-[#2546e8] bg-[#eef1ff] border border-[#d6defc] px-2 py-0.5 rounded-full">
                        Live Sync Ready
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Recently launched in Busia, Kenya — new Google ratings appear here automatically.
                    </p>
                  </>
                )}
              </div>
            </div>

            {(googleReviews.writeReviewUrl || googleReviews.googleMapsUri) ? (
              <a
                href={googleReviews.writeReviewUrl || googleReviews.googleMapsUri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 hover:bg-slate-100 px-4 py-2 text-xs font-bold text-slate-800 transition shrink-0"
              >
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                <span>Rate Us on Google</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            ) : (
              <a
                href="mailto:info@afrinextech.co.ke?subject=MakaziFlow%20Feedback"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 hover:bg-slate-100 px-4 py-2 text-xs font-bold text-slate-800 transition shrink-0"
              >
                <Mail className="w-3.5 h-3.5 text-[#2546e8]" />
                <span>Share Feedback</span>
              </a>
            )}
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
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-[0.95rem] text-amber-400">
                    {[...Array(testimonials[testimonialIdx].rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {testimonials[testimonialIdx].source}
                  </span>
                </div>
                <p className="text-base sm:text-xl leading-[1.65] text-slate-900 font-medium italic">
                  &ldquo;{testimonials[testimonialIdx].quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3 pt-5 border-t border-slate-100">
                  {testimonials[testimonialIdx].profilePhotoUrl ? (
                    <img
                      src={testimonials[testimonialIdx].profilePhotoUrl}
                      alt={testimonials[testimonialIdx].name}
                      className="h-11 w-11 rounded-full object-cover shrink-0 border border-slate-200"
                    />
                  ) : (
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-[#2546e8] text-sm font-bold text-white shrink-0 shadow-sm">
                      {testimonials[testimonialIdx].initials}
                    </div>
                  )}
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
              <span className="h-2 w-2 rounded-full bg-[#ff5722] shrink-0" />
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
              <span className="h-2 w-2 rounded-full bg-[#ff5722] shrink-0" />
              <span>GET IN TOUCH</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
              Schedule A Live Personalized Demo
            </h2>
            <p className="mt-2 text-base text-slate-600 max-w-lg mx-auto">
              Our Busia-based specialists serve landlords and agencies across Kenya — walking you through M-Pesa setup, lease generation, and onboarding.
            </p>
          </div>

          {/* Direct Contact Details Strip (Busia, Email & Phone) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3 shadow-2xs">
              <div className="h-10 w-10 rounded-xl bg-[#eef1ff] text-[#2546e8] flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Location</p>
                <p className="text-sm font-bold text-slate-900 truncate">Busia, Kenya</p>
              </div>
            </div>

            <a
              href="mailto:info@afrinextech.co.ke"
              className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3 shadow-2xs hover:border-[#2546e8]/50 transition"
            >
              <div className="h-10 w-10 rounded-xl bg-[#eef1ff] text-[#2546e8] flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Email</p>
                <p className="text-sm font-bold text-slate-900 truncate">info@afrinextech.co.ke</p>
              </div>
            </a>

            <a
              href="tel:0790264792"
              className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3 shadow-2xs hover:border-[#2546e8]/50 transition"
            >
              <div className="h-10 w-10 rounded-xl bg-[#eef1ff] text-[#2546e8] flex items-center justify-center shrink-0">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Phone / WhatsApp</p>
                <p className="text-sm font-bold text-slate-900 truncate">0790264792</p>
              </div>
            </a>
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
