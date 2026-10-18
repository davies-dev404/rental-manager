import React from "react";
import logoImg from "@/assets/logo.png";

export default function DwelloLogo({ className = "h-8", showIcon = false, showText = true }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {showIcon && (
        <img
          src={logoImg}
          alt="MakaziFlow Logo"
          className="h-8 w-auto max-h-8 object-contain"
        />
      )}
      {showText && (
        <span className="font-heading font-extrabold text-2xl tracking-tight text-white flex items-center">
          Makazi<span className="text-[#00a99d]">Flow</span>
        </span>
      )}
    </div>
  );
}
