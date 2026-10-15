import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Building2, ShieldCheck, ArrowRight, CheckCircle2, KeyRound, Mail, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import logo from "@/assets/logo.png";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import ErrorBoundary from '@/components/ErrorBoundary';
import PasswordStrengthIndicator from "@/components/ui/PasswordStrengthIndicator";
import { validatePassword } from "@/lib/passwordPolicy";
import OrbitOtpModal from "@/components/auth/OrbitOtpModal";
/* ─────────── Constants ─────────── */
const FEATURES = [
  "Manage multiple properties & units",
  "Track rent payments & expenses",
  "Automated tenant reminders",
  "Multi-currency & multi-language support",
];

const inputCls =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm " +
  "ring-offset-background placeholder:text-muted-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/* ─────────── SVG Icons ─────────── */
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.29.07 2.18.74 2.94.8 1.12-.21 2.19-.91 3.38-.84 1.44.09 2.52.68 3.22 1.73-2.95 1.77-2.23 5.65.32 6.73-.63 1.52-1.45 3.01-1.86 4.46zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

/* ─────────── Standalone shared sub-components (outside LoginPage!) ─────────── */
function SocialButtons({ onSocial, isLoading }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button
          id="btn-google-signin"
          type="button"
          disabled={isLoading}
          onClick={() => onSocial("Google")}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted hover:border-primary/40 transition-all duration-150 active:scale-[0.98] shadow-sm disabled:opacity-60"
        >
          <GoogleIcon /> Google
        </button>
        <button
          id="btn-apple-signin"
          type="button"
          disabled={isLoading}
          onClick={() => onSocial("Apple")}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted hover:border-primary/40 transition-all duration-150 active:scale-[0.98] shadow-sm disabled:opacity-60"
        >
          <AppleIcon /> Apple
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground px-1">or continue with email</span>
        <div className="flex-1 h-px bg-border" />
      </div>
    </div>
  );
}

function HeroPanel({ headlineLine1, headlineLine2, sub }) {
  return (
    <div
      className="hidden lg:flex lg:w-[48%] flex-col justify-between p-12 relative overflow-hidden text-white bg-white/10 backdrop-blur-lg bg-linear-to-br from-primary/20 via-transparent to-primary/10"
    >
      {/* High-res Modern Architectural Property Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=85')`,
        }}
      />
      {/* Sleek Deep Overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 58, 138, 0.85) 50%, rgba(13, 148, 136, 0.78) 100%)",
        }}
      />
      <div className="absolute inset-0 backdrop-blur-[1.5px]" />
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />

      {/* Branding */}
      <div className="relative flex items-center gap-3 z-10">
        <div className="w-11 h-11 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
          <img src={logo} alt="Dwello" className="w-7 h-7 object-contain" />
        </div>
        <div>
          <span className="text-white font-heading font-bold text-2xl tracking-tight block">Dwello</span>
          <span className="text-white/60 text-[11px] uppercase tracking-wider block">Enterprise Property OS</span>
        </div>
      </div>

      {/* Content & Value Proposition */}
      <div className="relative z-10 space-y-8 my-auto py-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-white/20 bg-white/10 text-white/95 backdrop-blur-md shadow-sm">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" /> Smart Property Management & Billing
          </div>
          <h1 className="text-4xl xl:text-5xl font-heading font-bold text-white leading-[1.15] drop-shadow-sm">
            {headlineLine1}<br />
            <span className="text-emerald-400 font-extrabold">{headlineLine2}</span>
          </h1>
          <p className="text-white/80 text-base leading-relaxed max-w-md font-light">{sub}</p>
        </div>

        {/* Floating Feature & Live Stats Badge */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 space-y-1">
            <p className="text-xs text-white/70">Rent & Utility Collections</p>
            <p className="text-lg font-bold text-white tracking-tight">100% Automated</p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 space-y-1">
            <p className="text-xs text-white/70">Personalized Reminders</p>
            <p className="text-lg font-bold text-emerald-300 tracking-tight">Targeted SMS & Email</p>
          </div>
        </div>

        <ul className="space-y-3">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-3 text-white/90 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Footer Credentials */}
      <div className="relative z-10 border-t border-white/15 pt-5 flex items-center justify-between text-xs text-white/70">
        <span>Trusted by landlords across East Africa</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          System Live
        </span>
      </div>
    </div>
  );
}

