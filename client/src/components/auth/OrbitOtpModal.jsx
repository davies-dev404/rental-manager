import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Check, AlertCircle, Loader2, ArrowRight } from "lucide-react";

/**
 * Orbit OTP Window
 *
 * Implements the exact specifications:
 * - Orbit track: radius 58 circle with vector-effect="non-scaling-stroke"
 * - Dotted style: stroke-dasharray: 2 8; stroke-width: 1.5;
 * - The point: traveling satellite along the 58px orbit path
 * - The hub: central orbital node (<span class="orbit_hub">)
 * - The slots: <label class="slot"><input inputmode="numeric" autocomplete="one-time-code" /></label>
 * - Collapse turn-move:
 *     slot.style.transformOrigin = `${hubX}px ${hubY}px`;
 *     slot.animate([
 *       { transform: `rotate(0deg) translate(${dx}px, ${dy}px)` },
 *       { transform: `rotate(450deg) translate(${dx}px, ${dy}px)` }
 *     ], { duration: 800, easing: WIND_UP_BRAKE });
 * - Color reserved for verdicts (not hue, pure light):
 *     --ice: #dceaff;
 *     --ok:  #2ee6a8;
 *     --bad: #ff4d6a;
 */

const WIND_UP_BRAKE = "cubic-bezier(0.2, 0, 0, 1)";
const RADIUS = 58;

