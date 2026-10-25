import React, { useState, useRef } from "react";
import { MessageSquare, X, Send, Bot, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function FloatingAIAssistant() {
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: api.getStats
  });

  const { data: debtors = [] } = useQuery({
    queryKey: ["debtors"],
    queryFn: api.getDebtors
  });

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I'm your MakaziFlow Assistant. You can ask me anything about tenant arrears, occupancy rates, billing, or automated reminders.",
      time: "Just now"
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Tip visibility state (hide once dragged or dismissed)
  const [showTip, setShowTip] = useState(() => {
    return localStorage.getItem("dwello_hide_ai_drag_tip") !== "true";
  });

  const dismissTip = () => {
    setShowTip(false);
    localStorage.setItem("dwello_hide_ai_drag_tip", "true");
  };

  // Dragging state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const handleMouseDown = (e) => {
    isDragging.current = true;
    hasMoved.current = false;
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };

    const handleMouseMove = (moveEvent) => {
      if (!isDragging.current) return;
      hasMoved.current = true;
      dismissTip();
      setPosition({
        x: moveEvent.clientX - dragStart.current.x,
        y: moveEvent.clientY - dragStart.current.y
      });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleSend = (textToSend) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg = {
      sender: "user",
      text: query,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      let reply = "";
      const q = query.toLowerCase();

      const arrearsAmt = Number(stats?.outstandingAmount || 0).toLocaleString();
      const debtorCount = debtors?.length || 0;
      const occRate = stats?.occupancyRate || 0;
      const occupied = stats?.occupiedUnits || 0;
      const vacant = stats?.vacantUnits || 0;
      const collected = Number(stats?.collectedThisMonth || 0).toLocaleString();
      const expected = Number(stats?.expectedMonthlyRent || 0).toLocaleString();

      if (q.includes("arrears") || q.includes("owe") || q.includes("debt")) {
        if (debtorCount > 0) {
          const topDebtor = debtors[0];
          reply = `Currently, ${debtorCount} tenants have pending arrears totaling KES ${arrearsAmt}. The highest balance is ${topDebtor.name || "Tenant"} with KES ${Number(topDebtor.balance || topDebtor.rentAmount || 0).toLocaleString()}. You can use 'Send Reminders' to notify them.`;
        } else {
          reply = `Great news! You currently have 0 tenants in arrears, and total outstanding rent is KES 0.00.`;
        }
      } else if (q.includes("occupancy") || q.includes("vacant") || q.includes("occupied")) {
        reply = `Your portfolio is at ${occRate}% occupancy (${occupied} occupied units, ${vacant} vacant units available).`;
      } else if (q.includes("bill") || q.includes("invoice") || q.includes("revenue") || q.includes("collected")) {
        reply = `Total expected gross rent this month is KES ${expected}. Total collections recorded so far is KES ${collected}.`;
      } else if (q.includes("remind") || q.includes("sms")) {
        reply = `Draft SMS ready:\n"Dear Tenant, this is a friendly reminder that your rent for Unit [Unit] is pending. Please pay via M-Pesa Paybill 247247 A/C [Unit]. Thank you, Management."`;
      } else if (q.includes("bank") || q.includes("statement") || q.includes("upload")) {
        reply = `You can upload your M-Pesa or Bank Statement Excel/CSV in the 'More Actions' card by clicking 'Upload Bank Statement'. MakaziFlow will automatically reconcile tenant payments by matching M-Pesa codes!`;
      } else {
        reply = `I can help you monitor live collections, calculate arrears, reconcile M-Pesa payments, and generate monthly invoices for your properties.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
      setIsTyping(false);
    }, 500);
  };

  return (
    <>
      {/* Floating Button and Tooltip */}
      <div
        className="fixed z-50 select-none flex flex-col items-end"
        style={{
          bottom: "24px",
          right: "24px",
          transform: `translate(${position.x}px, ${position.y}px)`,
          touchAction: "none"
        }}
      >
        {!isOpen && showTip && (
          <div className="mb-1.5 px-3 py-1 bg-slate-900/95 text-white text-[11px] font-medium rounded-md shadow-md border border-slate-700 animate-in fade-in flex items-center gap-1.5">
            <span>Tip: press and hold to move me anywhere</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dismissTip();
              }}
              className="text-slate-400 hover:text-white cursor-pointer ml-1 text-xs leading-none"
              aria-label="Dismiss tip"
            >
              ✕
            </button>
          </div>
        )}

        <button
          onMouseDown={handleMouseDown}
          onClick={() => {
            if (!hasMoved.current) {
              setIsOpen(!isOpen);
            }
          }}
          className="flex items-center gap-2 bg-[#09154a] hover:bg-[#0c1f6d] active:scale-95 text-white px-4 py-2.5 rounded-full shadow-xl border border-blue-500/30 transition-all cursor-grab active:cursor-grabbing font-medium text-sm group"
          title="MakaziFlow AI Assistant"
        >
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
            <MessageSquare className="w-3.5 h-3.5 fill-current" />
          </div>
          <span>Ask me anything</span>
        </button>
      </div>

      {/* Assistant Modal / Drawer */}
      {isOpen && (
        <div
          className="fixed z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-border w-95 max-w-[92vw] h-130 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6"
          style={{
            bottom: "84px",
            right: "24px",
            transform: `translate(${position.x}px, ${position.y}px)`
          }}
        >
          {/* Header */}
          <div className="bg-[#070a38] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">MakaziFlow Assistant</h3>
                <p className="text-[11px] text-blue-200">Live Property & Financial AI</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs bg-slate-50 dark:bg-slate-950/40">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[85%] whitespace-pre-wrap leading-relaxed shadow-xs ${
                    m.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none"
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">{m.time}</span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground p-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}
          </div>

          {/* Quick chips */}
          <div className="p-2 border-t border-border bg-white dark:bg-slate-900 flex gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleSend("Who owes the most arrears?")}
              className="px-2.5 py-1 text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 rounded-full shrink-0 border border-slate-200 dark:border-slate-700 transition"
            >
              Who has arrears?
            </button>
            <button
              onClick={() => handleSend("What is our occupancy rate?")}
              className="px-2.5 py-1 text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 rounded-full shrink-0 border border-slate-200 dark:border-slate-700 transition"
            >
              Occupancy stats
            </button>
            <button
              onClick={() => handleSend("Draft a payment reminder SMS")}
              className="px-2.5 py-1 text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 rounded-full shrink-0 border border-slate-200 dark:border-slate-700 transition"
            >
              Reminder SMS
            </button>
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-border bg-white dark:bg-slate-900 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about live arrears, units, payments..."
              className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-full px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white flex items-center justify-center shrink-0 transition"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
