import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import { ArrowRight, HelpCircle, MessageSquare } from "lucide-react";

export default function FaqsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      setLocation("/dashboard");
    } else {
      setLocation("/login?mode=signup");
    }
  };

  const faqItems = [
    {
      q: "What is MakaziFlow?",
      a: "MakaziFlow is property management software for landlords and property managers in Kenya and across Africa. MakaziFlow helps landlords and property managers save time and money by leveraging technology, automated collections, and integrated accounting."
    },
    {
      q: "Does the system have any downtimes?",
      a: "The system has no downtimes. We have automated multi-cloud redundancy and live backups for every part of our system so that there will be no interruption in service."
    },
    {
      q: "Do I have to pay for any upgrades done in the system?",
      a: "You do not have to pay for any upgrades made to the system. We continuously improve the software, release new features, and enhance security at no additional cost to you."
    },
    {
      q: "Is my data safe?",
      a: "Your data is safe. All data transmitted is 256-bit SSL encrypted and all access is password and 2FA protected so that only you and your authorized users have access to your data. We also hold daily backups so that you never lose your records."
    },
    {
      q: "Do you provide support?",
      a: "Yes, we provide support through email (support@makaziflow.com) and phone (+254 711 000 555). You may contact us anytime between 8am-7pm (GMT+3, Kenyan time). Our team also offers training and live onboarding on how to use the system."
    },
    {
      q: "Can I export my data?",
      a: "Yes, you can export all your data such as invoices, payments, tenant registers, utility statements, and accounting reports from our system into Excel spreadsheets and PDF documents anytime."
    },
    {
      q: "Can I communicate with tenants through the system?",
      a: "Yes, you can communicate with tenants directly through the system via SMS and WhatsApp to send announcements, overdue payment notices, or instant payment invoices and receipts."
    },
    {
      q: "Can I get a free trial?",
      a: "Yes, we offer a free trial of our property management software so you can experience its benefits firsthand. Sign up for a free trial today and see how it can transform the way you manage your rentals."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">
      <PublicNavbar />

      {/* FAQs Header Banner (Matching Screenshot 3) */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-950">
              FAQs
            </h1>
          </div>

          {/* 2-Column Grid of FAQ Cards (Exact layout from Screenshot 3) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {faqItems.map((item, idx) => (
              <article
                key={idx}
                className="rounded-3xl border border-slate-200/90 bg-white p-7 sm:p-8 shadow-[0_8px_30px_rgba(15,23,42,0.04)] hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-950 mb-3.5 leading-snug">
                    {item.q}
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    {item.a}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {/* Have More Questions? */}
          <div className="mt-16 text-center bg-slate-50 border border-slate-200 rounded-3xl p-8 sm:p-12">
            <h3 className="text-2xl font-bold text-slate-950 mb-2">
              Still have questions?
            </h3>
            <p className="text-slate-600 text-sm sm:text-base max-w-lg mx-auto mb-6">
              Our Nairobi-based support team is available by phone, WhatsApp, and email to answer any inquiries.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="tel:+254711000555"
                className="px-6 py-3 rounded-full border border-slate-300 bg-white text-slate-800 font-semibold text-sm hover:bg-slate-50 transition shadow-2xs"
              >
                Call +254 711 000 555
              </a>
              <button
                onClick={handleGetStarted}
                className="px-6 py-3 rounded-full bg-[#1d1d1f] text-white font-semibold text-sm hover:bg-slate-800 transition shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>Try MakaziFlow Free</span>
                <ArrowRight className="w-4 h-4 text-cyan-400" />
              </button>
            </div>
          </div>

        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