function MobileLogo() {
  return (
    <div className="flex lg:hidden items-center gap-3 mb-2">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "hsl(221,83%,53%)" }}>
        <img src={logo} alt="Dwello" className="w-6 h-6 object-contain mix-blend-screen" />
      </div>
      <span className="font-heading font-bold text-xl">Dwello</span>
    </div>
  );
}

/* ─────────── OAuth Credentials ─────────── */
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const appleClientId = import.meta.env.VITE_APPLE_CLIENT_ID;

/* ─────────── Main Component ─────────── */
function LoginContent() {
  const { login, verifyLoginOtp, resendLoginOtp, socialLogin } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  // Social Auth Modal state (for quick-connect or when OAuth client ID is not configured yet)
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [activeSocialProvider, setActiveSocialProvider] = useState("google");
  const [socialEmail, setSocialEmail] = useState("");
  const [socialName, setSocialName] = useState("");
  const [socialRole, setSocialRole] = useState("admin");
  const [isSocialSubmitting, setIsSocialSubmitting] = useState(false);

  // Login state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [caretakerEmail, setCaretakerEmail] = useState("");
  const [caretakerPassword, setCaretakerPassword] = useState("");

  // Signup state
  const [signupData, setSignupData] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "", role: "admin",
  });
  // Signup OTP state
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(180);

  // Login OTP state
  const [showLoginOTP, setShowLoginOTP] = useState(false);
  const [loginOtpValue, setLoginOtpValue] = useState("");
  const [loginOtpEmail, setLoginOtpEmail] = useState("");
  const [loginOtpCountdown, setLoginOtpCountdown] = useState(180);

  // Password visibility states
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirm, setShowForgotConfirm] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showCaretakerPassword, setShowCaretakerPassword] = useState(false);

  useEffect(() => {
    let t;
    if (showOTP && countdown > 0) t = setInterval(() => setCountdown((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [showOTP, countdown]);

  useEffect(() => {
    let t;
    if (showLoginOTP && loginOtpCountdown > 0) t = setInterval(() => setLoginOtpCountdown((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [showLoginOTP, loginOtpCountdown]);

  const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handleLogin = async (role) => {
    const email = role === "admin" ? adminEmail : caretakerEmail;
    const password = role === "admin" ? adminPassword : caretakerPassword;
    if (!email || !password) {
      toast({ variant: "destructive", title: "Error", description: "Please fill in all fields" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (result?.requiresOTP) {
        setLoginOtpEmail(result.email);
        setLoginOtpValue("");
        setLoginOtpCountdown(180);
        setShowLoginOTP(true);
        toast({
          title: "Verification Code Sent ✉️",
          description: `A 6-digit code was sent to ${result.email}. Check your inbox.`
        });
      } else {
        setLocation("/");
      }
    } catch (_) {
      // error toast handled in auth context
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyLoginOtp = async (codeValue) => {
    const code = codeValue || loginOtpValue;
    if (!code || code.length < 6) {
      toast({ variant: "destructive", title: "Invalid Code", description: "Please enter the full 6-digit code" });
      throw new Error("Please enter the full 6-digit code");
    }
    setIsLoading(true);
    try {
      await verifyLoginOtp(loginOtpEmail, code);
      setShowLoginOTP(false);
      setLocation("/");
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const initiateSignup = async () => {
    if (!signupData.name || !signupData.email || !signupData.password || !signupData.confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "Please fill in all required fields" });
      return;
    }
    if (signupData.password !== signupData.confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "Passwords do not match" });
      return;
    }
    const policyResult = validatePassword(signupData.password);
    if (!policyResult.valid) {
      toast({ variant: "destructive", title: "Weak Password", description: policyResult.message });
      return;
    }
    setIsLoading(true);
    try {
      await api.registerUser(signupData);
      setShowOTP(true);
      setCountdown(180);
      toast({ title: "Verification Code Sent", description: "Check your email for the 6-digit code." });
    } catch (error) {
      toast({ variant: "destructive", title: "Signup Failed", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length < 6) {
      toast({ variant: "destructive", title: "Invalid Code", description: "Code must be 6 digits" });
      return;
    }
    setIsLoading(true);
    try {
      await api.verifyEmail(signupData.email, otp);
      toast({ title: "Account Verified! 🎉", description: "You can now sign in with your credentials." });
      setShowOTP(false);
      setIsSignup(false);
      setAdminEmail(signupData.email);
      setSignupData({ name: "", email: "", phone: "", password: "", confirmPassword: "", role: "admin" });
      setOtp("");
    } catch (error) {
      toast({ variant: "destructive", title: "Verification Failed", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger Google / Apple OAuth flow
  // Google One‑Tap response handler
  const handleGoogleResponse = async (response) => {
    if (response?.credential) {
      setIsLoading(true);
      try {
        await socialLogin("google", {
          credential: response.credential,
          role: signupData.role || "admin",
        });
        setLocation("/");
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Init Google One‑Tap once
  const googleInitDone = useRef(false);
  useEffect(() => {
    if (!googleInitDone.current && googleClientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleResponse,
        });
        googleInitDone.current = true;
      } catch (e) {
        console.warn("Google One Tap init failed:", e);
      }
    }
  }, [googleClientId]);

  const handleSocialLogin = async (provider) => {
    const provLower = provider.toLowerCase();

    // 1. Google OAuth flow
    if (provLower === "google") {
      if (window.google?.accounts?.id && googleClientId) {
        try {
          window.google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              // FedCM aborted, user not signed in to Google, or One-Tap blocked
              setActiveSocialProvider("google");
              setSocialRole(isSignup ? signupData.role || "admin" : "admin");
              setSocialModalOpen(true);
            }
          });
        } catch (err) {
          console.warn("Google prompt error, opening fallback modal:", err);
          setActiveSocialProvider("google");
          setSocialRole(isSignup ? signupData.role || "admin" : "admin");
          setSocialModalOpen(true);
        }
      } else {
        // Fallback modal when SDK not loaded or client id missing
        setActiveSocialProvider("google");
        setSocialRole(isSignup ? signupData.role || "admin" : "admin");
        setSocialModalOpen(true);
      }
      return;
    }

    // 2. Apple OAuth flow
    if (provLower === "apple") {
      if (window.AppleID?.auth && appleClientId) {
        try {
          window.AppleID.auth.init({
            clientId: appleClientId,
            scope: "name email",
            redirectURI: window.location.origin + "/login",
            usePopup: true,
          });
          const response = await window.AppleID.auth.signIn();
          if (response?.authorization?.id_token) {
            setIsLoading(true);
            try {
              await socialLogin("apple", {
                id_token: response.authorization.id_token,
                user: response.user,
                role: signupData.role || "admin",
              });
              setLocation("/");
            } finally {
              setIsLoading(false);
            }
            return;
          }
        } catch (e) {
          console.warn("Apple Sign-In popup failed/cancelled:", e);
        }
      }

      // If Apple Client ID not set or cancelled, open sleek modal
      setActiveSocialProvider("apple");
      setSocialRole(isSignup ? signupData.role || "admin" : "admin");
      setSocialModalOpen(true);
    }
  };

  // Submit through the verified social auth endpoint
  const handleSocialSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!socialEmail) {
      toast({ variant: "destructive", title: "Error", description: "Please enter your email" });
      return;
    }
    setIsSocialSubmitting(true);
    try {
      await socialLogin(activeSocialProvider, {
        email: socialEmail.trim(),
        name: socialName.trim() || undefined,
        role: socialRole,
      });
      setSocialModalOpen(false);
      setLocation("/");
    } catch (err) {
      // error toast handled in socialLogin
    } finally {
      setIsSocialSubmitting(false);
    }
  };

  // Forgot password flow state
  const [showForgotDialog, setShowForgotDialog] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: enter email, 2: enter code & new password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  const openForgotPassword = (initialEmail = "") => {
    const emailToUse = initialEmail || adminEmail || caretakerEmail || "";
    if (!emailToUse) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your email address before resetting password",
      });
      return;
    }
    setForgotEmail(emailToUse);
    setForgotStep(1);
    setForgotCode("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setShowForgotDialog(true);
  };

  const handleRequestResetCode = async (e) => {
    if (e) e.preventDefault();
    if (!forgotEmail) {
      toast({ variant: "destructive", title: "Error", description: "Please enter your email address" });
      return;
    }
    setIsForgotLoading(true);
    try {
      const res = await api.forgotPassword(forgotEmail);
      toast({
        title: "Reset Code Sent ✉️",
        description: res.message || "A 6-digit verification code has been sent to your email."
      });
      setForgotStep(2);
    } catch (err) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!forgotCode || !forgotNewPassword || !forgotConfirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "Please fill in all fields" });
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "Passwords do not match" });
      return;
    }
    const policyResult = validatePassword(forgotNewPassword);
    if (!policyResult.valid) {
      toast({ variant: "destructive", title: "Weak Password", description: policyResult.message });
      return;
    }
    setIsForgotLoading(true);
    try {
      const res = await api.resetPassword(forgotEmail, forgotCode.trim(), forgotNewPassword);
      toast({
        title: "Password Reset! 🎉",
        description: res.message || "Your password has been reset. You can now log in."
      });
      setShowForgotDialog(false);
      setAdminEmail(forgotEmail);
      setCaretakerEmail(forgotEmail);
      setAdminPassword("");
      setCaretakerPassword("");
    } catch (err) {
      toast({ variant: "destructive", title: "Reset Failed", description: err.message });
    } finally {
      setIsForgotLoading(false);
    }
  };

  /* ════════════════ SIGN UP VIEW ════════════════ */
  if (isSignup) {
    return (
      <div className="min-h-screen flex bg-background">
        <HeroPanel
          headlineLine1="Start managing"
          headlineLine2="smarter today"
          sub="Join thousands of landlords using Dwello to streamline their rental operations."
        />

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-12 xl:px-16 overflow-y-auto">
          <div className="w-full max-w-105 space-y-5">
            <MobileLogo />

            <div className="space-y-1">
              <h2 className="text-2xl font-heading font-bold">Create your account</h2>
              <p className="text-sm text-muted-foreground">Join Dwello to manage your properties</p>
            </div>

            <SocialButtons onSocial={handleSocialLogin} isLoading={isLoading} />

            {/* Role pills */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">I am a</Label>
              <div className="grid grid-cols-2 gap-2">
                {["admin", "caretaker"].map((r) => (
                  <button
                    key={r}
                    id={`signup-role-${r}`}
                    onClick={() => setSignupData((p) => ({ ...p, role: r }))}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all duration-150 ${
                      signupData.role === r
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {r === "admin" ? "Admin / Landlord" : "Caretaker"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="su-name" className="text-sm font-medium">Full Name</Label>
                <input id="su-name" className={inputCls} placeholder="John Doe"
                  value={signupData.name} onChange={(e) => setSignupData((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="su-email" className="text-sm font-medium">Email address</Label>
                <input id="su-email" type="email" className={inputCls} placeholder="you@example.com"
                  value={signupData.email} onChange={(e) => setSignupData((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="su-phone" className="text-sm font-medium">
                  Phone <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <input id="su-phone" type="tel" className={inputCls} placeholder="+254..."
                  value={signupData.phone} onChange={(e) => setSignupData((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-pass" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <input id="su-pass" type={showSignupPassword ? "text" : "password"} className={`${inputCls} pr-9`} placeholder="••••••••"
                    value={signupData.password} onChange={(e) => setSignupData((p) => ({ ...p, password: e.target.value }))} />
                  <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-confirm" className="text-sm font-medium">Confirm</Label>
                <div className="relative">
                  <input id="su-confirm" type={showSignupConfirm ? "text" : "password"} className={`${inputCls} pr-9`} placeholder="••••••••"
                    value={signupData.confirmPassword} onChange={(e) => setSignupData((p) => ({ ...p, confirmPassword: e.target.value }))} />
                  <button type="button" onClick={() => setShowSignupConfirm(!showSignupConfirm)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showSignupConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="col-span-2">
                <PasswordStrengthIndicator password={signupData.password} />
              </div>
            </div>

            <Button id="btn-signup-submit"
              className="w-full h-10 font-semibold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              onClick={initiateSignup} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Account
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              By signing up you agree to our{" "}
              <a href="/terms" className="text-primary hover:underline">Terms</a>{" "}and{" "}
              <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button className="text-primary hover:underline font-medium" onClick={() => setIsSignup(false)}>
                Sign in
              </button>
            </p>
          </div>
        </div>

        {/* ── Orbit Signup OTP Verification Modal ── */}
        <OrbitOtpModal
          open={showOTP}
          onOpenChange={setShowOTP}
          email={signupData.email}
          countdown={countdown}
          onVerify={async (code) => {
            await api.verifyEmail(signupData.email, code);
            toast({ title: "Account Verified! 🎉", description: "You can now sign in with your credentials." });
            setShowOTP(false);
            setIsSignup(false);
            setAdminEmail(signupData.email);
            setSignupData({ name: "", email: "", phone: "", password: "", confirmPassword: "", role: "admin" });
            setOtp("");
          }}
          onResend={async () => {
            setIsLoading(true);
            try {
              await api.registerUser(signupData);
              setCountdown(180);
              toast({ title: "Code Resent", description: "A new 6-digit verification code was sent to your email." });
            } finally {
              setIsLoading(false);
            }
          }}
          isLoading={isLoading}
          title="Verify Account"
          description={
            <>
              We sent a 6-digit code to{" "}
              <span className="font-semibold text-slate-200">{signupData.email}</span>.
              {signupData.phone ? ` An SMS was also sent to ${signupData.phone}.` : ""}
            </>
          }
        />
      </div>
    );
  }

  /* ════════════════ SIGN IN VIEW ════════════════ */
  return (
    <div className="min-h-screen flex bg-background">
      <HeroPanel
        headlineLine1="Manage your"
        headlineLine2="properties with ease"
        sub="Everything you need to run your rental business — tenant management, payments & reporting."
      />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-12 xl:px-16">
        <div className="w-full max-w-105 space-y-6">
          <MobileLogo />

          <div className="space-y-1">
            <h2 className="text-2xl font-heading font-bold text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to access your dashboard</p>
          </div>

          <SocialButtons onSocial={handleSocialLogin} isLoading={isLoading} />

          <Tabs defaultValue="admin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-10 mb-4">
              <TabsTrigger value="admin" className="text-sm">Admin / Landlord</TabsTrigger>
              <TabsTrigger value="caretaker" className="text-sm">Caretaker</TabsTrigger>
            </TabsList>

            {/* Admin tab */}
            <TabsContent value="admin" className="space-y-4 mt-0">
              <div className="space-y-1.5">
                <Label htmlFor="admin-email" className="text-sm font-medium">Email address</Label>
                <input id="admin-email" type="email" className={inputCls} placeholder="admin@example.com"
                  value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin("admin")} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="admin-pass" className="text-sm font-medium">Password</Label>
                  <button
                    type="button"
                    onClick={() => openForgotPassword(adminEmail)}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input id="admin-pass" type={showAdminPassword ? "text" : "password"} className={`${inputCls} pr-9`} placeholder="••••••••"
                    value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin("admin")} />
                  <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button id="btn-admin-signin"
                className="w-full h-10 font-semibold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                onClick={() => handleLogin("admin")} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Sign In
              </Button>
            </TabsContent>

            {/* Caretaker tab */}
            <TabsContent value="caretaker" className="space-y-4 mt-0">
              <div className="space-y-1.5">
                <Label htmlFor="caretaker-email" className="text-sm font-medium">Email address</Label>
                <input id="caretaker-email" type="email" className={inputCls} placeholder="caretaker@example.com"
                  value={caretakerEmail} onChange={(e) => setCaretakerEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin("caretaker")} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="caretaker-pass" className="text-sm font-medium">Password</Label>
                  <button
                    type="button"
                    onClick={() => openForgotPassword(caretakerEmail)}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input id="caretaker-pass" type={showCaretakerPassword ? "text" : "password"} className={`${inputCls} pr-9`} placeholder="••••••••"
                    value={caretakerPassword} onChange={(e) => setCaretakerPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin("caretaker")} />
                  <button type="button" onClick={() => setShowCaretakerPassword(!showCaretakerPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showCaretakerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button id="btn-caretaker-signin"
                className="w-full h-10 font-semibold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                onClick={() => handleLogin("caretaker")} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Sign In
              </Button>
            </TabsContent>
          </Tabs>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <button id="btn-goto-signup" className="text-primary hover:underline font-medium"
              onClick={() => setIsSignup(true)}>
              Create account
            </button>
          </p>
        </div>
      </div>

      {/* ── Orbit Login OTP Verification Modal ── */}
      <OrbitOtpModal
        open={showLoginOTP}
        onOpenChange={setShowLoginOTP}
        email={loginOtpEmail}
        countdown={loginOtpCountdown}
        onVerify={handleVerifyLoginOtp}
        onResend={async () => {
          setIsLoading(true);
          try {
            await resendLoginOtp(loginOtpEmail);
            setLoginOtpCountdown(180);
          } finally {
            setIsLoading(false);
          }
        }}
        isLoading={isLoading}
        title="Verify Identity"
        description={
          <>
            We sent a 6-digit security code to{" "}
            <span className="font-semibold text-slate-200">{loginOtpEmail}</span>.
            Enter it below to complete sign-in.
          </>
        }
      />

      {/* Forgot Password Dialog */}

      <Dialog open={showForgotDialog} onOpenChange={setShowForgotDialog}>
        <DialogContent className="sm:max-w-md bg-white/10 backdrop-blur-lg border border-white/20">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              {forgotStep === 1 ? (
                <Mail className="w-6 h-6 text-primary" />
              ) : (
                <KeyRound className="w-6 h-6 text-primary" />
              )}
            </div>
            <DialogTitle className="text-center">
              {forgotStep === 1 ? "Forgot Password" : "Reset Password"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {forgotStep === 1
                ? "Enter your registered email address and we'll send you a 6-digit verification code."
                : `Enter the code sent to ${forgotEmail} along with your new password.`}
            </DialogDescription>
          </DialogHeader>

          {forgotStep === 1 ? (
            <form onSubmit={handleRequestResetCode} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email" className="text-sm font-medium">Email address</Label>
                <input
                  id="forgot-email"
                  type="email"
                  className={inputCls}
                  placeholder="your-email@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForgotDialog(false)}
                  disabled={isForgotLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isForgotLoading || !forgotEmail}
                  className="font-medium"
                >
                  {isForgotLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Code...
                    </>
                  ) : (
                    "Send Reset Code"
                  )}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="forgot-code" className="text-sm font-medium">6-Digit Code</Label>
                <input
                  id="forgot-code"
                  type="text"
                  maxLength={6}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-center text-xl tracking-[0.3em] font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="123456"
                  value={forgotCode}
                  onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ""))}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="forgot-new-pass" className="text-sm font-medium">New Password</Label>
                <div className="relative">
                  <input
                    id="forgot-new-pass"
                    type={showForgotNewPassword ? "text" : "password"}
                    className={`${inputCls} pr-9`}
                    placeholder="At least 8 characters"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowForgotNewPassword(!showForgotNewPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="forgot-confirm-pass" className="text-sm font-medium">Confirm Password</Label>
                <div className="relative">
                  <input
                    id="forgot-confirm-pass"
                    type={showForgotConfirm ? "text" : "password"}
                    className={`${inputCls} pr-9`}
                    placeholder="Re-enter new password"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowForgotConfirm(!showForgotConfirm)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showForgotConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <PasswordStrengthIndicator password={forgotNewPassword} />

              <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                <span>Didn&apos;t get the code?</span>
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={handleRequestResetCode}
                  disabled={isForgotLoading}
                >
                  Resend code
                </button>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForgotStep(1)}
                  disabled={isForgotLoading}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isForgotLoading ||
                    forgotCode.length < 6 ||
                    !forgotNewPassword ||
                    !forgotConfirmPassword
                  }
                  className="font-medium"
                >
                  {isForgotLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Social Account Quick Connect Dialog (for OAuth fallback & developer configuration) */}
      <Dialog open={socialModalOpen} onOpenChange={setSocialModalOpen}>
        <DialogContent className="sm:max-w-md bg-white/10 backdrop-blur-lg border border-white/20">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              {activeSocialProvider === "google" ? <GoogleIcon /> : <AppleIcon />}
            </div>
            <DialogTitle className="text-center capitalize">
              Continue with {activeSocialProvider}
            </DialogTitle>
            <DialogDescription className="text-center">
              Connect your {activeSocialProvider === "google" ? "Google Account" : "Apple ID"} to immediately access your Dwello portfolio without passwords.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSocialSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="soc-email" className="text-sm font-medium">
                {activeSocialProvider === "google" ? "Google Email" : "Apple ID Email"}
              </Label>
              <input
                id="soc-email"
                type="email"
                className={inputCls}
                placeholder={activeSocialProvider === "google" ? "name@gmail.com" : "name@icloud.com"}
                value={socialEmail}
                onChange={(e) => setSocialEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="soc-name" className="text-sm font-medium">Full Name (optional)</Label>
              <input
                id="soc-name"
                type="text"
                className={inputCls}
                placeholder="e.g. Alex Morgan"
                value={socialName}
                onChange={(e) => setSocialName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {["admin", "caretaker"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSocialRole(r)}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all duration-150 ${
                      socialRole === r
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {r === "admin" ? "Admin / Landlord" : "Caretaker"}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSocialModalOpen(false)}
                disabled={isSocialSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSocialSubmitting || !socialEmail}
                className="font-medium"
              >
                {isSocialSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Authenticating...
                  </>
                ) : (
                  `Sign in with ${activeSocialProvider === "google" ? "Google" : "Apple"}`
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LoginPage() {
  return (
    <ErrorBoundary>
      <LoginContent />
    </ErrorBoundary>
  );
}
