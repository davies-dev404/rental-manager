import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff, ShieldCheck, ArrowLeft, RefreshCw, KeyRound, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login, verifyLoginOtp, resendLoginOtp } = useAuth();
  const { toast } = useToast();

  // Mode: 'login' | 'register'
  const [isSignup, setIsSignup] = useState(false);

  // Role: 'admin' (Landlord / Manager) | 'tenant' (Tenant)
  const [role, setRole] = useState("admin");

  // Sign in state
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // OTP Verification state
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpName, setOtpName] = useState("");
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(180);
  const otpInputRef = useRef(null);

  // Sign up state
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupCountryCode, setSignupCountryCode] = useState("+254");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Forgot password dialog
  const [showForgotDialog, setShowForgotDialog] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  // Countdown timer for OTP
  useEffect(() => {
    let timer;
    if (isOtpStep && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOtpStep, otpCountdown]);

  // Focus OTP input when step opens
  useEffect(() => {
    if (isOtpStep && otpInputRef.current) {
      setTimeout(() => otpInputRef.current?.focus(), 150);
    }
  }, [isOtpStep]);

  // Handle Login Credentials Submit
  const handleSignIn = async (e) => {
    if (e) e.preventDefault();
    if (!usernameOrEmail.trim() || !password) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please enter your username/email and password."
      });
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Validate credentials with backend
      const res = await login(usernameOrEmail.trim(), password);

      if (res && res.requiresOTP) {
        // Backend generated an OTP and sent email
        setOtpEmail(res.email || usernameOrEmail.trim());
        setOtpName(res.name || "");
        setIsOtpStep(true);
        setOtpCountdown(180);
        setOtpCode("");

        if (res.emailSent === false) {
          toast({
            variant: "destructive",
            title: "Email Dispatch Issue ⚠️",
            description: `Login code generated, but email sending failed: ${res.emailError || "Please check server SMTP setup"}`
          });
        } else {
          toast({
            title: "Verification Code Sent ✉️",
            description: `A 6-digit verification code has been sent to ${res.email || usernameOrEmail.trim()}`
          });
        }
        return;
      }

      // If token is directly returned
      if (res && res.token) {
        toast({
          title: "Welcome Back",
          description: `Logged in as ${res.name || usernameOrEmail}`
        });
        setLocation("/");
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: err.message || "Invalid email or password."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP Verification Submit
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanOtp = otpCode.replace(/\D/g, "");

    if (cleanOtp.length !== 6) {
      toast({
        variant: "destructive",
        title: "Incomplete Code",
        description: "Please enter the full 6-digit verification code."
      });
      return;
    }

    setIsOtpVerifying(true);
    try {
      const res = await verifyLoginOtp(otpEmail, cleanOtp);
      toast({
        title: "Welcome Back! 👋",
        description: `Logged in as ${res?.name || "User"}`
      });
      setLocation("/");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: err.message || "Invalid or expired verification code. Please check and try again."
      });
    } finally {
      setIsOtpVerifying(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (isResendingOtp || otpCountdown > 150) return;
    setIsResendingOtp(true);
    try {
      const res = await resendLoginOtp(otpEmail);
      setOtpCountdown(180);
      if (res && res.emailSent === false) {
        toast({
          variant: "destructive",
          title: "Resend Warning ⚠️",
          description: `Email sending failed: ${res.emailError || "Check SMTP setup"}`
        });
      } else {
        toast({
          title: "Code Resent ✉️",
          description: `A new 6-digit verification code was sent to ${otpEmail}.`
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Resend Failed",
        description: err.message || "Could not resend verification code. Please try again."
      });
    } finally {
      setIsResendingOtp(false);
    }
  };

  // Format mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Handle Register
  const handleSignUp = async (e) => {
    if (e) e.preventDefault();
    if (!signupUsername.trim() || !signupEmail.trim() || !signupPassword) {
      toast({
        variant: "destructive",
        title: "Required Fields",
        description: "Please fill in username, email, and password."
      });
      return;
    }

    if (signupPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "Weak Password",
        description: "Password must be at least 8 characters long."
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        variant: "destructive",
        title: "Terms & Privacy Agreement",
        description: "Please agree to the Terms and Conditions and Privacy Policy."
      });
      return;
    }

    setIsLoading(true);
    try {
      const fullPhone = signupPhone ? `${signupCountryCode}${signupPhone.replace(/^0+/, "")}` : "";
      const regRes = await api.registerUser({
        name: signupUsername,
        email: signupEmail,
        password: signupPassword,
        phone: fullPhone,
        role: "admin"
      });

      // If backend requires verification
      if (regRes?.requiresVerification) {
        setOtpEmail(signupEmail);
        setOtpName(signupUsername);
        setIsSignup(false);
        setIsOtpStep(true);
        setOtpCountdown(600);
        setOtpCode("");
        toast({
          title: "Account Created! ",
          description: "Please enter the verification code sent to your email to verify your account."
        });
        return;
      }

      const newUser = {
        id: "USR-" + Date.now().toString().slice(-4),
        name: signupUsername,
        email: signupEmail,
        phone: fullPhone,
        role: "admin",
        token: "auth-token-" + Date.now()
      };
      localStorage.setItem("rental_user", JSON.stringify(newUser));

      toast({
        title: "Account Created! 🎉",
        description: "Welcome to MakaziFlow."
      });
      setLocation("/");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: err.message || "Could not complete registration."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Forgot Password Submit
  const handleForgotSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!forgotEmail) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please provide your account email address."
      });
      return;
    }

    setIsForgotLoading(true);
    try {
      await api.forgotPassword(forgotEmail);
      toast({
        title: "Reset Code Dispatched",
        description: `Password reset instructions have been sent to ${forgotEmail}.`
      });
      setShowForgotDialog(false);
      setForgotEmail("");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Request Failed",
        description: err.message || "Could not process password reset request."
      });
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white px-4 py-8 font-sans select-none">
      
      {/* ────────────────── 1. OTP VERIFICATION VIEW ────────────────── */}
      {isOtpStep ? (
        <div className="w-full max-w-sm flex flex-col items-center animate-in fade-in duration-200">
          
          {/* Brand Logo Header */}
          <div className="flex flex-col items-center justify-center mb-5">
            <img src="/logo.png" alt="MakaziFlow" className="h-20 w-auto object-contain" />
          </div>

          {/* Security Badge Icon */}
          <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2f55d4] flex items-center justify-center mb-3 shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Two-Factor Verification
          </h2>
          <p className="text-xs text-slate-500 text-center mb-6 max-w-xs leading-relaxed">
            We sent a 6-digit verification code to{" "}
            <span className="font-semibold text-slate-800 break-all">{otpEmail}</span>.
            Please enter it below to sign in.
          </p>

          {/* OTP Form */}
          <form onSubmit={handleVerifyOtp} className="w-full space-y-4">
            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1.5 text-center">
                Enter 6-Digit Code
              </label>
              
              {/* Single formatted input with large spaced numbers */}
              <div className="relative">
                <input
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtpCode(val);
                  }}
                  placeholder="••••••"
                  className="w-full h-12 text-center text-2xl font-mono tracking-[0.5em] font-bold bg-slate-50 border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-[#2f55d4] focus:bg-white transition-all shadow-2xs"
                />
              </div>

              {/* Countdown / Expiry indicator */}
              <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                <span>
                  Expires in:{" "}
                  <strong className={otpCountdown < 30 ? "text-red-500" : "text-slate-700"}>
                    {formatTime(otpCountdown)}
                  </strong>
                </span>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResendingOtp || otpCountdown > 120}
                  className="text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline cursor-pointer flex items-center gap-1"
                >
                  {isResendingOtp && <Loader2 className="w-3 h-3 animate-spin" />}
                  Resend Code
                </button>
              </div>
            </div>

            {/* Verify & Sign In Button */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isOtpVerifying || otpCode.replace(/\D/g, "").length !== 6}
                className="w-full h-10 bg-[#06083b] hover:bg-[#0b1065] text-white font-medium text-xs rounded-md shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isOtpVerifying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Verifying Code...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                    Verify & Sign In
                  </>
                )}
              </Button>
            </div>

            {/* Back Button */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsOtpStep(false);
                  setOtpCode("");
                }}
                className="text-xs text-slate-600 hover:text-slate-900 hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Sign In
              </button>
            </div>
          </form>
        </div>
      ) : !isSignup ? (
        /* ────────────────── 2. SIGN IN VIEW (Screenshot 1) ────────────────── */
        <div className="w-full max-w-sm flex flex-col items-center animate-in fade-in duration-200">
          
          {/* Brand Logo Header */}
          <div className="flex flex-col items-center justify-center mb-6">
            <img src="/logo.png" alt="MakaziFlow" className="h-24 w-auto object-contain" />
          </div>

          {/* Role Switcher Tabs */}
          <div className="inline-flex rounded-md shadow-xs mb-6">
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`px-5 py-2 text-xs font-semibold rounded-l-md transition-colors cursor-pointer ${
                role === "admin"
                  ? "bg-[#3b49df] text-white"
                  : "bg-slate-500 text-white hover:bg-slate-600"
              }`}
            >
              Landlord / Manager
            </button>
            <button
              type="button"
              onClick={() => setRole("tenant")}
              className={`px-6 py-2 text-xs font-semibold rounded-r-md transition-colors cursor-pointer ${
                role === "tenant"
                  ? "bg-[#3b49df] text-white"
                  : "bg-slate-500 text-white hover:bg-slate-600"
              }`}
            >
              Tenant
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSignIn} className="w-full space-y-3.5">
            {/* Username / Email Input */}
            <div>
              <input
                type="text"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="Enter username"
                className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors shadow-2xs"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full h-10 px-3 pr-10 text-xs bg-white border border-slate-300 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Sign In Button */}
            <div className="pt-1">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-[#06083b] hover:bg-[#0b1065] text-white font-medium text-xs rounded-md shadow-xs transition-colors cursor-pointer"
              >
                {isLoading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                Sign In
              </Button>
            </div>

            {/* Bottom Links */}
            <div className="flex items-center justify-between pt-2 text-xs text-slate-700">
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(usernameOrEmail);
                  setShowForgotDialog(true);
                }}
                className="hover:underline cursor-pointer"
              >
                Forgot Password
              </button>

              <button
                type="button"
                onClick={() => setIsSignup(true)}
                className="hover:underline cursor-pointer"
              >
                Register
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ────────────────── 3. CREATE ACCOUNT VIEW (Screenshot 2) ────────────────── */
        <div className="w-full max-w-md flex flex-col items-center animate-in fade-in duration-200">
          
          {/* Brand Logo Header */}
          <div className="flex flex-col items-center justify-center mb-1">
            <img src="/logo.png" alt="MakaziFlow" className="h-20 w-auto object-contain" />
          </div>

          <h2 className="text-base font-normal text-slate-800 mb-6">
            Create Account
          </h2>

          {/* Registration Form */}
          <form onSubmit={handleSignUp} className="w-full space-y-4">
            
            {/* Input 1: Enter your Username */}
            <div>
              <input
                type="text"
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
                placeholder="Enter your Username"
                className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors shadow-2xs"
              />
            </div>

            {/* Input 2: Enter your email */}
            <div>
              <input
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors shadow-2xs"
              />
            </div>

            {/* Input 3: Phone with country code */}
            <div>
              <div className="flex items-center rounded-md border border-slate-300 bg-white overflow-hidden shadow-2xs focus-within:border-blue-500">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border-r border-slate-200 text-xs text-slate-700">
                  <span>🇰🇪</span>
                  <select
                    value={signupCountryCode}
                    onChange={(e) => setSignupCountryCode(e.target.value)}
                    className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="+254">+254</option>
                    <option value="+255">+255</option>
                    <option value="+256">+256</option>
                    <option value="+250">+250</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                  </select>
                </div>
                <input
                  type="tel"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                  placeholder="712345678"
                  className="flex-1 h-10 px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                The phone number should be in international format: country code then phone number.
              </p>
            </div>

            {/* Input 4: Enter Password */}
            <div>
              <div className="relative">
                <input
                  type={showSignupPassword ? "text" : "password"}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Enter Password"
                  className="w-full h-10 px-3 pr-10 text-xs bg-white border border-slate-300 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                The password should be unique and be at least 8 characters .
              </p>
            </div>

            {/* Checkbox: Terms & Privacy */}
            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="terms-check"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#4f46e5] focus:ring-[#4f46e5] cursor-pointer"
              />
              <label htmlFor="terms-check" className="text-xs text-slate-600 leading-snug cursor-pointer">
                I agree to the{" "}
                <Link href="/terms" target="_blank" className="text-slate-900 font-semibold hover:underline">
                  Terms and Conditions
                </Link>{" "}
                and{" "}
                <Link href="/privacy" target="_blank" className="text-slate-900 font-semibold hover:underline">
                  Privacy Policy
                </Link>{" "}
                of MakaziFlow
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-medium text-xs rounded-md shadow-xs transition-colors cursor-pointer"
              >
                {isLoading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                Create Account
              </Button>
            </div>

            {/* Bottom Links */}
            <div className="flex items-center justify-between pt-2 text-xs text-slate-700">
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(signupEmail);
                  setShowForgotDialog(true);
                }}
                className="hover:underline cursor-pointer"
              >
                Forgot Password
              </button>

              <button
                type="button"
                onClick={() => setIsSignup(false)}
                className="hover:underline cursor-pointer"
              >
                Login
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Forgot Password Modal */}
      <Dialog open={showForgotDialog} onOpenChange={setShowForgotDialog}>
        <DialogContent className="max-w-md p-6 bg-white border border-slate-200 rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Reset Your Password
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Enter your registered email address and we will send you instructions to reset your password.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleForgotSubmit} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                Email Address
              </label>
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-md text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowForgotDialog(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isForgotLoading}
                size="sm"
                className="bg-[#0b1065] hover:bg-[#161c8a] text-white text-xs font-semibold"
              >
                {isForgotLoading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                Send Reset Link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