export default function OrbitOtpModal({
  open,
  onOpenChange,
  email,
  countdown = 180,
  onVerify,
  onResend,
  isLoading = false,
  title = "Verify It's You",
  description,
  slotCount = 6,
}) {
  const [digits, setDigits] = useState(Array(slotCount).fill(""));
  const [verdict, setVerdict] = useState("idle"); // 'idle' | 'verifying' | 'ok' | 'bad'
  const [verdictMessage, setVerdictMessage] = useState("");
  const inputRefs = useRef([]);
  const slotsRef = useRef([]);
  const hubRef = useRef(null);
  const ringRef = useRef(null);
  const slotAnimationsRef = useRef([]);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setDigits(Array(slotCount).fill(""));
      setVerdict("idle");
      setVerdictMessage("");
      // Reset any previous animations/transforms on slots
      slotsRef.current.forEach((slot) => {
        if (!slot) return;
        slot.style.transform = "none";
        slot.style.transformOrigin = "center";
      });
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [open, slotCount]);

  const digitsFilled = digits.filter(Boolean).length;
  const isComplete = digitsFilled === slotCount;

  // Format countdown mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Satellite point coordinates along radius 58 circle
  // Starts at -90deg (12 o'clock)
  const angleDeg = -90 + (digitsFilled / slotCount) * 360;
  const angleRad = (angleDeg * Math.PI) / 180;
  const pointX = 70 + RADIUS * Math.cos(angleRad);
  const pointY = 70 + RADIUS * Math.sin(angleRad);

  // Trigger verify action & execute the collapse turn-move animation
  const triggerVerify = async (codeToVerify) => {
    const code = codeToVerify || digits.join("");
    if (code.length < slotCount || verdict === "verifying") return;

    setVerdict("verifying");
    setVerdictMessage("Verifying token...");

    // Execute the exact collapse turn-move requested by user:
    // slot.style.transformOrigin = `${hubX}px ${hubY}px`;
    // slot.animate([
    //   { transform: `rotate(0deg) translate(${dx}px, ${dy}px)` },
    //   { transform: `rotate(450deg) translate(${dx}px, ${dy}px)` }
    // ], { duration: 800, easing: WIND_UP_BRAKE });
    if (hubRef.current && slotsRef.current.length) {
      const hubRect = hubRef.current.getBoundingClientRect();
      const hubCenter = {
        x: hubRect.left + hubRect.width / 2,
        y: hubRect.top + hubRect.height / 2,
      };

      slotAnimationsRef.current = [];

      slotsRef.current.forEach((slot) => {
        if (!slot) return;
        const rect = slot.getBoundingClientRect();
        const slotCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };

        const hubX = hubCenter.x - slotCenter.x;
        const hubY = hubCenter.y - slotCenter.y;
        const dist = Math.hypot(hubX, hubY);

        // Collapse delta to land on radius 58 orbit
        const collapseDist = dist - RADIUS;
        const unitX = dist > 0 ? hubX / dist : 0;
        const unitY = dist > 0 ? hubY / dist : 0;
        const dx = unitX * collapseDist;
        const dy = unitY * collapseDist;

        slot.style.transformOrigin = `${hubX}px ${hubY}px`;
        const anim = slot.animate(
          [
            { transform: `rotate(0deg) translate(${dx}px, ${dy}px) scale(1)` },
            { transform: `rotate(450deg) translate(${dx}px, ${dy}px) scale(0.68)` },
          ],
          {
            duration: 800,
            easing: WIND_UP_BRAKE,
            fill: "forwards",
          }
        );
        slotAnimationsRef.current.push(anim);
      });
    }

    try {
      if (onVerify) {
        await onVerify(code);
        setVerdict("ok");
        setVerdictMessage("Access granted");
      }
    } catch (err) {
      setVerdict("bad");
      setVerdictMessage(err?.message || "Invalid or expired code");

      // Reset slots after failure verdict
      setTimeout(() => {
        slotAnimationsRef.current.forEach((anim) => anim.cancel());
        slotsRef.current.forEach((slot) => {
          if (!slot) return;
          slot.style.transform = "none";
          slot.style.transformOrigin = "center";
          slot.animate(
            [
              { transform: "translateX(-8px)" },
              { transform: "translateX(8px)" },
              { transform: "translateX(-4px)" },
              { transform: "translateX(4px)" },
              { transform: "translateX(0)" },
            ],
            { duration: 320, easing: "ease-out" }
          );
        });
        setVerdict("idle");
        setDigits(Array(slotCount).fill(""));
        inputRefs.current[0]?.focus();
      }, 1300);
    }
  };

  // Keyboard navigation & digit changes
  const handleDigitChange = (index, val) => {
    const cleaned = val.replace(/\D/g, "");
    if (!cleaned) {
      const newDigits = [...digits];
      newDigits[index] = "";
      setDigits(newDigits);
      return;
    }

    const char = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    if (index < slotCount - 1) {
      inputRefs.current[index + 1]?.focus();
    } else {
      const finalCode = newDigits.join("");
      if (finalCode.length === slotCount) {
        triggerVerify(finalCode);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = "";
        setDigits(newDigits);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < slotCount - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === "Enter" && isComplete) {
      triggerVerify();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, slotCount);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    if (pasted.length === slotCount) {
      inputRefs.current[slotCount - 1]?.focus();
      triggerVerify(pasted);
    } else {
      inputRefs.current[Math.min(pasted.length, slotCount - 1)]?.focus();
    }
  };

  // Verdict light variables
  const verdictColor =
    verdict === "ok"
      ? "var(--ok)"
      : verdict === "bad"
      ? "var(--bad)"
      : "var(--ice)";

  const verdictGlow =
    verdict === "ok"
      ? "rgba(46, 230, 168, 0.4)"
      : verdict === "bad"
      ? "rgba(255, 77, 106, 0.4)"
      : "rgba(220, 234, 255, 0.2)";

  return (
    <Dialog open={open} onOpenChange={(val) => !isLoading && verdict !== "verifying" && onOpenChange(val)}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-[#0a0f1d] border border-slate-800 text-slate-100 shadow-2xl backdrop-blur-2xl rounded-2xl">
        <style>{`
          :root, .orbit-theme {
            --ice: #dceaff;
            --ok: #2ee6a8;
            --bad: #ff4d6a;
          }

          /* dotted on purpose: a solid ring at this size reads as a leading spinner */
          .orbit circle.orbit_track {
            stroke: rgba(220, 234, 255, 0.22);
            stroke-dasharray: 2 8;
            stroke-width: 1.5;
            fill: none;
            transition: stroke 0.3s ease;
          }

          .orbit_point {
            fill: ${verdictColor};
            filter: drop-shadow(0 0 6px ${verdictGlow});
            transition: cx 0.25s cubic-bezier(0.16, 1, 0.3, 1), cy 0.25s cubic-bezier(0.16, 1, 0.3, 1), fill 0.3s ease;
          }

          .orbit_hub {
            position: relative;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: radial-gradient(circle, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 29, 0.98) 100%);
            border: 1.5px solid ${verdictColor};
            box-shadow: 0 0 20px ${verdictGlow}, inset 0 0 10px ${verdictGlow};
            transition: border-color 0.3s ease, box-shadow 0.3s ease;
          }

          .slot {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 46px;
            height: 54px;
            border-radius: 12px;
            background: rgba(15, 23, 42, 0.75);
            border: 1px solid rgba(148, 163, 184, 0.22);
            transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
            cursor: text;
          }

          .slot:focus-within {
            border-color: var(--ice);
            box-shadow: 0 0 14px rgba(220, 234, 255, 0.35);
          }

          .slot.slot-has-val {
            border-color: rgba(220, 234, 255, 0.45);
            background: rgba(30, 41, 59, 0.75);
          }

          .slot.slot-verdict-ok {
            border-color: var(--ok) !important;
            box-shadow: 0 0 18px rgba(46, 230, 168, 0.45);
          }

          .slot.slot-verdict-bad {
            border-color: var(--bad) !important;
            box-shadow: 0 0 18px rgba(255, 77, 106, 0.45);
          }

          .slot input {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: text;
            text-align: center;
          }

          .slot_char {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 22px;
            font-weight: 700;
            color: #f8fafc;
            user-select: none;
            pointer-events: none;
          }

          .slot_caret {
            width: 2px;
            height: 22px;
            background: var(--ice);
            border-radius: 1px;
            animation: slotCaretBlink 1s infinite;
          }

          @keyframes slotCaretBlink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
        `}</style>

        {/* Ambient celestial light glow */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-40"
          style={{ background: verdictGlow }}
        />

        <div className="orbit-theme relative z-10 px-6 pt-7 pb-6 space-y-6">
          <DialogHeader className="text-center space-y-2">
            <DialogTitle className="text-2xl font-heading font-bold text-slate-100 tracking-tight">
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              {description || (
                <>
                  Enter the verification code sent to{" "}
                  <span className="font-semibold text-slate-200">{email}</span>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* ── THE ORBIT: Track & Point & Hub ── */}
          <div className="relative flex flex-col items-center justify-center pt-1 pb-1">
            <div className="orbit relative w-35 h-35 flex items-center justify-center select-none">
              <svg
                ref={ringRef}
                className="orbit_ring absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                viewBox="0 0 140 140"
              >
                {/* The track: circle r="58" vector-effect="non-scaling-stroke" */}
                <circle
                  className="orbit_track"
                  cx="70"
                  cy="70"
                  r={RADIUS}
                  vectorEffect="non-scaling-stroke"
                />

                {/* The point: traveling satellite */}
                <circle
                  className="orbit_point"
                  cx={pointX}
                  cy={pointY}
                  r="3.5"
                />
              </svg>

              {/* The hub */}
              <span ref={hubRef} className="orbit_hub">
                {verdict === "verifying" ? (
                  <Loader2 className="w-5 h-5 text-slate-100 animate-spin" />
                ) : verdict === "ok" ? (
                  <Check className="w-6 h-6 text-[#2ee6a8] animate-in zoom-in-75 duration-200 stroke-3" />
                ) : verdict === "bad" ? (
                  <AlertCircle className="w-6 h-6 text-[#ff4d6a] animate-in zoom-in-75 duration-200" />
                ) : (
                  <ShieldCheck className="w-6 h-6 text-[#dceaff]" />
                )}
              </span>
            </div>

            {/* Verdict text feedback */}
            <div className="h-5 mt-2 flex items-center justify-center">
              {verdictMessage ? (
                <p
                  className="text-xs font-medium tracking-wide animate-in fade-in slide-in-from-bottom-1 duration-200"
                  style={{ color: verdictColor }}
                >
                  {verdictMessage}
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 tracking-wider uppercase font-semibold">
                  {digitsFilled === 0
                    ? `Enter ${slotCount}-Digit Code`
                    : `${digitsFilled} of ${slotCount} entered`}
                </p>
              )}
            </div>
          </div>

          {/* ── THE SLOTS: Collapse onto the orbit ── */}
          <div className="flex justify-center items-center gap-2 sm:gap-2.5">
            {digits.map((digit, i) => {
              const isCurrent = i === digitsFilled;
              return (
                <label
                  key={i}
                  ref={(el) => (slotsRef.current[i] = el)}
                  className={`slot ${digit ? "slot-has-val" : ""} ${
                    verdict === "ok"
                      ? "slot-verdict-ok"
                      : verdict === "bad"
                      ? "slot-verdict-bad"
                      : ""
                  }`}
                  onClick={() => inputRefs.current[i]?.focus()}
                >
                  <input
                    ref={(el) => (inputRefs.current[i] = el)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    disabled={verdict === "verifying" || verdict === "ok"}
                  />
                  {digit ? (
                    <span className="slot_char">{digit}</span>
                  ) : isCurrent && verdict === "idle" ? (
                    <span className="slot_caret" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700/60" />
                  )}
                </label>
              );
            })}
          </div>

          {/* Timer & Resend Controls */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    countdown < 60
                      ? "bg-[#ff4d6a] animate-ping"
                      : "bg-[#2ee6a8]"
                  }`}
                />
                Expires in{" "}
                <span
                  className={`font-mono font-bold ${
                    countdown < 60 ? "text-[#ff4d6a]" : "text-slate-200"
                  }`}
                >
                  {formatTime(countdown)}
                </span>
              </span>

              <button
                type="button"
                className="text-xs text-sky-400 hover:text-sky-300 hover:underline font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                disabled={countdown > 120 || isLoading || verdict === "verifying"}
                onClick={async () => {
                  if (onResend) {
                    await onResend();
                    setDigits(Array(slotCount).fill(""));
                    inputRefs.current[0]?.focus();
                  }
                }}
              >
                Resend code {countdown > 120 ? `(${countdown - 120}s)` : ""}
              </button>
            </div>

            <p className="text-[11px] text-center text-slate-500">
              Can&apos;t find the email? Please check your Spam or Junk folder.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
            <Button
              type="button"
              variant="ghost"
              className="flex-1 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800/60"
              onClick={() => onOpenChange(false)}
              disabled={isLoading || verdict === "verifying"}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-lg shadow-sky-600/25 transition-all"
              onClick={() => triggerVerify()}
              disabled={
                isLoading ||
                !isComplete ||
                countdown === 0 ||
                verdict === "verifying" ||
                verdict === "ok"
              }
            >
              {verdict === "verifying" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                </>
              ) : verdict === "ok" ? (
                <>
                  <Check className="mr-2 h-4 w-4" /> Verified
                </>
              ) : (
                <>
                  Confirm & Sign In <ArrowRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
