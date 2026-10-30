import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { ChevronDown, ArrowRight, Menu, X } from "lucide-react";

export default function PublicNavbar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUsecasesOpen, setIsUsecasesOpen] = useState(false);

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

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#1f1f22] text-white backdrop-blur">
      <div className="mx-auto flex min-h-18 w-full max-w-7xl items-center justify-between gap-6 px-4 sm:min-h-20 sm:px-6 lg:px-8">
        
        {/* Brand Logo - pure text brand mark as Bomahut does */}
        <Link href="/" className="flex items-center cursor-pointer group">
          <span className="text-2xl font-black tracking-tight select-none">
            <span className="text-white">Makazi</span><span className="text-[#00d084]">Flow</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-8 md:flex text-sm font-medium text-slate-200">
          <Link
            href="/features"
            className={`transition-colors hover:text-white ${
              location === "/features" ? "text-white font-semibold underline underline-offset-8 decoration-2 decoration-[#007AFF]" : ""
            }`}
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className={`transition-colors hover:text-white ${
              location === "/pricing" ? "text-white font-semibold underline underline-offset-8 decoration-2 decoration-[#007AFF]" : ""
            }`}
          >
            Pricing
          </Link>
          <Link
            href="/faqs"
            className={`transition-colors hover:text-white ${
              location === "/faqs" ? "text-white font-semibold underline underline-offset-8 decoration-2 decoration-[#007AFF]" : ""
            }`}
          >
            FAQs
          </Link>

          {/* Usecases Dropdown */}
          <div className="relative group">
            <button
              type="button"
              className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
            >
              <span>Usecases</span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
            </button>
            <div className="invisible absolute top-full left-1/2 z-50 w-64 -translate-x-1/2 pt-3 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
              <div className="rounded-xl bg-white py-2 text-slate-900 shadow-xl border border-slate-200">
                <Link
                  href="/landlord"
                  className="block px-4 py-2.5 text-xs font-semibold hover:bg-slate-100 text-slate-800 hover:text-blue-600"
                >
                  For Landlords
                </Link>
                <Link
                  href="/property-managers"
                  className="block px-4 py-2.5 text-xs font-semibold hover:bg-slate-100 text-slate-800 hover:text-blue-600"
                >
                  For Property Managers
                </Link>
                <Link
                  href="/#why-choose-us"
                  className="block px-4 py-2.5 text-xs font-semibold hover:bg-slate-100 text-slate-800 hover:text-blue-600"
                >
                  For Service Charge Managers
                </Link>
                <Link
                  href="/#why-choose-us"
                  className="block px-4 py-2.5 text-xs font-semibold hover:bg-slate-100 text-slate-800 hover:text-blue-600"
                >
                  For Garbage Collectors
                </Link>
                <Link
                  href="/#why-choose-us"
                  className="block px-4 py-2.5 text-xs font-semibold hover:bg-slate-100 text-slate-800 hover:text-blue-600"
                >
                  Water Billing Companies
                </Link>
              </div>
            </div>
          </div>

          <a
            href="/#contact-us"
            onClick={(e) => {
              e.preventDefault();
              if (location === "/") {
                document.getElementById("contact-us")?.scrollIntoView({ behavior: "smooth" });
              } else {
                setLocation("/");
                setTimeout(() => {
                  document.getElementById("contact-us")?.scrollIntoView({ behavior: "smooth" });
                }, 300);
              }
            }}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Schedule Demo
          </a>
        </nav>

        {/* CTA Actions */}
        <div className="hidden sm:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-xs text-slate-300">
                Hi, <strong>{user.name || "User"}</strong>
              </span>
              <button
                onClick={() => setLocation("/dashboard")}
                className="px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-full bg-white text-[#1f1f22] hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5 shadow"
              >
                Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={handleSignIn}
                className="text-xs sm:text-sm font-medium text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => handleGetStarted()}
                className="rounded-full bg-white px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-semibold text-[#1f1f22] hover:bg-slate-100 active:scale-95 transition-all shadow cursor-pointer flex items-center gap-1.5"
              >
                Get started free
              </button>
            </>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => handleGetStarted()}
            className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-[#1f1f22]"
          >
            Get started
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-200 hover:text-white"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="border-b border-white/10 bg-[#1f1f22] px-4 py-4 md:hidden text-sm space-y-3">
          <Link
            href="/features"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-slate-200 hover:text-white"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-slate-200 hover:text-white"
          >
            Pricing
          </Link>
          <Link
            href="/faqs"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-slate-200 hover:text-white"
          >
            FAQs
          </Link>
          <Link
            href="/landlord"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-slate-200 hover:text-white"
          >
            For Landlords
          </Link>
          <Link
            href="/property-managers"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-slate-200 hover:text-white"
          >
            For Property Managers
          </Link>
          <a
            href="/#contact-us"
            onClick={(e) => {
              e.preventDefault();
              setIsMobileMenuOpen(false);
              if (location === "/") {
                document.getElementById("contact-us")?.scrollIntoView({ behavior: "smooth" });
              } else {
                setLocation("/");
                setTimeout(() => {
                  document.getElementById("contact-us")?.scrollIntoView({ behavior: "smooth" });
                }, 300);
              }
            }}
            className="block py-2 text-slate-200 hover:text-white cursor-pointer"
          >
            Schedule Demo
          </a>
          <div className="pt-3 border-t border-white/10 flex items-center gap-3">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleSignIn();
              }}
              className="w-1/2 py-2 text-center text-xs font-semibold border border-white/20 rounded-full"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleGetStarted();
              }}
              className="w-1/2 py-2 text-center text-xs font-semibold bg-white text-[#1f1f22] rounded-full"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
