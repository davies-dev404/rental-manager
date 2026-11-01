import React from "react";

export default function DwelloLogo({ className = "", showText = true }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src="/logo.png"
        alt="MakaziFlow"
        className="h-8 sm:h-9 w-auto object-contain"
      />
      {showText && (
        <span className="font-heading font-extrabold text-2xl tracking-tight text-white select-none">
          <span className="text-white">Makazi</span><span className="text-[#00d084]">Flow</span>
        </span>
      )}
    </div>
  );
}
