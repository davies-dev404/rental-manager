import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  CheckCircle2,
  Smartphone,
  FileText,
  Droplets,
  CreditCard,
  Maximize2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Volume2,
  VolumeX,
  Users
} from "lucide-react";

export default function MakaziFlowShowcase({ onGetStarted }) {
  const [activeTab, setActiveTab] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(35);
  const [isMuted, setIsMuted] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);

  const tabs = [
    {
      id: "mpesa",
      label: "M-Pesa Daraja Sync",
      icon: <CreditCard className="w-4 h-4 text-emerald-400" />,
      tag: "Live Bank & Paybill Auto-Match",
      title: "Zero Manual Reconciliation",
      description:
        "Every tenant payment via Paybill, Till, or Bank is matched to their unit in seconds. Fake SMS receipts and tenant payment excuses are eliminated forever.",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      liveEvent: {
        code: "QKD87X29P1",
        tenant: "Catherine Wabweire",
        unit: "House G1 • Greenfield Heights",
        amount: "KES 45,000",
        status: "Auto-Reconciled • 100% Paid",
        time: "Just now"
      }
    },
    {
      id: "whatsapp",
      label: "Tenant WhatsApp Notices",
      icon: <Smartphone className="w-4 h-4 text-cyan-400" />,
      tag: "Automated Communication",
      title: "Friendly Automated Reminders",
      description:
        "Dispatch polite rent reminders, digital receipts, and estate memos directly to tenant phones via WhatsApp and branded SMS with one click.",
      badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      liveEvent: {
        code: "SMS_DISPATCH_OK",
        tenant: "Robert Kimani",
        unit: "House 1B",
        amount: "KES 57,900 Due",
        status: "WhatsApp Delivered with PDF",
        time: "Sent 8:00 AM"
      }
    },
    {
      id: "leases",
      label: "Digital Leases",
      icon: <FileText className="w-4 h-4 text-blue-400" />,
      tag: "Kenyan Tenancy Law Compliant",
      title: "Corporate PDF Leases & Stamp",
      description:
        "Generate professional tenancy contracts bearing your company name or property branding, complete with landlord stamp and tenant signature spaces.",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      liveEvent: {
        code: "LEASE_GEN_V2",
        tenant: "Emmanuel Mwanzia",
        unit: "Unit 1A • 2-Year Term",
        amount: "KES 65,000 / mo",
        status: "Stamped & Downloaded",
        time: "2 mins ago"
      }
    },
    {
      id: "utilities",
      label: "Sub-Meter Billing",
      icon: <Droplets className="w-4 h-4 text-teal-400" />,
      tag: "Water & Service Charge",
      title: "Automatic Meter Calculation",
      description:
        "Enter previous and current meter units; MakaziFlow computes exact consumption, adds garbage and service charges, and appends it to the rent invoice.",
      badgeColor: "bg-teal-500/20 text-teal-300 border-teal-500/30",
      liveEvent: {
        code: "METER_CALC_OK",
        tenant: "Elizabeth Mwangi",
        unit: "Unit G4 • Water 18 m³",
        amount: "KES 2,160 Computed",
        status: "Appended to Next Bill",
        time: "Today"
      }
    }
  ];

  // Auto rotate tabs every 6 seconds if playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % tabs.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPlaying, tabs.length]);

  // Smooth progress bar simulation
  useEffect(() => {
    if (!isPlaying) return;
    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 1));
    }, 200);
    return () => clearInterval(progressInterval);
  }, [isPlaying]);

  const active = tabs[activeTab];

  return (
    <div className="relative w-full">
      {/* Outer Mac/App Frame Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="overflow-hidden rounded-3xl border border-slate-700/60 bg-linear-to-b from-[#0D2240] via-[#09152b] to-[#060D1E] shadow-[0_25px_60px_-15px_rgba(0,122,255,0.2)] text-white"
      >
        {/* Top Window Chrome */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-[#0B172E]/90 backdrop-blur-md">
          {/* Traffic Lights */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#FF5F56] inline-block shadow-xs" />
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E] inline-block shadow-xs" />
            <span className="w-3 h-3 rounded-full bg-[#27C93F] inline-block shadow-xs" />
            <span className="ml-2 text-[11px] font-mono text-slate-400 hidden sm:inline-block">
              makaziflow.ke / product-tour
            </span>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Demo Reel
            </span>
            <button
              onClick={() => setShowFullModal(true)}
              className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
              title="Fullscreen Tour"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Video Canvas Area */}
        <div className="relative aspect-16/10 sm:aspect-16/9.5 w-full overflow-hidden bg-slate-950 flex flex-col justify-between p-4 sm:p-6">
          {/* Background Realistic Dashboard Layer */}
          <div className="absolute inset-0 z-0">
            <img
              src="/dashboard-screenshot.png"
              alt="MakaziFlow Live Dashboard Screen"
              className="h-full w-full object-cover object-top opacity-35 filter brightness-90 contrast-110"
            />
            <div className="absolute inset-0 bg-linear-to-t from-[#060D1E] via-[#09152b]/80 to-[#0A192F]/60" />
          </div>

          {/* Top Video Header Overlay */}
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${active.badgeColor}`}>
                <Sparkles className="w-3.5 h-3.5" />
                {active.tag}
              </span>
              <h3 className="mt-2 text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
                {active.title}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition backdrop-blur-sm cursor-pointer"
                title={isMuted ? "Unmute Audio" : "Mute Audio"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Center Dynamic Interactive Event Card */}
          <div className="relative z-10 my-auto max-w-lg">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -12 }}
                transition={{ duration: 0.35 }}
                className="rounded-2xl border border-white/15 bg-[#0D2240]/90 p-4 sm:p-5 shadow-2xl backdrop-blur-md"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-500/20 text-blue-400">
                      {active.icon}
                    </div>
                    <div>
                      <p className="text-xs text-slate-300 font-medium">Verified System Event</p>
                      <p className="font-mono text-xs text-cyan-300 font-bold">{active.liveEvent.code}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">{active.liveEvent.time}</span>
                </div>

                <div className="mt-3.5 grid grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Tenant &amp; Unit</span>
                    <p className="font-bold text-white truncate">{active.liveEvent.tenant}</p>
                    <p className="text-xs text-slate-300 truncate">{active.liveEvent.unit}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Processed Amount</span>
                    <p className="text-base font-extrabold text-emerald-400">{active.liveEvent.amount}</p>
                    <p className="text-[11px] text-emerald-300 flex items-center justify-end gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {active.liveEvent.status}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-slate-300 border-t border-white/5 pt-2.5">
                  {active.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Video Controls & Scrubber */}
          <div className="relative z-10 space-y-3">
            {/* Scrubber progress */}
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const newProgress = Math.round((clickX / rect.width) * 100);
                setProgress(newProgress);
              }}
              className="group relative h-2 w-full cursor-pointer rounded-full bg-white/20 transition-all hover:h-2.5"
            >
              <div
                className="h-full rounded-full bg-linear-to-r from-[#007AFF] via-[#00D2B4] to-cyan-300 transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
              <span
                className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-md scale-0 group-hover:scale-100 transition-transform -ml-1.5"
                style={{ left: `${progress}%` }}
              />
            </div>

            {/* Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-950 font-bold hover:scale-105 active:scale-95 transition shadow-lg cursor-pointer"
                  title={isPlaying ? "Pause Tour" : "Play Tour"}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="ml-0.5 w-4 h-4 fill-current" />}
                </button>
                <div className="font-mono text-slate-300 text-xs">
                  <span>0:{progress < 10 ? `0${progress}` : progress}</span>
                  <span className="text-slate-500"> / 1:45</span>
                </div>
              </div>

              {/* Enter Live System CTA */}
              <button
                type="button"
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-linear-to-r from-[#007AFF] to-[#00A99D] text-white font-bold text-xs hover:brightness-110 active:scale-95 transition shadow-md cursor-pointer"
              >
                <span>Try MakaziFlow in Live Demo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Interactive Feature Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-white/10 bg-[#071122]">
          {tabs.map((tab, idx) => {
            const isSelected = activeTab === idx;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(idx);
                  setIsPlaying(false);
                }}
                className={`flex flex-col text-left p-3.5 sm:p-4 transition-all border-b-2 sm:border-b-0 sm:border-r border-white/10 last:border-r-0 cursor-pointer ${
                  isSelected
                    ? "bg-[#0D2240] border-b-[#007AFF] sm:border-b-transparent text-white"
                    : "hover:bg-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`p-1 rounded-md ${isSelected ? "bg-blue-500/20" : "bg-white/5"}`}>
                    {tab.icon}
                  </span>
                  <span className="text-xs font-bold leading-tight truncate">
                    {tab.label}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 truncate hidden sm:block">
                  {tab.tag}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Fullscreen Video Tour Modal */}
      {showFullModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-8">
          <div className="relative w-full max-w-4xl rounded-3xl bg-[#09152b] border border-slate-700 p-6 sm:p-8 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <h4 className="text-lg font-bold">MakaziFlow Full Walkthrough Tour</h4>
              </div>
              <button
                onClick={() => setShowFullModal(false)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
              >
                Close (ESC)
              </button>
            </div>

            <div className="mt-6 aspect-video rounded-2xl overflow-hidden bg-slate-950 relative border border-white/10">
              <img
                src="/dashboard-screenshot.png"
                alt="MakaziFlow Full Platform Screenshot"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center p-6 text-center">
                <div className="bg-[#0D2240]/90 backdrop-blur-md p-6 rounded-2xl border border-white/20 max-w-md shadow-2xl">
                  <h5 className="text-xl font-black text-white">Experience MakaziFlow Live</h5>
                  <p className="mt-2 text-sm text-slate-300">
                    Dive into a live test environment preloaded with Kenyan estates, tenant arrears, and automated lease generation.
                  </p>
                  <button
                    onClick={() => {
                      setShowFullModal(false);
                      onGetStarted();
                    }}
                    className="mt-5 w-full py-3 rounded-full bg-[#007AFF] hover:bg-blue-600 font-bold text-white text-sm shadow-lg transition cursor-pointer"
                  >
                    Open Live Demo System
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
