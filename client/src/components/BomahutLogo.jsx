import React from "react";

export function MakaziFlowLogo({ className = "" }) {
  return (
    <span className={`text-2xl font-black tracking-tight select-none ${className}`}>
      <span className="text-slate-900 dark:text-white">Makazi</span><span className="text-[#00d084]">Flow</span>
    </span>
  );
}

// Backward-compatible alias
export default MakaziFlowLogo;
export const BomahutLogo = MakaziFlowLogo;
