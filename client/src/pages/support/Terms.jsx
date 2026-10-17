import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  FileText,
  Shield,
  UserCheck,
  Ban,
  MessageSquare,
  Key,
  Inbox,
  Settings,
  Lock,
  Clock,
  RefreshCw,
  Scale,
  Gavel,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Database,
  Pen,
  MoreHorizontal,
  Phone,
  ChevronDown,
  ChevronUp,
  BookOpen
} from "lucide-react";

const sections = [
  {
    id: "agreement",
    icon: FileText,
    color: "from-blue-500 to-blue-600",
    iconBg: "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400",
    title: "1. Agreement to Terms",
    content: [
      `These Terms of Use constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and MakaaziHub ("MakaaziHub," "we," "us," or "our"), concerning your access to and use of the website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto (collectively, the "Site"). We are registered in Kenya and have our registered office at P.O BOX 576-0300 Nairobi. You agree that by accessing the Site, you have read, understood, and agreed to be bound by all of these Terms of Use. IF YOU DO NOT AGREE WITH ALL OF THESE TERMS OF USE, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SITE AND YOU MUST DISCONTINUE USE IMMEDIATELY.`,
      `Supplemental terms and conditions or documents that may be posted on the Site from time to time are hereby expressly incorporated herein by reference. We reserve the right, in our sole discretion, to make changes or modifications to these Terms of Use at any time and for any reason. We will alert you about any changes by updating the "Last updated" date of these Terms of Use, and you waive any right to receive specific notice of each such change.`,
      `The Site is intended for users who are at least 18 years old. Persons under the age of 18 are not permitted to use or register for the Site.`
    ]
  },
  {
    id: "ip",
    icon: Shield,
    color: "from-purple-500 to-purple-600",
    iconBg: "bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400",
    title: "2. Intellectual Property Rights",
    content: [
      `Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws.`,
      `Provided that you are eligible to use the Site, you are granted a limited license to access and use the Site and to download or print a copy of any portion of the Content to which you have properly gained access solely for your personal, non-commercial use.`
    ]
  },
  {
    id: "userreps",
    icon: UserCheck,
    color: "from-emerald-500 to-emerald-600",
    iconBg: "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400",
    title: "3. User Representations",
    content: [
      `By using the Site, you represent and warrant that: (1) you have the legal capacity and you agree to comply with these Terms of Use; (2) you are not a minor in the jurisdiction in which you reside; (3) you will not access the Site through automated or non-human means, whether through a bot, script, or otherwise; (4) you will not use the Site for any illegal or unauthorized purpose; and (5) your use of the Site will not violate any applicable law or regulation.`
    ]
  },
  {
    id: "prohibited",
    icon: Ban,
    color: "from-red-500 to-red-600",
    iconBg: "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400",
    title: "4. Prohibited Activities",
    content: [
      `You may not access or use the Site for any purpose other than that for which we make the Site available. The Site may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.`
    ],
    list: [
      "Systematically retrieve data or other content from the Site to create or compile a collection, database, or directory without written permission from us.",
      "Trick, defraud, or mislead us and other users, especially in any attempt to learn sensitive account information such as user passwords.",
      "Circumvent, disable, or otherwise interfere with security-related features of the Site.",
      "Disparage, tarnish, or otherwise harm, in our opinion, us and/or the Site.",
      "Upload or transmit viruses, Trojan horses, or other harmful materials.",
      "Attempt to impersonate another user or person or use the username of another user.",
      "Interfere with, disrupt, or create an undue burden on the Site or connected networks."
    ]
  },
  {
    id: "ugc",
    icon: MessageSquare,
    color: "from-amber-500 to-amber-600",
    iconBg: "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400",
    title: "5. User Generated Contributions",
    content: [
      `We may provide you with the opportunity to create, submit, post, display, transmit, perform, publish, distribute, or broadcast content and materials to us or on the Site, including but not limited to text, writings, video, audio, photographs, graphics, comments, suggestions, or personal information (collectively, "Contributions"). You represent that your Contributions do not infringe any proprietary rights of any third party.`
    ]
  },
  {
    id: "license",
    icon: Key,
    color: "from-teal-500 to-teal-600",
    iconBg: "bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400",
    title: "6. Contribution License",
    content: [
      `You and the Site agree that we may access, store, process, and use any information and personal data that you provide following the terms of the Privacy Policy and your choices. You retain full ownership of all of your Contributions.`
    ]
  },
  {
    id: "submissions",
    icon: Inbox,
    color: "from-cyan-500 to-cyan-600",
    iconBg: "bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400",
    title: "7. Submissions",
    content: [
      `You acknowledge and agree that any questions, comments, suggestions, ideas, feedback, or other information regarding the Site provided by you to us are non-confidential and shall become our sole property.`
    ]
  },
  {
    id: "sitemanage",
    icon: Settings,
    color: "from-slate-500 to-slate-600",
    iconBg: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
    title: "8. Site Management",
    content: [
      `We reserve the right, but not the obligation, to monitor the Site for violations of these Terms of Use, take appropriate legal action against anyone who violates the law or these Terms, and otherwise manage the Site to protect our rights and property.`
    ]
  },
  {
    id: "privacypolicy2",
    icon: Lock,
    color: "from-indigo-500 to-indigo-600",
    iconBg: "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400",
    title: "9. Privacy Policy",
    content: [
      `We care about data privacy and security. By using the Site, you agree to be bound by our Privacy Policy posted on the Site, which is incorporated into these Terms of Use.`
    ]
  },
  {
    id: "terms",
    icon: Clock,
    color: "from-orange-500 to-orange-600",
    iconBg: "bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400",
    title: "10. Term and Termination",
    content: [
      `These Terms of Use shall remain in full force and effect while you use the Site. We reserve the right to deny access to and use of the Site to any person for any reason or for no reason, including without limitation for breach of any representation, warranty, or covenant contained in these Terms.`
    ]
  },
  {
    id: "modifications",
    icon: RefreshCw,
    color: "from-violet-500 to-violet-600",
    iconBg: "bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400",
    title: "11. Modifications and Interruptions",
    content: [
      `We reserve the right to change, modify, or remove the contents of the Site at any time or for any reason at our sole discretion without notice. We cannot guarantee the Site will be available at all times.`
    ]
  },
  {
    id: "law",
    icon: Scale,
    color: "from-sky-500 to-sky-600",
    iconBg: "bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400",
    title: "12. Governing Law",
    content: [
      `These Terms shall be governed by and defined following the laws of Kenya. MakaaziHub and yourself irrevocably consent that the courts of Kenya shall have exclusive jurisdiction to resolve any dispute which may arise in connection with these terms.`
    ]
  },
  {
    id: "disputes",
    icon: Gavel,
    color: "from-rose-500 to-rose-600",
    iconBg: "bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400",
    title: "13. Dispute Resolution",
    content: [
      `Any dispute arising out of or in connection with this contract shall be referred to and finally resolved by arbitration in Nairobi, Kenya. The language of the proceedings shall be English.`
    ]
  },
  {
    id: "corrections",
    icon: CheckCircle,
    color: "from-green-500 to-green-600",
    iconBg: "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400",
    title: "14. Corrections",
    content: [
      `There may be information on the Site that contains typographical errors, inaccuracies, or omissions. We reserve the right to correct any errors and to change or update information without prior notice.`
    ]
  },
  {
    id: "disclaimer",
    icon: AlertTriangle,
    color: "from-yellow-500 to-yellow-600",
    iconBg: "bg-yellow-50 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400",
    title: "15. Disclaimer",
    content: [
      `THE SITE IS PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT YOUR USE OF THE SITE AND OUR SERVICES WILL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED.`
    ]
  },
  {
    id: "liability",
    icon: AlertOctagon,
    color: "from-red-400 to-red-500",
    iconBg: "bg-red-50 dark:bg-red-950 text-red-500 dark:text-red-400",
    title: "16. Limitations of Liability",
    content: [
      `IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES.`
    ]
  },
  {
    id: "indemnification",
    icon: ShieldCheck,
    color: "from-emerald-400 to-emerald-500",
    iconBg: "bg-emerald-50 dark:bg-emerald-950 text-emerald-500 dark:text-emerald-400",
    title: "17. Indemnification",
    content: [
      `You agree to defend, indemnify, and hold us harmless from and against any loss, damage, liability, claim, or demand, including reasonable attorneys' fees, arising out of your use of the Site or breach of these Terms.`
    ]
  },
  {
    id: "userdata",
    icon: Database,
    color: "from-blue-400 to-blue-500",
    iconBg: "bg-blue-50 dark:bg-blue-950 text-blue-500 dark:text-blue-400",
    title: "18. User Data",
    content: [
      `We will maintain certain data that you transmit to the Site for managing performance. You are solely responsible for all data that you transmit.`
    ]
  },
  {
    id: "electronic",
    icon: Pen,
    color: "from-fuchsia-500 to-fuchsia-600",
    iconBg: "bg-fuchsia-50 dark:bg-fuchsia-950 text-fuchsia-600 dark:text-fuchsia-400",
    title: "19. Electronic Communications, Transactions, and Signatures",
    content: [
      `Visiting the Site, sending us emails, and completing online forms constitute electronic communications. You agree to the use of electronic signatures, contracts, orders, and other records.`
    ]
  },
  {
    id: "misc",
    icon: MoreHorizontal,
    color: "from-gray-500 to-gray-600",
    iconBg: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    title: "20. Miscellaneous",
    content: [
      `These Terms of Use and any operating rules posted by us constitute the entire agreement between you and us. Our failure to enforce any right or provision shall not operate as a waiver.`
    ]
  },
  {
    id: "contact",
    icon: Phone,
    color: "from-indigo-600 to-blue-600",
    iconBg: "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400",
    title: "21. Contact Us",
    content: [],
    contact: {
      company: "MakaaziHub",
      address: "P.O BOX 576-0300 Nairobi, Kenya",
      phone: "+254 717 512 483",
      email: "support@makaazihub.com"
    }
  }
];

function SectionCard({ section, isExpanded, onToggle }) {
  const Icon = section.icon;
  return (
    <div
      id={section.id}
      className="group rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
    >
      {/* Linear accent bar */}
      <div className={`h-1 w-full bg-linear-to-r ${section.color}`} />

      {/* Header (clickable to expand/collapse) */}
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

      {/* Expandable body */}
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
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          )}
          {section.contact && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <p className="font-semibold text-slate-800 dark:text-slate-200">{section.contact.company}</p>
              <p>{section.contact.address}</p>
              <p>Phone: {section.contact.phone}</p>
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

export default function TermsOfService() {
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
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Terms of Use
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Last updated November 17, 2026
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
