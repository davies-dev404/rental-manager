import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  FileText,
  ClipboardList,
  BarChart3,
  Share2,
  Cookie,
  UserCircle,
  Clock,
  ShieldCheck,
  UserX,
  Unlock,
  Eye,
  RefreshCw,
  Phone,
  Trash2,
  ChevronDown,
  ChevronUp,
  LockKeyhole
} from "lucide-react";

const sections = [
  {
    id: "infocollect",
    icon: ClipboardList,
    color: "from-blue-500 to-blue-600",
    iconBg: "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400",
    title: "1. What Information Do We Collect?",
    content: [
      `We collect personal information that you voluntarily provide to us when you register on the Website, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Website or otherwise when you contact us.`,
      `The personal information that we collect depends on the context of your interactions with us and the Website, the choices you make and the products and features you use. The personal information we collect may include: names; phone numbers; email addresses; usernames; passwords; debit/credit card numbers; contact or authentication data; and other similar information.`
    ]
  },
  {
    id: "infouse",
    icon: BarChart3,
    color: "from-emerald-500 to-emerald-600",
    iconBg: "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400",
    title: "2. How Do We Use Your Information?",
    content: [
      `We process your information for purposes based on legitimate business interests, the fulfillment of our contract with you, compliance with our legal obligations, and/or your consent.`
    ],
    list: [
      "To facilitate account creation and logon process.",
      "To post testimonials with your consent.",
      "To request feedback and contact you about your use of our Website.",
      "To enable user-to-user communications.",
      "To manage user accounts and send administrative information.",
      "To protect our Services from fraud and abuse.",
      "To fulfill and manage rental invoices, utilities, and payments."
    ]
  },
  {
    id: "infoshare",
    icon: Share2,
    color: "from-violet-500 to-violet-600",
    iconBg: "bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400",
    title: "3. Will Your Information Be Shared with Anyone?",
    content: [
      `We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. This includes business transfers such as during negotiations of any merger, sale of company assets, or financing.`
    ]
  },
  {
    id: "cookies",
    icon: Cookie,
    color: "from-amber-500 to-amber-600",
    iconBg: "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400",
    title: "4. Do We Use Cookies and Other Tracking Technologies?",
    content: [
      `We may use cookies and similar tracking technologies (like web beacons and pixels) to access or store information. Specific information about how we use such technologies and how you can refuse certain cookies is set out in our Cookie Notice.`
    ]
  },
  {
    id: "sociallogins",
    icon: UserCircle,
    color: "from-pink-500 to-pink-600",
    iconBg: "bg-pink-50 dark:bg-pink-950 text-pink-600 dark:text-pink-400",
    title: "5. How Do We Handle Your Social Logins?",
    content: [
      `Our Website offers you the ability to register and login using your third-party social media account details (like your Google account). Where you choose to do this, we will receive certain profile information about you from your provider, which we use strictly for logon and account setup.`
    ]
  },
  {
    id: "inforetain",
    icon: Clock,
    color: "from-orange-500 to-orange-600",
    iconBg: "bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400",
    title: "6. How Long Do We Keep Your Information?",
    content: [
      `We will only keep your personal information for as long as it is necessary for the purposes set out in this privacy notice, unless a longer retention period is required or permitted by law. No purpose in this notice will require us keeping your personal information for longer than three (3) months past the termination of the user's account.`
    ]
  },
  {
    id: "infosafe",
    icon: ShieldCheck,
    color: "from-teal-500 to-teal-600",
    iconBg: "bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400",
    title: "7. How Do We Keep Your Information Safe?",
    content: [
      `We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards, transmission of personal information to and from our Website is at your own risk.`
    ]
  },
  {
    id: "infominors",
    icon: UserX,
    color: "from-red-500 to-red-600",
    iconBg: "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400",
    title: "8. Do We Collect Information from Minors?",
    content: [
      `We do not knowingly collect data from or market to children under 18 years of age. By using the Website, you represent that you are at least 18.`
    ]
  },
  {
    id: "privacyrights",
    icon: Unlock,
    color: "from-indigo-500 to-indigo-600",
    iconBg: "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400",
    title: "9. What Are Your Privacy Rights?",
    content: [
      `You may review, change, or terminate your account at any time. Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases.`
    ]
  },
  {
    id: "DNT",
    icon: Eye,
    color: "from-sky-500 to-sky-600",
    iconBg: "bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400",
    title: "10. Controls for Do-Not-Track Features",
    content: [
      `Most web browsers include a Do-Not-Track ("DNT") feature. At this stage no uniform technology standard for recognizing and implementing DNT signals has been finalized, so we do not currently respond to DNT browser signals.`
    ]
  },
  {
    id: "policyupdates",
    icon: RefreshCw,
    color: "from-cyan-500 to-cyan-600",
    iconBg: "bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400",
    title: "11. Do We Make Updates to This Notice?",
    content: [
      `Yes, we will update this notice as necessary to stay compliant with relevant laws. The updated version will be indicated by an updated "Revised" date.`
    ]
  },
  {
    id: "contact",
    icon: Phone,
    color: "from-green-500 to-green-600",
    iconBg: "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400",
    title: "12. How Can You Contact Us About This Notice?",
    content: [],
    contact: {
      company: "MakaaziHub",
      address: "P.O BOX 576-0300 Nairobi, Kenya",
      phone: "+254 717 512 483",
      email: "support@makaazihub.com"
    }
  },
  {
    id: "request",
    icon: Trash2,
    color: "from-rose-500 to-rose-600",
    iconBg: "bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400",
    title: "13. How Can You Review, Update, or Delete the Data We Collect from You?",
    content: [
      `Based on the applicable laws of your country, you may have the right to request access to the personal information we collect from you, change that information, or delete it in some circumstances.`
    ]
  }
];

