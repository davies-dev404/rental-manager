import React from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search, HelpCircle, FileQuestion, Users, Building2 } from "lucide-react";
import DwelloLogo from "@/components/DwelloLogo";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-linear-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-between">
        <Link href="/" className="cursor-pointer">
          <div className="flex items-center gap-2">
            <div className="bg-[#0b1065] text-white px-2.5 py-1 rounded-md font-bold text-sm tracking-tight">
              MH
            </div>
            <span className="font-heading font-bold text-lg text-[#0b1065] dark:text-blue-400">
              MakaaziHub
            </span>
          </div>
        </Link>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="text-xs text-slate-600 dark:text-slate-300">
            <Home className="w-3.5 h-3.5 mr-1.5" /> Dashboard
          </Button>
        </Link>
      </header>

      {/* Main 404 Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg text-center space-y-6">
          {/* 404 Large Visual Badge */}
          <div className="relative inline-flex items-center justify-center">
            <span className="text-8xl md:text-9xl font-black tracking-tighter text-slate-200 dark:text-slate-800 select-none">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 bg-[#0b1065] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                <FileQuestion className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Page Not Found
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              We couldn't find the page you were looking for. It may have been moved, renamed, or is temporarily unavailable.
            </p>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="w-full sm:w-auto text-xs h-9 px-4 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Go Back
            </Button>
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button className="w-full text-xs h-9 px-5 bg-[#0b1065] hover:bg-[#161c8a] text-white font-semibold cursor-pointer">
                <Home className="w-3.5 h-3.5 mr-1.5" />
                Return to Dashboard
              </Button>
            </Link>
          </div>

          {/* Helpful Links Grid */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Popular Destinations
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Link href="/properties">
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-blue-500 transition-colors cursor-pointer text-center">
                  <Building2 className="w-4 h-4 mx-auto mb-1 text-[#0b1065] dark:text-blue-400" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Properties</span>
                </div>
              </Link>
              <Link href="/tenants">
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-blue-500 transition-colors cursor-pointer text-center">
                  <Users className="w-4 h-4 mx-auto mb-1 text-[#0b1065] dark:text-blue-400" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Tenants</span>
                </div>
              </Link>
              <Link href="/support">
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-blue-500 transition-colors cursor-pointer text-center">
                  <HelpCircle className="w-4 h-4 mx-auto mb-1 text-[#0b1065] dark:text-blue-400" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Help & Support</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">
        © {new Date().getFullYear()} MakaaziHub Inc. All rights reserved.
      </footer>
    </div>
  );
}
