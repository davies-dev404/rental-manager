import React from "react";

export default function DwelloLogo({ className = "" }) {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/logo.png"
        alt="MakaziFlow"
        className="h-9 sm:h-10 w-auto object-contain"
      />
    </div>
  );
}
