import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { adminService } from "../services/adminService";
import { adminHref } from "../utils/msimamiziMode";
import { useToast } from "@/hooks/use-toast";
import DwelloLogo from "@/components/DwelloLogo";
import CloudflareTurnstile from "@/components/auth/CloudflareTurnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, ShieldCheck, KeyRound, RefreshCw } from "lucide-react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { user, completeSessionLogin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (user && !authLoading && (user.isSuperAdmin || user.role === "superadmin")) {
      setLocation(adminHref("/"));
    }
  }, [user, authLoading, setLocation]);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await adminService.adminLogin(email.trim(), password, turnstileToken);
      if (res.requiresOTP) {
        setOtpEmail(res.email || email.trim());
        setIsOtpStep(true);
        toast({
          title: "Verification Code Sent",
          description: "Enter the 6-digit OTP sent to your administrator email/phone."
        });
      } else if (res.token) {
        completeSessionLogin(res);
        setLocation(adminHref("/"));
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: err.message || "Invalid administrator credentials."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setIsVerifyingOtp(true);
    try {
      const session = await adminService.adminVerifyOtp(otpEmail, otpCode.trim());
      completeSessionLogin(session);
      toast({
        title: "Welcome to Msimamizi",
        description: "Super Administrator session authenticated."
      });
      setLocation(adminHref("/"));
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: err.message || "Invalid or expired OTP."
      });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await adminService.adminResendOtp(otpEmail);
      toast({ title: "New OTP Dispatched", description: "Check your administrator email or phone." });
    } catch (err) {
      toast({ variant: "destructive", title: "Resend Failed", description: err.message });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f4f6fa] dark:bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg overflow-hidden">
        {/* Top MakaziFlow Navy -> Teal Gradient Accent */}
        <div className="h-2 w-full bg-linear-to-r from-[#0a1e35] via-[#0d2240] to-[#00a99d]" />

        {/* Header */}
        <div className="bg-[#0d2240] px-7 py-6 text-center space-y-2 border-b border-[#1a3a5c]">
          <div className="flex justify-center">
            <DwelloLogo />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00a99d]/20 border border-[#00a99d]/40 text-[10.5px] font-bold uppercase tracking-widest text-[#00d4c8]">
            <ShieldCheck className="w-3.5 h-3.5" />
            Msimamizi · Owner Console
          </div>
          <p className="text-xs text-[#a8bfd4]">
            Restricted SaaS Platform Administration
          </p>
        </div>

        {/* Form Body */}
        <div className="p-7">
          {!isOtpStep ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="msimamizi-email" className="text-xs font-semibold">Administrator Email</Label>
                <Input
                  id="msimamizi-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@afrinextech.co.ke"
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="msimamizi-password" className="text-xs font-semibold">Password</Label>
                <div className="relative">
                  <Input
                    id="msimamizi-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter administrator password"
                    className="h-10 text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <CloudflareTurnstile onVerify={setTurnstileToken} />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 bg-[#0d2240] hover:bg-[#132d4a] text-white font-semibold text-sm cursor-pointer"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign In to Msimamizi
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-[#00a99d]/15 text-[#00a99d] flex items-center justify-center mx-auto">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Two-Factor OTP Required</h2>
                <p className="text-xs text-slate-500">
                  Enter the 6-digit verification code dispatched to <strong>{otpEmail}</strong>.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="msimamizi-otp" className="text-xs font-semibold">6-Digit OTP Code</Label>
                <Input
                  id="msimamizi-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="000000"
                  className="h-11 text-center text-lg font-mono tracking-[0.4em]"
                />
              </div>

              <Button
                type="submit"
                disabled={isVerifyingOtp || otpCode.trim().length < 6}
                className="w-full h-10 bg-[#00a99d] hover:bg-[#008f85] text-white font-semibold text-sm cursor-pointer"
              >
                {isVerifyingOtp && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Verify &amp; Enter Console
              </Button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => { setIsOtpStep(false); setOtpCode(""); }}
                  className="text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  ← Use different account
                </button>
                <button
                  type="button"
                  disabled={isResending}
                  onClick={handleResend}
                  className="inline-flex items-center gap-1 font-semibold text-[#00a99d] hover:underline cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isResending ? "animate-spin" : ""}`} />
                  Resend OTP
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <p className="mt-5 text-[11px] text-slate-500 text-center">
        msimamizi.afrinextech.co.ke · MakaziFlow Owner Platform Administration
      </p>
    </div>
  );
}
