import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

export default function PublicFooter() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      setLocation("/dashboard");
    } else {
      setLocation("/login?mode=signup");
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
    <footer className="border-t border-white/10 bg-[#1f1f22] pt-12 pb-14 text-slate-200">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        
        {/* Top Bar with Brand & Ready CTA */}
        <div className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer group">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2546e8] text-white shadow-xs group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[#ff5722]" aria-hidden="true">
                <path d="M12 2C12.4 7.2 16.8 11.6 22 12C16.8 12.4 12.4 16.8 12 22C11.6 16.8 7.2 12.4 2 12C7.2 11.6 11.6 7.2 12 2Z" fill="currentColor"/>
                <path d="M19.5 3.5C19.7 5 21 6.3 22.5 6.5C21 6.7 19.7 8 19.5 9.5C19.3 8 18 6.7 16.5 6.5C18 6.3 19.3 5 19.5 3.5Z" fill="currentColor"/>
              </svg>
            </span>
            <span className="text-2xl font-black tracking-tight select-none">
              <span className="text-white">Makazi</span><span className="text-[#00d084]">Flow</span>
            </span>
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:gap-6">
            <p className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Ready to get started?
            </p>
            <button
              onClick={handleGetStarted}
              className="rounded-full bg-[#2546e8] hover:bg-[#1d38c4] px-7 py-3.5 text-base font-bold text-white transition-colors shadow-lg shadow-blue-600/30 cursor-pointer flex items-center gap-4"
            >
              <span>Get Started Free</span>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-lg text-white">
                →
              </span>
            </button>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 lg:grid-cols-[1.1fr,0.9fr]">
          
          <div>
            <h2 className="text-xl font-semibold text-white">All Pages</h2>
            <ul className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2 text-base text-slate-300">
              <li>
                <Link className="hover:text-white transition-colors" href="/features">
                  Features
                </Link>
              </li>
              <li>
                <Link className="hover:text-white transition-colors" href="/pricing">
                  Pricing
                </Link>
              </li>
              <li>
                <Link className="hover:text-white transition-colors" href="/faqs">
                  FAQs
                </Link>
              </li>
              <li>
                <Link className="hover:text-white transition-colors" href="/landlord">
                  For Landlords
                </Link>
              </li>
              <li>
                <Link className="hover:text-white transition-colors" href="/property-managers">
                  For Property Managers
                </Link>
              </li>
              <li>
                <a className="hover:text-white transition-colors" href="/#contact-us">
                  Schedule Demo
                </a>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <button
                  onClick={handleSignIn}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Staff &amp; Tenant Login
                </button>
              </li>
            </ul>
          </div>

          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-white">Contact Us</h2>
            <ul className="mt-4 space-y-3 text-base text-slate-300">
              <li>
                <a className="transition hover:text-white" href="tel:+254711000555">
                  +254 711 000 555
                </a>
              </li>
              <li>
                <a className="block break-all transition hover:text-white" href="mailto:support@makaziflow.com">
                  support@makaziflow.com
                </a>
              </li>
              <li className="leading-7 text-slate-400">
                The Mirage Towers, 7th Floor, Chiromo Road, Westlands - Nairobi, Kenya
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright */}
        <div className="mt-12 pt-6 border-t border-white/5 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © 2026 MakaziFlow. All rights reserved. A product of{" "}
            <a 
              href="https://afrinextech.co.ke" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-white hover:text-[#00d084] font-medium underline underline-offset-2 transition-colors"
            >
              AfrinexTech
            </a>
          </div>
          <div>
            Built for African Real Estate • Powered by M-Pesa &amp; Banking Automation
          </div>
        </div>

      </div>
    </footer>
  );
}
