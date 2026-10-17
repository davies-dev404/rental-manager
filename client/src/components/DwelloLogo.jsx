import React from "react";
import logoImg from "@/assets/logo.png";

export default function DwelloLogo({ className = "h-8", showText = true }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src={logoImg}
        alt="MakaaziHub Logo"
        className="h-8 w-8 object-contain rounded-md"
      />
      {showText && (
        <span className="font-heading font-bold text-xl tracking-tight text-white flex items-center">
          MakaaziHub
          <span className="text-[#1eb7ff] text-2xl leading-none ml-0.5">.</span>
        </span>
      )}
    </div>
  );
}