function SectionCard({ section, isExpanded, onToggle }) {
  const Icon = section.icon;
  return (
    <div
      id={section.id}
      className="group rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
    >
      {/* Gradient accent bar */}
      <div className={`h-1 w-full bg-linear-to-r ${section.color}`} />

      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
      >
        <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${section.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="flex-1 text-sm font-bold text-slate-900 dark:text-white">
          {section.title}
        </h3>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Body */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-1 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {section.content.map((p, i) => (
            <p key={i} className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {p}
            </p>
          ))}
          {section.list && (
            <ul className="space-y-2 pl-1">
              {section.list.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          )}
          {section.contact && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <p className="font-semibold text-slate-800 dark:text-slate-200">{section.contact.company}</p>
              <p>{section.contact.address}</p>
              <p>
                Email:{" "}
                <a href={`mailto:${section.contact.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                  {section.contact.email}
                </a>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();
  const [expandedSections, setExpandedSections] = useState(
    () => new Set(sections.map((s) => s.id))
  );

  const toggleSection = (id) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedSections(new Set(sections.map((s) => s.id)));
  const collapseAll = () => setExpandedSections(new Set());

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      
      {/* Sticky Back Bar */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : setLocation("/")}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <button
              onClick={collapseAll}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* Hero Header */}
        <div className="text-center space-y-3 pb-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 mx-auto">
            <LockKeyhole className="w-7 h-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Privacy Notice
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Last updated November 17, 2026
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Thank you for choosing to be part of our community at MakaaziHub ("MakaaziHub," "we," "us," or "our"). We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice or our practices with regard to your personal information, please contact us at{" "}
            <a href="mailto:support@makaazihub.com" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              support@makaazihub.com
            </a>.
          </p>
        </div>

        {/* Table of Contents Card */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" />
            Table of Contents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
              >
                <s.icon className="w-3.5 h-3.5 shrink-0" />
                {s.title}
              </a>
            ))}
          </div>
        </div>

        {/* Section Cards */}
        <div className="space-y-4">
          {sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="text-center pt-4 pb-8">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} MakaaziHub. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
